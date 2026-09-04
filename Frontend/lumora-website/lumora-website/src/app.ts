import { ApiError } from './shared/api/client'
import { sessionStore } from './shared/auth/session'
import { showToast } from './shared/ui/toast'
import { AuthApi } from './features/auth/api'
import { ForbiddenView, LoginView, MfaView } from './features/auth/views'
import { isMfaResponse, type CurrentUser } from './features/auth/types'
import { AffiliationsApi } from './features/affiliations/api'
import { DashboardView, DetailView, ErrorView, LoadingView } from './features/affiliations/views'
import { UsersApi } from './features/users/api'
import { UsersView, type SupportSection } from './features/users/views'
import type {
  AffiliationCreatePayload,
  AffiliationStatus,
  AffiliationType,
  AffiliationUpdatePayload,
  PaymentStatus,
  ProfessionalProvisionPayload,
} from './features/affiliations/types'

const MANAGE_PERMISSION = 'afiliaciones:manage'
const MANAGE_USERS_PERMISSION = 'rbac:manage'

function stringValue(form: FormData, key: string): string {
  const value = form.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

function nullableString(form: FormData, key: string): string | null {
  const value = stringValue(form, key)
  return value || null
}

function setSubmitting(form: HTMLFormElement, submitting: boolean): void {
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')
  if (!button) return
  button.disabled = submitting
  button.dataset.originalText ??= button.textContent ?? ''
  button.textContent = submitting ? 'Procesando…' : button.dataset.originalText
}

function openDialog(dialog: HTMLDialogElement | null): void {
  if (!dialog) return
  if (typeof dialog.showModal === 'function') dialog.showModal()
  else dialog.setAttribute('open', '')
}

function closeDialog(dialog: HTMLDialogElement | null): void {
  if (!dialog) return
  if (typeof dialog.close === 'function') dialog.close()
  else dialog.removeAttribute('open')
}

export class PortalApp {
  private readonly root: HTMLDivElement
  private readonly authApi: AuthApi
  private readonly affiliationsApi: AffiliationsApi
  private readonly usersApi: UsersApi
  private user: CurrentUser | null = null
  private challengeToken: string | null = null
  private currentAffiliationId: number | null = null

  constructor(root: HTMLDivElement) {
    this.root = root
    this.authApi = new AuthApi()
    this.affiliationsApi = new AffiliationsApi()
    this.usersApi = new UsersApi()
    this.root.addEventListener('submit', (event) => void this.onSubmit(event))
    this.root.addEventListener('click', (event) => void this.onClick(event))
    this.root.addEventListener('change', (event) => this.onChange(event))
    this.root.addEventListener('input', () => { this.applyDashboardFilters(); this.applySupportFilters() })
    window.addEventListener('hashchange', () => void this.route())
  }

  async start(): Promise<void> {
    if (!sessionStore.read()) {
      this.renderLogin()
      return
    }
    await this.restoreSession()
  }

  private renderLogin(): void {
    this.user = null
    this.challengeToken = null
    this.currentAffiliationId = null
    this.root.innerHTML = LoginView(this.authApi.isConfigured())
  }

  private async restoreSession(): Promise<void> {
    try {
      const user = await this.authApi.me()
      this.user = user
      if (!this.canManageAffiliations(user)) {
        this.root.innerHTML = ForbiddenView(`${this.user.persona.nombres} ${this.user.persona.apellidos}`.trim() || this.user.username)
        return
      }
      const hash = window.location.hash
      const supportRoute = ['#/cuentas', '#/pacientes', '#/medicos'].includes(hash)
      if (!hash.startsWith('#/afiliaciones') && !supportRoute) {
        window.location.hash = '#/afiliaciones'
        return
      }
      await this.route()
    } catch (error) {
      sessionStore.clear()
      this.renderLogin()
      this.reportError(error)
    }
  }

  private canManageAffiliations(user: CurrentUser): boolean {
    return user.roles.some((role) => role.permisos.some((permission) => permission.nombre === MANAGE_PERMISSION))
  }

  private async route(): Promise<void> {
    if (!this.user) return

    const detailMatch = window.location.hash.match(/^#\/afiliaciones\/(\d+)$/)
    if (detailMatch) {
      await this.loadDetail(Number(detailMatch[1]))
      return
    }
    if (window.location.hash === '#/cuentas') {
      await this.loadUsers()
      return
    }
    await this.loadDashboard()
  }

  private canManageUsers(user: CurrentUser): boolean {
    return user.roles.some((role) => role.permisos.some((permission) => permission.nombre === MANAGE_USERS_PERMISSION))
  }

  private async loadUsers(section: SupportSection = 'admins'): Promise<void> {
    if (!this.user) return
    if (!this.canManageUsers(this.user)) {
      this.root.innerHTML = ForbiddenView(`${this.user.persona.nombres} ${this.user.persona.apellidos}`.trim() || this.user.username)
      return
    }
    this.root.innerHTML = LoadingView(this.user, 'Cargando cuentas…')
    try {
      const page = await this.usersApi.listAll()
      this.root.innerHTML = UsersView(this.user, page.items, section)
    } catch (error) {
      if (this.handleAuthorizationError(error)) return
      this.root.innerHTML = ErrorView(this.user, this.errorText(error))
    }
  }

  private async loadDashboard(): Promise<void> {
    if (!this.user) return
    this.currentAffiliationId = null
    this.root.innerHTML = LoadingView(this.user)
    try {
      const affiliations = await this.affiliationsApi.list()
      this.root.innerHTML = DashboardView(this.user, affiliations)
      this.syncAffiliationTypeFields()
    } catch (error) {
      if (this.handleAuthorizationError(error)) return
      this.root.innerHTML = ErrorView(this.user, this.errorText(error))
    }
  }

  private async loadDetail(id: number): Promise<void> {
    if (!this.user) return
    this.currentAffiliationId = id
    this.root.innerHTML = LoadingView(this.user, 'Cargando detalle de afiliación…')
    try {
      const [affiliation, professionals] = await Promise.all([
        this.affiliationsApi.get(id),
        this.affiliationsApi.professionals(id),
      ])
      this.root.innerHTML = DetailView(this.user, affiliation, professionals)
    } catch (error) {
      if (this.handleAuthorizationError(error)) return
      this.root.innerHTML = ErrorView(this.user, this.errorText(error))
    }
  }

  private async onSubmit(event: SubmitEvent): Promise<void> {
    const form = event.target
    if (!(form instanceof HTMLFormElement)) return

    if (form.matches('[data-login-form]')) {
      event.preventDefault()
      await this.submitLogin(form)
      return
    }
    if (form.matches('[data-mfa-form]')) {
      event.preventDefault()
      await this.submitMfa(form)
      return
    }
    if (form.matches('[data-create-affiliation-form]')) {
      event.preventDefault()
      await this.submitCreateAffiliation(form)
      return
    }
    if (form.matches('[data-update-affiliation-form]')) {
      event.preventDefault()
      await this.submitUpdateAffiliation(form)
      return
    }
    if (form.matches('[data-add-professional-form]')) {
      event.preventDefault()
      await this.submitAddProfessional(form)
      return
    }
    if (form.matches('[data-create-user-form]')) {
      event.preventDefault()
      await this.submitCreateUser(form)
    }
  }

  private async onClick(event: MouseEvent): Promise<void> {
    const target = event.target
    if (!(target instanceof Element)) return
    const button = target.closest<HTMLElement>('button, [data-open-affiliation]')
    if (!button) return

    if (button.dataset.action === 'logout') {
      await this.logout()
      return
    }
    if (button.dataset.action === 'back-login') {
      this.renderLogin()
      return
    }
    if (button.dataset.action === 'open-create-affiliation') {
      openDialog(this.root.querySelector<HTMLDialogElement>('[data-create-affiliation-dialog]'))
      return
    }
    if (button.dataset.action === 'open-add-professional') {
      openDialog(this.root.querySelector<HTMLDialogElement>('[data-add-professional-dialog]'))
      return
    }
    if (button.dataset.action === 'open-create-user') {
      openDialog(this.root.querySelector<HTMLDialogElement>('[data-create-user-dialog]'))
      return
    }
    if (button.dataset.resendPassword) {
      await this.resendPassword(Number(button.dataset.resendPassword), button)
      return
    }
    if (button.dataset.action === 'close-dialog') {
      closeDialog(button.closest<HTMLDialogElement>('dialog'))
      return
    }
    if (button.dataset.openAffiliation) {
      window.location.hash = `#/afiliaciones/${button.dataset.openAffiliation}`
      return
    }
    if (button.dataset.verifyLicense) {
      const professionalId = Number(button.dataset.verifyLicense)
      const verified = button.dataset.verified === 'true'
      await this.toggleLicense(professionalId, !verified)
      return
    }
    if (button.dataset.toggleMembership) {
      const professionalId = Number(button.dataset.toggleMembership)
      const active = button.dataset.membershipActive === 'true'
      await this.toggleMembership(professionalId, !active)
    }
  }

  private onChange(event: Event): void {
    const target = event.target
    if (!(target instanceof HTMLSelectElement)) return
    if (target.matches('[data-affiliation-type]')) this.syncAffiliationTypeFields()
  }

  private async submitLogin(form: HTMLFormElement): Promise<void> {
    const data = new FormData(form)
    setSubmitting(form, true)
    try {
      const response = await this.authApi.login(stringValue(data, 'login'), stringValue(data, 'password'))
      if (isMfaResponse(response)) {
        this.challengeToken = response.challenge_token
        this.root.innerHTML = MfaView(response.method)
        return
      }
      sessionStore.write({ accessToken: response.access_token, refreshToken: response.refresh_token })
      await this.restoreSession()
    } catch (error) {
      this.reportError(error)
    } finally {
      setSubmitting(form, false)
    }
  }

  private async submitMfa(form: HTMLFormElement): Promise<void> {
    if (!this.challengeToken) {
      this.renderLogin()
      return
    }
    const data = new FormData(form)
    setSubmitting(form, true)
    try {
      const tokens = await this.authApi.verifyMfa(this.challengeToken, stringValue(data, 'code'))
      sessionStore.write({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token })
      this.challengeToken = null
        await this.restoreSession()
    } catch (error) {
      this.reportError(error)
    } finally {
      setSubmitting(form, false)
    }
  }

  private async submitCreateUser(form: HTMLFormElement): Promise<void> {
    const data = new FormData(form)
    const email = stringValue(data, 'email')
    setSubmitting(form, true)
    try {
      await this.usersApi.createAdmin({ email, username: stringValue(data, 'username'), password: stringValue(data, 'password'), persona: { nombres: stringValue(data, 'first_names'), apellidos: stringValue(data, 'last_names'), email } })
      closeDialog(form.closest<HTMLDialogElement>('dialog'))
      form.reset()
      showToast('Cuenta de manejador creada correctamente.', 'success')
      await this.loadUsers()
    } catch (error) { this.reportError(error) } finally { setSubmitting(form, false) }
  }

  private async resendPassword(userId: number, button: HTMLElement): Promise<void> {
    button.setAttribute('aria-disabled', 'true')
    try {
      const result = await this.usersApi.resendPasswordReset(userId)
      showToast(result.message || 'Correo de cambio de contraseña reenviado.', 'success')
    } catch (error) { this.reportError(error) } finally { button.removeAttribute('aria-disabled') }
  }

  private async submitCreateAffiliation(form: HTMLFormElement): Promise<void> {
    const data = new FormData(form)
    const type = stringValue(data, 'tipo') as AffiliationType
    const seats = type === 'independiente' ? 1 : Number(stringValue(data, 'cupos_comprados'))
    const payload: AffiliationCreatePayload = {
      tipo: type,
      nombre: stringValue(data, 'nombre'),
      correo_contacto: stringValue(data, 'correo_contacto'),
      telefono_contacto: nullableString(data, 'telefono_contacto'),
      cupos_comprados: seats,
      estado: 'pending',
      pago_estado: 'pending',
    }

    setSubmitting(form, true)
    try {
      const affiliation = await this.affiliationsApi.create(payload)

      if (type === 'independiente') {
        const professional = this.professionalPayloadFromForm(data, true)
        try {
          const result = await this.affiliationsApi.provision(affiliation.id, professional)
          if (!result.activation_sent) {
            showToast('Afiliación y cuenta creadas, pero el correo de configuración no pudo enviarse.', 'warning')
          } else {
            showToast('Médico independiente y cuenta creados correctamente.', 'success')
          }
        } catch (error) {
          showToast(`La afiliación se creó, pero la cuenta médica quedó pendiente: ${this.errorText(error)}`, 'warning')
        }
      } else {
        showToast('Institución creada. Ya puedes agregar médicos desde su detalle.', 'success')
      }

      closeDialog(form.closest<HTMLDialogElement>('dialog'))
      window.location.hash = `#/afiliaciones/${affiliation.id}`
    } catch (error) {
      this.reportError(error)
    } finally {
      setSubmitting(form, false)
    }
  }

  private async submitUpdateAffiliation(form: HTMLFormElement): Promise<void> {
    const id = Number(form.dataset.affiliationId)
    const data = new FormData(form)
    const payload: AffiliationUpdatePayload = {
      nombre: stringValue(data, 'nombre'),
      correo_contacto: stringValue(data, 'correo_contacto'),
      telefono_contacto: nullableString(data, 'telefono_contacto'),
      cupos_comprados: Number(stringValue(data, 'cupos_comprados')),
      estado: stringValue(data, 'estado') as AffiliationStatus,
      pago_estado: stringValue(data, 'pago_estado') as PaymentStatus,
      pago_referencia: nullableString(data, 'pago_referencia'),
    }

    setSubmitting(form, true)
    try {
      await this.affiliationsApi.update(id, payload)
      showToast('Afiliación actualizada.', 'success')
      await this.loadDetail(id)
    } catch (error) {
      this.reportError(error)
    } finally {
      setSubmitting(form, false)
    }
  }

  private async submitAddProfessional(form: HTMLFormElement): Promise<void> {
    if (!this.currentAffiliationId) return
    const data = new FormData(form)
    setSubmitting(form, true)
    try {
      const result = await this.affiliationsApi.provision(this.currentAffiliationId, this.professionalPayloadFromForm(data, false))
      closeDialog(form.closest<HTMLDialogElement>('dialog'))
      form.reset()
      showToast(result.activation_sent ? 'Cuenta médica generada y correo enviado.' : 'Cuenta creada, pero el correo de configuración no pudo enviarse.', result.activation_sent ? 'success' : 'warning')
      await this.loadDetail(this.currentAffiliationId)
    } catch (error) {
      this.reportError(error)
    } finally {
      setSubmitting(form, false)
    }
  }

  private professionalPayloadFromForm(data: FormData, independent: boolean): ProfessionalProvisionPayload {
    return {
      first_names: stringValue(data, 'first_names'),
      last_names: stringValue(data, 'last_names'),
      email: stringValue(data, independent ? 'professional_email' : 'email'),
      phone: nullableString(data, independent ? 'professional_phone' : 'phone'),
      especialidad: stringValue(data, 'especialidad'),
      numero_licencia: stringValue(data, 'numero_licencia'),
    }
  }

  private async toggleLicense(professionalId: number, verified: boolean): Promise<void> {
    try {
      await this.affiliationsApi.verifyLicense(professionalId, verified)
      showToast(verified ? 'Licencia verificada.' : 'Verificación de licencia revocada.', 'success')
      if (this.currentAffiliationId) await this.loadDetail(this.currentAffiliationId)
    } catch (error) {
      this.reportError(error)
    }
  }

  private async toggleMembership(professionalId: number, active: boolean): Promise<void> {
    if (!this.currentAffiliationId) return
    try {
      await this.affiliationsApi.updateMembership(this.currentAffiliationId, professionalId, active)
      showToast(active ? 'Profesional reactivado.' : 'Profesional suspendido.', 'success')
      await this.loadDetail(this.currentAffiliationId)
    } catch (error) {
      this.reportError(error)
    }
  }

  private syncAffiliationTypeFields(): void {
    const select = this.root.querySelector<HTMLSelectElement>('[data-affiliation-type]')
    const independentFields = this.root.querySelector<HTMLElement>('[data-independent-fields]')
    const seats = this.root.querySelector<HTMLInputElement>('[name="cupos_comprados"]')
    if (!select || !independentFields || !seats) return

    const independent = select.value === 'independiente'
    independentFields.hidden = !independent
    seats.value = independent ? '1' : Math.max(Number(seats.value) || 1, 1).toString()
    seats.readOnly = independent

    independentFields.querySelectorAll<HTMLInputElement>('input').forEach((input) => {
      input.required = independent
    })
  }

  private applySupportFilters(): void {
    const query = this.root.querySelector<HTMLInputElement>('[data-support-search]')?.value.trim().toLowerCase() ?? ''
    this.root.querySelectorAll<HTMLElement>('[data-support-row]').forEach((row) => {
      row.hidden = Boolean(query) && !(row.dataset.search ?? '').includes(query)
    })
  }

  private applyDashboardFilters(): void {
    const rows = Array.from(this.root.querySelectorAll<HTMLTableRowElement>('[data-affiliation-row]'))
    if (!rows.length) return

    const search = this.root.querySelector<HTMLInputElement>('[data-filter-search]')?.value.trim().toLowerCase() ?? ''
    const type = this.root.querySelector<HTMLSelectElement>('[data-filter-type]')?.value ?? ''
    const status = this.root.querySelector<HTMLSelectElement>('[data-filter-status]')?.value ?? ''
    const payment = this.root.querySelector<HTMLSelectElement>('[data-filter-payment]')?.value ?? ''

    let visible = 0
    rows.forEach((row) => {
      const matches = (!search || (row.dataset.search ?? '').includes(search))
        && (!type || row.dataset.type === type)
        && (!status || row.dataset.status === status)
        && (!payment || row.dataset.payment === payment)
      row.hidden = !matches
      if (matches) visible += 1
    })

    const empty = this.root.querySelector<HTMLElement>('[data-filter-empty]')
    if (empty) empty.hidden = visible > 0
  }

  private async logout(): Promise<void> {
    try {
      await this.authApi.logout()
    } catch {
      sessionStore.clear()
    }
    window.location.hash = ''
    this.renderLogin()
  }

  private handleAuthorizationError(error: unknown): boolean {
    if (!(error instanceof ApiError)) return false
    if (error.status === 401) {
      sessionStore.clear()
      this.renderLogin()
      showToast('Tu sesión expiró. Inicia sesión nuevamente.', 'warning')
      return true
    }
    if (error.status === 403 && this.user) {
      this.root.innerHTML = ForbiddenView(`${this.user.persona.nombres} ${this.user.persona.apellidos}`.trim() || this.user.username)
      return true
    }
    return false
  }

  private reportError(error: unknown): void {
    if (this.handleAuthorizationError(error)) return
    const kind = error instanceof ApiError && error.status === 409 ? 'warning' : 'error'
    showToast(this.errorText(error), kind)
  }

  private errorText(error: unknown): string {
    return error instanceof Error ? error.message : 'Ocurrió un error inesperado.'
  }
}

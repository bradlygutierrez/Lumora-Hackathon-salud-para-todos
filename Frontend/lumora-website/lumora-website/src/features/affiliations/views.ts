import type { CurrentUser } from '../auth/types'
import { escapeHtml, formatDate } from '../../shared/ui/html'
import type { Affiliation, AffiliationProfessional, AffiliationStatus, PaymentStatus } from './types'

const STATUS_LABELS: Record<AffiliationStatus, string> = {
  pending: 'Pendiente',
  active: 'Activa',
  suspended: 'Suspendida',
  cancelled: 'Cancelada',
}

const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
}

function Brand(): string {
  return `
    <a class="portal-brand portal-brand--sidebar" href="#/afiliaciones" aria-label="Lumora Afiliaciones">
      <img src="/favicon.svg" alt="" />
      <span>Lumora</span>
    </a>
  `
}

function ShellStart(user: CurrentUser, active = 'affiliations'): string {
  const fullName = `${user.persona.nombres} ${user.persona.apellidos}`.trim()
  return `
    <div class="portal-shell">
      <aside class="sidebar">
        ${Brand()}
        <nav class="sidebar__nav" aria-label="Navegación del portal">
          <a class="sidebar__link ${active === 'affiliations' ? 'is-active' : ''}" href="#/afiliaciones">
            <span aria-hidden="true">▦</span>
            Afiliaciones
          </a>
        </nav>
        <div class="sidebar__foot">
          <span>Portal interno</span>
          <small>Acceso con afiliaciones:manage</small>
        </div>
      </aside>
      <div class="portal-main">
        <header class="topbar">
          <div>
            <strong>${escapeHtml(fullName || user.username)}</strong>
            <span>${escapeHtml(user.email)}</span>
          </div>
          <button class="button button--outline button--small" type="button" data-action="logout">Cerrar sesión</button>
        </header>
  `
}

function ShellEnd(): string {
  return `</div></div>`
}

function statusBadge(status: AffiliationStatus): string {
  return `<span class="badge badge--${status}">${STATUS_LABELS[status]}</span>`
}

function paymentBadge(status: PaymentStatus): string {
  return `<span class="badge badge--payment-${status}">${PAYMENT_LABELS[status]}</span>`
}

function CreateAffiliationDialog(): string {
  return `
    <dialog class="portal-dialog portal-dialog--wide" data-create-affiliation-dialog>
      <form class="dialog-card" data-create-affiliation-form>
        <div class="dialog-card__header">
          <div>
            <span class="eyebrow">Nueva afiliación</span>
            <h2>Crear afiliación médica</h2>
            <p>La afiliación inicia pendiente y el pago se marca manualmente desde el detalle.</p>
          </div>
          <button class="icon-button" type="button" aria-label="Cerrar" data-action="close-dialog">×</button>
        </div>

        <div class="form-grid form-grid--2">
          <label class="field">
            <span>Tipo de afiliación</span>
            <select name="tipo" data-affiliation-type required>
              <option value="independiente">Médico independiente</option>
              <option value="institucion">Institución médica</option>
            </select>
          </label>
          <label class="field">
            <span>Nombre de la afiliación</span>
            <input name="nombre" maxlength="200" placeholder="Ej. Dra. Ana López / Clínica Central" required />
          </label>
          <label class="field">
            <span>Correo de contacto</span>
            <input name="correo_contacto" type="email" maxlength="255" required />
          </label>
          <label class="field">
            <span>Teléfono de contacto</span>
            <input name="telefono_contacto" maxlength="30" />
          </label>
          <label class="field" data-seat-field>
            <span>Cupos comprados</span>
            <input name="cupos_comprados" type="number" min="1" step="1" value="1" required />
            <small>Para un médico independiente el backend exige exactamente 1 cupo.</small>
          </label>
        </div>

        <section class="subform" data-independent-fields>
          <div class="subform__heading">
            <h3>Cuenta del médico independiente</h3>
            <p>Se generará automáticamente sin crear una contraseña manual.</p>
          </div>
          <div class="form-grid form-grid--2">
            <label class="field">
              <span>Nombres</span>
              <input name="first_names" maxlength="100" required />
            </label>
            <label class="field">
              <span>Apellidos</span>
              <input name="last_names" maxlength="100" required />
            </label>
            <label class="field">
              <span>Correo del médico</span>
              <input name="professional_email" type="email" required />
            </label>
            <label class="field">
              <span>Teléfono del médico</span>
              <input name="professional_phone" maxlength="30" />
            </label>
            <label class="field">
              <span>Especialidad</span>
              <input name="especialidad" maxlength="100" placeholder="Ej. Medicina general" required />
            </label>
            <label class="field">
              <span>Número de licencia</span>
              <input name="numero_licencia" maxlength="100" required />
            </label>
          </div>
        </section>

        <div class="dialog-card__actions">
          <button class="button button--outline" type="button" data-action="close-dialog">Cancelar</button>
          <button class="button" type="submit">Crear afiliación</button>
        </div>
      </form>
    </dialog>
  `
}

export function LoadingView(user: CurrentUser, label = 'Cargando afiliaciones…'): string {
  return `
    ${ShellStart(user)}
      <main class="portal-content">
        <div class="loading-state" role="status">
          <span class="spinner" aria-hidden="true"></span>
          <p>${escapeHtml(label)}</p>
        </div>
      </main>
    ${ShellEnd()}
  `
}

export function DashboardView(user: CurrentUser, affiliations: Affiliation[]): string {
  const active = affiliations.filter((item) => item.estado === 'active').length
  const pendingPayment = affiliations.filter((item) => item.pago_estado === 'pending').length
  const availableSeats = affiliations.reduce((total, item) => total + item.cupos_disponibles, 0)

  const rows = affiliations.map((item) => {
    const search = `${item.nombre} ${item.correo_contacto}`.toLowerCase()
    return `
      <tr data-affiliation-row data-search="${escapeHtml(search)}" data-type="${item.tipo}" data-status="${item.estado}" data-payment="${item.pago_estado}">
        <td>
          <strong>${escapeHtml(item.nombre)}</strong>
          <span class="table-secondary">${item.tipo === 'independiente' ? 'Médico independiente' : 'Institución médica'}</span>
        </td>
        <td>${escapeHtml(item.correo_contacto)}</td>
        <td>${statusBadge(item.estado)}</td>
        <td>${paymentBadge(item.pago_estado)}</td>
        <td><strong>${item.cupos_usados}/${item.cupos_comprados}</strong><span class="table-secondary">${item.cupos_disponibles} disponibles</span></td>
        <td class="table-action"><button class="table-link" type="button" data-open-affiliation="${item.id}">Administrar</button></td>
      </tr>
    `
  }).join('')

  return `
    ${ShellStart(user)}
      <main class="portal-content">
        <div class="page-heading">
          <div>
            <span class="eyebrow">Afiliaciones médicas</span>
            <h1>Panel de afiliaciones</h1>
            <p>Administra instituciones, médicos independientes, cupos, pago y licencias desde un solo lugar.</p>
          </div>
          <button class="button" type="button" data-action="open-create-affiliation">Nueva afiliación</button>
        </div>

        <section class="stats-grid" aria-label="Resumen de afiliaciones">
          <article class="stat-card"><span>Total</span><strong>${affiliations.length}</strong><small>afiliaciones registradas</small></article>
          <article class="stat-card"><span>Activas</span><strong>${active}</strong><small>habilitadas actualmente</small></article>
          <article class="stat-card"><span>Pago pendiente</span><strong>${pendingPayment}</strong><small>requieren seguimiento</small></article>
          <article class="stat-card"><span>Cupos disponibles</span><strong>${availableSeats}</strong><small>entre todas las afiliaciones</small></article>
        </section>

        <section class="panel">
          <div class="panel__header panel__header--filters">
            <div>
              <h2>Afiliaciones</h2>
              <p>Filtra localmente los registros devueltos por el backend.</p>
            </div>
            <div class="filters">
              <input aria-label="Buscar afiliaciones" type="search" placeholder="Buscar nombre o correo" data-filter-search />
              <select aria-label="Filtrar por tipo" data-filter-type>
                <option value="">Todos los tipos</option>
                <option value="independiente">Independiente</option>
                <option value="institucion">Institución</option>
              </select>
              <select aria-label="Filtrar por estado" data-filter-status>
                <option value="">Todos los estados</option>
                <option value="pending">Pendiente</option>
                <option value="active">Activa</option>
                <option value="suspended">Suspendida</option>
                <option value="cancelled">Cancelada</option>
              </select>
              <select aria-label="Filtrar por pago" data-filter-payment>
                <option value="">Todos los pagos</option>
                <option value="pending">Pendiente</option>
                <option value="paid">Pagado</option>
              </select>
            </div>
          </div>
          ${affiliations.length ? `
            <div class="table-wrap">
              <table>
                <thead><tr><th>Afiliación</th><th>Contacto</th><th>Estado</th><th>Pago</th><th>Cupos</th><th></th></tr></thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
            <div class="empty-state empty-state--compact" hidden data-filter-empty>No hay afiliaciones que coincidan con los filtros.</div>
          ` : '<div class="empty-state"><strong>Aún no hay afiliaciones.</strong><span>Crea la primera afiliación para empezar a aprovisionar cuentas médicas.</span></div>'}
        </section>
      </main>
      ${CreateAffiliationDialog()}
    ${ShellEnd()}
  `
}

function AddProfessionalDialog(): string {
  return `
    <dialog class="portal-dialog portal-dialog--wide" data-add-professional-dialog>
      <form class="dialog-card" data-add-professional-form>
        <div class="dialog-card__header">
          <div>
            <span class="eyebrow">Nuevo profesional</span>
            <h2>Generar cuenta médica</h2>
            <p>El backend crea Persona, Usuario, ProfesionalSalud y membership automáticamente.</p>
          </div>
          <button class="icon-button" type="button" aria-label="Cerrar" data-action="close-dialog">×</button>
        </div>
        <div class="form-grid form-grid--2">
          <label class="field"><span>Nombres</span><input name="first_names" maxlength="100" required /></label>
          <label class="field"><span>Apellidos</span><input name="last_names" maxlength="100" required /></label>
          <label class="field"><span>Correo</span><input name="email" type="email" required /></label>
          <label class="field"><span>Teléfono</span><input name="phone" maxlength="30" /></label>
          <label class="field"><span>Especialidad</span><input name="especialidad" maxlength="100" required /></label>
          <label class="field"><span>Número de licencia</span><input name="numero_licencia" maxlength="100" required /></label>
        </div>
        <div class="notice notice--info">La cuenta se crea sin contraseña conocida por el personal de Lumora. El médico recibe el flujo de configuración de contraseña del backend.</div>
        <div class="dialog-card__actions">
          <button class="button button--outline" type="button" data-action="close-dialog">Cancelar</button>
          <button class="button" type="submit">Generar cuenta</button>
        </div>
      </form>
    </dialog>
  `
}

function professionalRow(item: AffiliationProfessional): string {
  return `
    <tr>
      <td>
        <strong>${escapeHtml(`${item.first_names} ${item.last_names}`)}</strong>
        <span class="table-secondary">${escapeHtml(item.email)}</span>
      </td>
      <td>${escapeHtml(item.especialidad)}<span class="table-secondary">Lic. ${escapeHtml(item.numero_licencia)}</span></td>
      <td>
        <span class="badge ${item.licencia_verificada ? 'badge--active' : 'badge--pending'}">${item.licencia_verificada ? 'Verificada' : 'Pendiente'}</span>
      </td>
      <td>
        <span class="badge ${item.membership_activo ? 'badge--active' : 'badge--suspended'}">${item.membership_activo ? 'Activo' : 'Suspendido'}</span>
      </td>
      <td>
        <span class="badge ${item.user_activo ? 'badge--active' : 'badge--cancelled'}">${item.user_activo ? 'Cuenta activa' : 'Cuenta inactiva'}</span>
        <span class="table-secondary">${item.email_verificado ? 'Correo verificado' : 'Correo pendiente'}</span>
      </td>
      <td class="table-action table-action--stack">
        <button class="table-link" type="button" data-verify-license="${item.professional_id}" data-verified="${item.licencia_verificada}">${item.licencia_verificada ? 'Revocar verificación' : 'Verificar licencia'}</button>
        <button class="table-link ${item.membership_activo ? 'table-link--danger' : ''}" type="button" data-toggle-membership="${item.professional_id}" data-membership-active="${item.membership_activo}">${item.membership_activo ? 'Suspender profesional' : 'Reactivar profesional'}</button>
      </td>
    </tr>
  `
}

export function DetailView(user: CurrentUser, affiliation: Affiliation, professionals: AffiliationProfessional[]): string {
  const canAdd = affiliation.cupos_disponibles > 0
  return `
    ${ShellStart(user)}
      <main class="portal-content">
        <div class="back-row"><a href="#/afiliaciones">← Volver a afiliaciones</a></div>
        <div class="page-heading page-heading--detail">
          <div>
            <div class="badge-row">${statusBadge(affiliation.estado)} ${paymentBadge(affiliation.pago_estado)}</div>
            <h1>${escapeHtml(affiliation.nombre)}</h1>
            <p>${affiliation.tipo === 'independiente' ? 'Médico independiente' : 'Institución médica'} · ${escapeHtml(affiliation.correo_contacto)}</p>
          </div>
          <button class="button" type="button" data-action="open-add-professional" ${canAdd ? '' : 'disabled'}>Agregar médico</button>
        </div>

        <section class="detail-grid">
          <article class="panel panel--form">
            <div class="panel__header"><div><h2>Afiliación</h2><p>Los cambios se validan nuevamente en el backend.</p></div></div>
            <form class="form-grid form-grid--2" data-update-affiliation-form data-affiliation-id="${affiliation.id}">
              <label class="field"><span>Nombre</span><input name="nombre" maxlength="200" value="${escapeHtml(affiliation.nombre)}" required /></label>
              <label class="field"><span>Correo de contacto</span><input name="correo_contacto" type="email" value="${escapeHtml(affiliation.correo_contacto)}" required /></label>
              <label class="field"><span>Teléfono</span><input name="telefono_contacto" maxlength="30" value="${escapeHtml(affiliation.telefono_contacto ?? '')}" /></label>
              <label class="field"><span>Cupos comprados</span><input name="cupos_comprados" type="number" min="1" step="1" value="${affiliation.cupos_comprados}" ${affiliation.tipo === 'independiente' ? 'readonly' : ''} required /></label>
              <label class="field"><span>Estado</span>
                <select name="estado" required>
                  ${(['pending', 'active', 'suspended', 'cancelled'] as AffiliationStatus[]).map((status) => `<option value="${status}" ${affiliation.estado === status ? 'selected' : ''}>${STATUS_LABELS[status]}</option>`).join('')}
                </select>
              </label>
              <label class="field"><span>Pago</span>
                <select name="pago_estado" required>
                  <option value="pending" ${affiliation.pago_estado === 'pending' ? 'selected' : ''}>Pendiente</option>
                  <option value="paid" ${affiliation.pago_estado === 'paid' ? 'selected' : ''}>Pagado</option>
                </select>
              </label>
              <label class="field form-grid__wide"><span>Referencia de pago</span><input name="pago_referencia" maxlength="255" value="${escapeHtml(affiliation.pago_referencia ?? '')}" placeholder="Opcional" /></label>
              <div class="form-grid__wide dialog-card__actions dialog-card__actions--inline"><button class="button" type="submit">Guardar cambios</button></div>
            </form>
          </article>

          <aside class="detail-summary">
            <article class="stat-card stat-card--large"><span>Cupos usados</span><strong>${affiliation.cupos_usados}/${affiliation.cupos_comprados}</strong><small>${affiliation.cupos_disponibles} disponibles</small></article>
            <article class="summary-card"><span>Creada</span><strong>${formatDate(affiliation.created_at)}</strong></article>
            <article class="summary-card"><span>Inicio</span><strong>${formatDate(affiliation.inicia_en)}</strong></article>
            <article class="summary-card"><span>Expiración</span><strong>${formatDate(affiliation.expira_en)}</strong></article>
          </aside>
        </section>

        <section class="panel">
          <div class="panel__header">
            <div><h2>Profesionales</h2><p>La licencia y el membership son controles separados del estado de la cuenta.</p></div>
            <span class="panel-count">${professionals.length}</span>
          </div>
          ${professionals.length ? `
            <div class="table-wrap">
              <table>
                <thead><tr><th>Médico</th><th>Especialidad</th><th>Licencia</th><th>Membership</th><th>Cuenta</th><th></th></tr></thead>
                <tbody>${professionals.map(professionalRow).join('')}</tbody>
              </table>
            </div>
          ` : '<div class="empty-state"><strong>Sin profesionales asociados.</strong><span>Agrega un médico mientras haya cupos disponibles.</span></div>'}
        </section>

        <div class="notice notice--info portal-contract-note">El backend expone estado de cuenta y verificación de correo. No expone si el token de activación ya fue consumido, por lo que el portal no inventa ese estado.</div>
      </main>
      ${AddProfessionalDialog()}
    ${ShellEnd()}
  `
}

export function ErrorView(user: CurrentUser, message: string): string {
  return `
    ${ShellStart(user)}
      <main class="portal-content">
        <div class="error-state" role="alert">
          <strong>No pudimos cargar esta sección.</strong>
          <p>${escapeHtml(message)}</p>
          <a class="button" href="#/afiliaciones">Volver al panel</a>
        </div>
      </main>
    ${ShellEnd()}
  `
}

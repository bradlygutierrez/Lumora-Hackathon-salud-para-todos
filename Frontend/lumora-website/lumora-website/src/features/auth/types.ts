export type PermissionSummary = {
  id: number
  nombre: string
}

export type RoleSummary = {
  id: number
  nombre: string
  permisos: PermissionSummary[]
}

export type CurrentUser = {
  id: number
  email: string
  username: string
  activo: boolean
  email_verificado: boolean
  roles: RoleSummary[]
  persona: {
    id: number
    nombres: string
    apellidos: string
  }
}

export type TokenPair = {
  access_token: string
  refresh_token: string
}

export type LoginTokenResponse = TokenPair & {
  mfa_required: false
}

export type LoginMfaResponse = {
  mfa_required: true
  challenge_token: string
  expires_in: number
  method: string | null
}

export type LoginResponse = LoginTokenResponse | LoginMfaResponse

export function isMfaResponse(value: LoginResponse): value is LoginMfaResponse {
  return value.mfa_required === true
}

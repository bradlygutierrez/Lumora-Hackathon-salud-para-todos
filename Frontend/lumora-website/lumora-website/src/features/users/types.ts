export type StaffUser = {
  id: number
  email: string
  username: string
  activo: boolean
  email_verificado: boolean
  persona: { nombres: string; apellidos: string }
  roles: Array<{ nombre: string }>
}

export type StaffUserCreatePayload = {
  email: string
  username: string
  password: string
  persona: { nombres: string; apellidos: string; email: string }
}

export type UserPage = { items: StaffUser[]; total: number; limit: number; offset: number }

export type AffiliationType = 'independiente' | 'institucion'
export type AffiliationStatus = 'pending' | 'active' | 'suspended' | 'cancelled'
export type PaymentStatus = 'pending' | 'paid'

export type Affiliation = {
  id: number
  tipo: AffiliationType
  nombre: string
  correo_contacto: string
  telefono_contacto: string | null
  cupos_comprados: number
  cupos_usados: number
  cupos_disponibles: number
  estado: AffiliationStatus
  pago_estado: PaymentStatus
  pago_referencia: string | null
  inicia_en: string | null
  expira_en: string | null
  created_at: string
  updated_at: string
}

export type AffiliationCreatePayload = {
  tipo: AffiliationType
  nombre: string
  correo_contacto: string
  telefono_contacto: string | null
  cupos_comprados: number
  estado: AffiliationStatus
  pago_estado: PaymentStatus
}

export type AffiliationUpdatePayload = {
  nombre?: string
  correo_contacto?: string
  telefono_contacto?: string | null
  estado?: AffiliationStatus
  pago_estado?: PaymentStatus
  pago_referencia?: string | null
  cupos_comprados?: number
}

export type ProfessionalProvisionPayload = {
  first_names: string
  last_names: string
  email: string
  phone: string | null
  especialidad: string
  numero_licencia: string
}

export type ProvisionedProfessional = {
  user_id: number
  professional_id: number
  membership_id: number
  activation_sent: boolean
}

export type AffiliationProfessional = {
  membership_id: number
  professional_id: number
  user_id: number
  first_names: string
  last_names: string
  email: string
  especialidad: string
  numero_licencia: string
  licencia_verificada: boolean
  membership_activo: boolean
  user_activo: boolean
  email_verificado: boolean | null
}

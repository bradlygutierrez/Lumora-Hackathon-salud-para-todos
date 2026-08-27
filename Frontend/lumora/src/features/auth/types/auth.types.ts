/**
 * Contratos TypeScript del frontend B08.
 *
 * Estos tipos reflejan los schemas Pydantic publicados por el backend en el
 * commit `2159dd8`. Mantener aquí los nombres snake_case del API evita
 * transformar payloads de forma implícita y hace visible el contrato real.
 */

export type TokenPair = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

export type LoginTokenResponse = TokenPair & {
  mfa_required: false;
};

export type LoginMfaResponse = {
  mfa_required: true;
  challenge_token: string;
  expires_in: number;
};

export type LoginResponse = LoginTokenResponse | LoginMfaResponse;

export type PatientRegistrationRequest = {
  username: string;
  email: string;
  password: string;
  phone: string;

  first_names: string;
  last_names: string;
  birth_date: string;
  sex_id: number;
  blood_type_id: number | null;

  address: {
    line_1: string;
    city: string;
    department: string | null;
    country: string;
    postal_code: string | null;
  };

  emergency_contact: {
    name: string;
    relationship: string;
    phone: string;
  };

  /** Backend usa Literal[True], no boolean arbitrario. */
  accept_terms: true;
  accept_privacy: true;
};

export type RegistrationResponse = {
  user_id: number;
  person_id: number;
  patient_id: number;
  emergency_contact_id: number;
  email_verified: boolean;
  status: string;
};

export type MessageResponse = {
  message: string;
};

/** Método MFA anunciado por GET /auth/mfa/methods. B08 solo soporta totp. */
export type MfaMethod = {
  /** ID de UsuarioMetodoMfa; null mientras todavía no esté configurado. */
  id: number | null;
  /** ID del catálogo MetodoMfa; se usa al ejecutar /auth/mfa/setup. */
  metodo_id: number;
  nombre: string;
  activo: boolean;
};

export type MfaSetupResponse = {
  /** ID de la configuración UsuarioMetodoMfa creada/activada. */
  method_id: number;
  secret: string;
  provisioning_uri: string;
  /** Solo se muestran en el setup; el usuario debe guardarlos. */
  recovery_codes: string[];
};

/** Metadatos seguros de una sesión. Nunca contiene hashes de refresh token. */
export type SessionRead = {
  id: number;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
  last_used_at: string;
  expires_at: string;
  device_name: string;
  platform: string;
  ip_address: string | null;
  last_activity_at: string;
  is_current: boolean;
};

/** Shape común de los catálogos generados por `create_catalog_router`. */
export type CatalogItem = {
  id: number;
  nombre: string;
  activo?: boolean;
};

export type CatalogPage = {
  items: CatalogItem[];
  total: number;
  limit: number;
  offset: number;
};

/**
 * Contratos TypeScript del módulo B08/B14.
 *
 * IMPORTANTE:
 * Los nombres de propiedades provenientes de FastAPI se mantienen
 * en snake_case para representar fielmente el contrato HTTP.
 */

export type MfaMethodName =
  | 'email'
  | 'totp';

export type TokenPair = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

export type LoginTokenResponse =
  TokenPair & {
    mfa_required: false;
  };

export type LoginMfaResponse = {
  mfa_required: true;
  challenge_token: string;
  expires_in: number;
  method: MfaMethodName | null;
};

export type LoginResponse =
  | LoginTokenResponse
  | LoginMfaResponse;

export type RegistrationAddressRequest = {
  line_1: string;
  city: string;
  department: string | null;
  country: string;
  postal_code: string | null;
};

export type RegistrationIdentityRequest = {
  username: string;
  email: string;
  password: string;
  phone: string;

  first_names: string;
  last_names: string;
  birth_date: string;

  sex_id: number;

  address: RegistrationAddressRequest;

  accept_terms: true;
  accept_privacy: true;
};

/** POST /auth/register */
export type PatientRegistrationRequest =
  RegistrationIdentityRequest & {
    blood_type_id: number | null;
    emergency_contact: {
      name: string;
      relationship: string;
      phone: string;
    };
  };

/** POST /auth/register/caregiver */
export type CaregiverRegistrationRequest =
  RegistrationIdentityRequest;

/** Respuesta del registro de paciente. */
export type RegistrationResponse = {
  user_id: number;
  person_id: number;
  patient_id: number;
  emergency_contact_id: number;
  email_verified: boolean;
  status: string;
};

/** Respuesta del registro directo de cuidador B14. */
export type CaregiverRegistrationResponse = {
  user_id: number;
  person_id: number;
  email_verified: boolean;
  status: string;
};

export type MessageResponse = {
  message: string;
};

export type MfaMethod = {
  id: number | null;
  metodo_id: number;
  nombre: MfaMethodName;
  activo: boolean;
};

export type MfaSetupResponse = {
  method_id: number;
  secret: string | null;
  provisioning_uri: string | null;
  challenge_token: string | null;
  expires_in: number | null;
};

export type MfaActivationResponse = {
  method_id: number;
  recovery_codes: string[];
};

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

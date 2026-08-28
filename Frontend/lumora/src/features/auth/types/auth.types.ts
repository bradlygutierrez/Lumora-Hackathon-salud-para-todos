/**
 * Contratos TypeScript del módulo B08.
 *
 * IMPORTANTE:
 * Los nombres de propiedades provenientes de FastAPI se mantienen
 * en snake_case para representar fielmente el contrato HTTP.
 */

/**
 * Métodos MFA soportados oficialmente por Lumora.
 *
 * - email: OTP enviado al correo verificado.
 * - totp: código generado por una aplicación Authenticator.
 */
export type MfaMethodName =
  | 'email'
  | 'totp';

/**
 * Tokens entregados después de completar correctamente
 * todo el proceso de autenticación.
 */
export type TokenPair = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

/**
 * Login exitoso cuando el usuario no necesita MFA.
 */
export type LoginTokenResponse =
  TokenPair & {
    mfa_required: false;
  };

/**
 * Respuesta del backend cuando el usuario debe
 * completar un segundo factor antes de recibir tokens.
 */
export type LoginMfaResponse = {
  mfa_required: true;

  /**
   * Token temporal que identifica el desafío MFA.
   */
  challenge_token: string;

  /**
   * Tiempo de vida del challenge, expresado en segundos.
   */
  expires_in: number;

  /**
   * Factor que debe completar el usuario.
   *
   * El backend actualmente soporta:
   * - email
   * - totp
   */
  method: MfaMethodName | null;
};

/**
 * Unión discriminada de POST /auth/login.
 *
 * `mfa_required` permite saber automáticamente
 * cuál de las dos respuestas recibimos.
 */
export type LoginResponse =
  | LoginTokenResponse
  | LoginMfaResponse;

/**
 * DTO utilizado durante el registro de pacientes.
 */
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

  accept_terms: true;
  accept_privacy: true;
};

/**
 * Resultado del registro.
 */
export type RegistrationResponse = {
  user_id: number;
  person_id: number;
  patient_id: number;
  emergency_contact_id: number;
  email_verified: boolean;
  status: string;
};

/**
 * Respuesta simple del backend.
 */
export type MessageResponse = {
  message: string;
};

/**
 * Método MFA devuelto por:
 *
 * GET /auth/mfa/methods
 */
export type MfaMethod = {
  /**
   * ID de UsuarioMetodoMfa.
   *
   * Es null cuando todavía no existe
   * una configuración para el usuario.
   */
  id: number | null;

  /**
   * ID del catálogo MetodoMfa.
   *
   * Este es el ID que necesita:
   * POST /auth/mfa/setup
   */
  metodo_id: number;

  nombre: MfaMethodName;

  /**
   * Solamente será true después de confirmar
   * correctamente el enrollment.
   */
  activo: boolean;
};

/**
 * Respuesta de:
 *
 * POST /auth/mfa/setup
 *
 * El shape depende del método seleccionado.
 */
export type MfaSetupResponse = {
  /**
   * ID de UsuarioMetodoMfa.
   *
   * Este ID debe usarse posteriormente
   * en /auth/mfa/setup/confirm.
   */
  method_id: number;

  /**
   * Campos utilizados por TOTP.
   */
  secret: string | null;
  provisioning_uri: string | null;

  /**
   * Campos utilizados principalmente
   * durante Email OTP.
   */
  challenge_token: string | null;
  expires_in: number | null;
};

/**
 * Respuesta después de confirmar exitosamente
 * un nuevo factor MFA.
 *
 * Los recovery codes solamente son enviados
 * en este momento.
 */
export type MfaActivationResponse = {
  method_id: number;

  /**
   * Deben mostrarse al usuario una sola vez.
   */
  recovery_codes: string[];
};

/**
 * Información pública de una sesión activa.
 */
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

/**
 * Elemento estándar de los catálogos del backend.
 */
export type CatalogItem = {
  id: number;
  nombre: string;
  activo?: boolean;
};

/**
 * Respuesta paginada estándar de catálogos.
 */
export type CatalogPage = {
  items: CatalogItem[];
  total: number;
  limit: number;
  offset: number;
};
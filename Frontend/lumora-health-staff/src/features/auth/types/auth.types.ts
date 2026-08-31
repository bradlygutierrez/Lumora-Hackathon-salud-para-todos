export type LoginRequest = {
  login: string;
  password: string;
};

export type ForgotPasswordRequest = {
  email: string;
};

export type ResetPasswordRequest = {
  token: string;
  new_password: string;
};

export type ChangePasswordRequest = {
  current_password: string;
  new_password: string;
};

export type VerifyEmailRequest = {
  token: string;
};

export type VerifyEmailCodeRequest = {
  email: string;
  code: string;
};

export type ResendVerificationRequest = {
  email: string;
};

export type TokenPairResponse = {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
};

export type LoginTokenResponse = TokenPairResponse & {
  mfa_required: false;
};

export type LoginMfaResponse = {
  mfa_required: true;
  challenge_token: string;
  expires_in: number;
  method?: string | null;
};

export type LoginResponse = LoginTokenResponse | LoginMfaResponse;

export type PendingMfaChallenge = {
  challengeToken: string;
  expiresIn: number;
  method?: string | null;
};

export type MessageResponse = {
  message: string;
};

export type Permission = {
  id: number;
  nombre: string;
  descripcion?: string | null;
};

export type Role = {
  id: number;
  nombre: string;
  descripcion?: string | null;
  permisos: Permission[];
};

export type Person = {
  id: number;
  nombres: string;
  apellidos: string;
  fecha_nacimiento?: string | null;
  telefono?: string | null;
  sexo_id?: number | null;
};

export type StaffUser = {
  id: number;
  email: string;
  username: string;
  activo: boolean;
  email_verificado: boolean;
  persona: Person;
  roles: Role[];
};

export type StaffSession = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'bearer';
  isPreview?: boolean;
  userId?: number;
  user?: StaffUser;
};

export type SessionStatus = 'restoring' | 'authenticated' | 'anonymous';

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

export type MfaMethod = {
  id: number;
  metodo_id: number;
  nombre: string;
  activo: boolean;
};

export type MfaSetupRequest = {
  metodo_id: number;
};

export type MfaSetupResponse = {
  method_id: number;
  secret: string;
  provisioning_uri: string;
  recovery_codes: string[];
};

export type MfaChallengeRequest = {
  username: string;
  password: string;
};

export type MfaChallengeResponse = {
  challenge_token: string;
  expires_in: number;
};

export type MfaVerifyRequest = {
  challenge_token: string;
  code: string;
};

export type MfaRecoveryRequest = {
  challenge_token: string;
  recovery_code: string;
};

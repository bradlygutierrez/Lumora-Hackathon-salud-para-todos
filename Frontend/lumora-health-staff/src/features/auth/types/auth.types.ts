export type LoginRequest = {
  login: string;
  password: string;
};

export type TokenPairResponse = {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
};

export type StaffSession = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'bearer';
};

export type SessionStatus = 'restoring' | 'authenticated' | 'anonymous';

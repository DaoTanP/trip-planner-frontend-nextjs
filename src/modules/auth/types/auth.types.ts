export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  preferredLocale?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  name: string;
}

export interface AuthSession {
  user: AuthUser;
}

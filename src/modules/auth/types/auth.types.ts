export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "USER" | "ADMIN";
  avatarUrl: string | null;
  locale: string;
  timezone: string;
  emailVerifiedAt: string | null;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  name: string;
}

export type OAuthProvider = "google";

export interface OAuthLoginPayload {
  credential: string;
  deviceId?: string;
  locale?: string;
  timezone?: string;
}

export interface AuthLoginResponse {
  user: AuthUser;
  tokens?: AuthTokens;
}

export interface AuthSession {
  user: AuthUser;
}

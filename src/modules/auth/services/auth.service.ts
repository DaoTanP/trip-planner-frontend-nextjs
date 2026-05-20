import { apiEndpoints } from "@/services/api/endpoints";
import { apiGet, apiPost } from "@/services/api/request";
import { authTokenStore } from "@/services/api/token-storage";
import type { ApiSuccessResponse } from "@/types/api";

import type {
  AuthLoginResponse,
  AuthSession,
  LoginPayload,
  OAuthLoginPayload,
  OAuthProvider,
  RegisterPayload
} from "../types/auth.types";

export async function login(payload: LoginPayload) {
  const response = await apiPost<ApiSuccessResponse<AuthLoginResponse>, LoginPayload>(
    apiEndpoints.auth.login,
    payload
  );

  if (response.data.tokens) {
    authTokenStore.set(response.data.tokens);
  }

  return response.data;
}

export async function register(payload: RegisterPayload) {
  const response = await apiPost<ApiSuccessResponse<AuthLoginResponse>, RegisterPayload>(
    apiEndpoints.auth.register,
    payload
  );

  if (response.data.tokens) {
    authTokenStore.set(response.data.tokens);
  }

  return response.data;
}

export async function loginWithOAuth(provider: OAuthProvider, payload: OAuthLoginPayload) {
  const response = await apiPost<ApiSuccessResponse<AuthLoginResponse>, OAuthLoginPayload>(
    apiEndpoints.auth.oauth(provider),
    payload
  );

  if (response.data.tokens) {
    authTokenStore.set(response.data.tokens);
  }

  return response.data;
}

export async function logout() {
  try {
    await apiPost(apiEndpoints.auth.logout);
  } finally {
    authTokenStore.clear();
  }
}

export async function getSession(signal?: AbortSignal) {
  const response = await apiGet<ApiSuccessResponse<AuthSession>>(apiEndpoints.auth.me, signal);

  return response.data;
}

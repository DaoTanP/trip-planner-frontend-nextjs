import { apiConfig } from "@/config/api";
import { apiGet, apiPost } from "@/services/api/request";
import { authTokenStore } from "@/services/api/token-storage";
import type { ApiResponse } from "@/types/api";

import type {
  AuthSession,
  AuthTokens,
  AuthUser,
  LoginPayload,
  RegisterPayload
} from "../types/auth.types";

export async function login(payload: LoginPayload) {
  const response = await apiPost<ApiResponse<{ user: AuthUser; tokens: AuthTokens }>, LoginPayload>(
    apiConfig.auth.loginPath,
    payload
  );

  authTokenStore.set(response.data.tokens);

  return response.data;
}

export async function register(payload: RegisterPayload) {
  const response = await apiPost<
    ApiResponse<{ user: AuthUser; tokens: AuthTokens }>,
    RegisterPayload
  >(apiConfig.auth.registerPath, payload);

  authTokenStore.set(response.data.tokens);

  return response.data;
}

export async function logout() {
  try {
    await apiPost(apiConfig.auth.logoutPath);
  } finally {
    authTokenStore.clear();
  }
}

export async function getSession(signal?: AbortSignal) {
  const response = await apiGet<ApiResponse<AuthSession>>(apiConfig.auth.mePath, signal);

  return response.data;
}

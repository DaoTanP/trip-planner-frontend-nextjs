import axios from "axios";
import type { AxiosRequestConfig } from "axios";

import { apiConfig } from "@/config/api";
import type { ApiSuccessResponse } from "@/types/api";
import type { RefreshSessionResponseDto } from "@/services/api/contracts";

import { apiEndpoints } from "./endpoints";
import { authTokenStore, type AuthTokenSnapshot } from "./token-storage";

const refreshClient = axios.create({
  baseURL: apiConfig.baseUrl,
  timeout: apiConfig.timeoutMs,
  withCredentials: true
});

let refreshPromise: Promise<string | null> | null = null;

function getCsrfHeaders() {
  const csrfToken = authTokenStore.getCsrfToken();

  return csrfToken ? { "X-CSRF-Token": csrfToken } : undefined;
}

function isApiSuccessRefreshResponse(
  value: ApiSuccessResponse<RefreshSessionResponseDto> | RefreshSessionResponseDto
): value is ApiSuccessResponse<RefreshSessionResponseDto> {
  return typeof value === "object" && value !== null && "success" in value && "data" in value;
}

export async function refreshAccessToken() {
  if (refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = authTokenStore.getRefreshToken();
  const headers = getCsrfHeaders();
  const config: AxiosRequestConfig = headers ? { headers } : {};

  refreshPromise = refreshClient
    .post<ApiSuccessResponse<RefreshSessionResponseDto> | RefreshSessionResponseDto>(
      apiEndpoints.auth.refresh,
      refreshToken ? { refreshToken } : {},
      config
    )
    .then((response) => {
      const payload = isApiSuccessRefreshResponse(response.data)
        ? response.data.data
        : response.data;
      const tokens = payload.tokens as AuthTokenSnapshot | undefined;

      if (tokens) {
        authTokenStore.set(tokens);
      }

      return tokens?.accessToken ?? null;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

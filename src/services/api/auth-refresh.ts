import axios from "axios";

import { apiConfig } from "@/config/api";
import type { ApiResponse } from "@/types/api";

import { authTokenStore, type AuthTokenSnapshot } from "./token-storage";

const refreshClient = axios.create({
  baseURL: apiConfig.baseUrl,
  timeout: apiConfig.timeoutMs
});

let refreshPromise: Promise<string> | null = null;

export async function refreshAccessToken() {
  if (refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = authTokenStore.getRefreshToken();

  if (!refreshToken) {
    throw new Error("Missing refresh token");
  }

  refreshPromise = refreshClient
    .post<ApiResponse<AuthTokenSnapshot> | AuthTokenSnapshot>(apiConfig.auth.refreshPath, {
      refreshToken
    })
    .then((response) => {
      const tokens = "data" in response.data ? response.data.data : response.data;
      authTokenStore.set(tokens);

      return tokens.accessToken;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

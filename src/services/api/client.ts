import axios, { AxiosHeaders, type InternalAxiosRequestConfig } from "axios";

import { apiConfig } from "@/config/api";

import { refreshAccessToken } from "./auth-refresh";
import { normalizeApiError } from "./errors";
import { authTokenStore } from "./token-storage";

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export const apiClient = axios.create({
  baseURL: apiConfig.baseUrl,
  timeout: apiConfig.timeoutMs,
  headers: {
    "Content-Type": "application/json"
  }
});

apiClient.interceptors.request.use((config) => {
  const accessToken = authTokenStore.getAccessToken();

  if (accessToken) {
    const headers = AxiosHeaders.from(config.headers);
    headers.set("Authorization", `Bearer ${accessToken}`);
    config.headers = headers;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const normalizedError = normalizeApiError(error);
    const originalRequest = axios.isAxiosError(error)
      ? (error.config as RetryableRequestConfig | undefined)
      : undefined;

    const canRefresh =
      normalizedError.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes(apiConfig.auth.refreshPath);

    if (!canRefresh || !originalRequest) {
      return Promise.reject(normalizedError);
    }

    originalRequest._retry = true;

    try {
      const accessToken = await refreshAccessToken();
      const headers = AxiosHeaders.from(originalRequest.headers);
      headers.set("Authorization", `Bearer ${accessToken}`);
      originalRequest.headers = headers;

      return apiClient(originalRequest);
    } catch (refreshError) {
      authTokenStore.clear();

      return Promise.reject(normalizeApiError(refreshError));
    }
  }
);

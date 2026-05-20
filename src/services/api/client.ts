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
  withCredentials: true,
  headers: {
    "Content-Type": "application/json"
  }
});

function getBrowserLocale() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.location.pathname.split("/").filter(Boolean)[0] ?? null;
}

function getBrowserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return null;
  }
}

apiClient.interceptors.request.use((config) => {
  const accessToken = authTokenStore.getAccessToken();
  const csrfToken = authTokenStore.getCsrfToken();
  const locale = getBrowserLocale();
  const timeZone = getBrowserTimeZone();
  const headers = AxiosHeaders.from(config.headers);

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  if (csrfToken) {
    headers.set("X-CSRF-Token", csrfToken);
  }
  if (locale) {
    headers.set("X-Locale", locale);
  }
  if (timeZone) {
    headers.set("X-Timezone", timeZone);
  }

  config.headers = headers;

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

      if (accessToken) {
        const headers = AxiosHeaders.from(originalRequest.headers);
        headers.set("Authorization", `Bearer ${accessToken}`);
        originalRequest.headers = headers;
      }

      return apiClient(originalRequest);
    } catch (refreshError) {
      authTokenStore.clear();

      return Promise.reject(normalizeApiError(refreshError));
    }
  }
);

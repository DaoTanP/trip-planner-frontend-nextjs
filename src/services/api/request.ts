import type { AxiosRequestConfig } from "axios";

import { apiClient } from "./client";

function withSignal(signal?: AbortSignal): AxiosRequestConfig {
  return signal ? { signal } : {};
}

export async function apiGet<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await apiClient.get<T>(url, withSignal(signal));

  return response.data;
}

export async function apiPost<TResponse, TBody = unknown>(
  url: string,
  body?: TBody,
  signal?: AbortSignal
): Promise<TResponse> {
  const response = await apiClient.post<TResponse>(url, body, withSignal(signal));

  return response.data;
}

export async function apiPatch<TResponse, TBody = unknown>(
  url: string,
  body?: TBody,
  signal?: AbortSignal
): Promise<TResponse> {
  const response = await apiClient.patch<TResponse>(url, body, withSignal(signal));

  return response.data;
}

export async function apiDelete<TResponse>(url: string, signal?: AbortSignal): Promise<TResponse> {
  const response = await apiClient.delete<TResponse>(url, withSignal(signal));

  return response.data;
}

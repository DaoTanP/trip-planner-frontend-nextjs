import axios, { type AxiosError } from "axios";

import type { ApiErrorCode, ApiValidationIssue } from "@/types/api";

export interface ApiError {
  status?: number;
  code: ApiErrorCode | "NETWORK_ERROR" | "UNKNOWN_ERROR";
  message: string;
  details?: ApiValidationIssue[] | Record<string, unknown>;
  requestId?: string;
  cause?: unknown;
}

interface ErrorResponseBody {
  error?: {
    code?: ApiErrorCode;
    message?: string;
    details?: ApiValidationIssue[] | Record<string, unknown>;
    requestId?: string;
  };
  code?: ApiErrorCode;
  message?: string;
  errors?: Record<string, unknown>;
}

export function normalizeApiError(error: unknown): ApiError {
  if (!axios.isAxiosError(error)) {
    return {
      code: "UNKNOWN_ERROR",
      message: "Unknown application error",
      cause: error
    };
  }

  const axiosError = error as AxiosError<ErrorResponseBody>;
  const status = axiosError.response?.status;
  const body = axiosError.response?.data;

  if (!axiosError.response) {
    return {
      code: "NETWORK_ERROR",
      message: axiosError.message,
      cause: error
    };
  }

  const apiError: ApiError = {
    code: body?.error?.code ?? body?.code ?? statusToCode(status),
    message: body?.error?.message ?? body?.message ?? axiosError.message,
    cause: error
  };

  if (status) {
    apiError.status = status;
  }

  const details = body?.error?.details ?? body?.errors;
  if (details) {
    apiError.details = details;
  }
  if (body?.error?.requestId) {
    apiError.requestId = body.error.requestId;
  }

  return apiError;
}

function statusToCode(status?: number) {
  if (status === 401) {
    return "AUTHENTICATION_FAILED";
  }

  if (status === 403) {
    return "FORBIDDEN";
  }

  if (status === 404) {
    return "NOT_FOUND";
  }

  if (status && status >= 500) {
    return "INTERNAL_SERVER_ERROR";
  }

  return "INTERNAL_SERVER_ERROR";
}

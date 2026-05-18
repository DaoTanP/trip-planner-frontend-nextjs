import axios, { type AxiosError } from "axios";

import type { ApiFieldErrors } from "@/types/api";

export interface ApiError {
  status?: number;
  code: string;
  message: string;
  fieldErrors?: ApiFieldErrors;
  cause?: unknown;
}

interface ErrorResponseBody {
  code?: string;
  message?: string;
  errors?: ApiFieldErrors;
}

export function normalizeApiError(error: unknown): ApiError {
  if (!axios.isAxiosError(error)) {
    return {
      code: "unknown",
      message: "Unknown application error",
      cause: error
    };
  }

  const axiosError = error as AxiosError<ErrorResponseBody>;
  const status = axiosError.response?.status;
  const body = axiosError.response?.data;

  if (!axiosError.response) {
    return {
      code: "network",
      message: axiosError.message,
      cause: error
    };
  }

  const apiError: ApiError = {
    code: body?.code ?? statusToCode(status),
    message: body?.message ?? axiosError.message,
    cause: error
  };

  if (status) {
    apiError.status = status;
  }

  if (body?.errors) {
    apiError.fieldErrors = body.errors;
  }

  return apiError;
}

function statusToCode(status?: number) {
  if (status === 401) {
    return "unauthorized";
  }

  if (status === 403) {
    return "forbidden";
  }

  if (status === 404) {
    return "not_found";
  }

  if (status && status >= 500) {
    return "server_error";
  }

  return "unknown";
}

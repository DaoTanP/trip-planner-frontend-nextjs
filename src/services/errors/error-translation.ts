import type { ApiError } from "@/services/api/errors";

const errorKeyByCode: Record<string, string> = {
  NETWORK_ERROR: "errors.network",
  UNKNOWN_ERROR: "errors.unknown",
  VALIDATION_ERROR: "errors.validation",
  AUTHENTICATION_FAILED: "errors.unauthorized",
  AUTH_INVALID_CREDENTIALS: "errors.auth.invalidCredentials",
  AUTH_INVALID_SESSION: "errors.auth.sessionExpired",
  AUTH_MISSING_TOKEN: "errors.unauthorized",
  AUTH_MISSING_REFRESH_TOKEN: "errors.auth.sessionExpired",
  AUTH_REFRESH_TOKEN_EXPIRED: "errors.auth.sessionExpired",
  AUTH_REFRESH_TOKEN_REUSE_DETECTED: "errors.auth.sessionExpired",
  AUTH_OAUTH_FAILED: "errors.auth.oauthFailed",
  AUTH_OAUTH_PROVIDER_NOT_CONFIGURED: "errors.auth.oauthProviderNotConfigured",
  AUTH_CSRF_INVALID: "errors.auth.csrfInvalid",
  FORBIDDEN: "errors.forbidden",
  NOT_FOUND: "errors.notFound.title",
  CONFLICT: "errors.conflict",
  REVISION_CONFLICT: "errors.conflict",
  RATE_LIMITED: "errors.rateLimited",
  INTERNAL_SERVER_ERROR: "errors.unknown"
};

export function getErrorTranslationKey(error: ApiError) {
  return errorKeyByCode[error.code] ?? "errors.unknown";
}

import type { ApiError } from "@/services/api/errors";

const errorKeyByCode: Record<string, string> = {
  network: "errors.network",
  unauthorized: "errors.unauthorized",
  forbidden: "errors.forbidden",
  not_found: "errors.notFound.title",
  server_error: "errors.unknown",
  unknown: "errors.unknown"
};

export function getErrorTranslationKey(error: ApiError) {
  return errorKeyByCode[error.code] ?? "errors.unknown";
}

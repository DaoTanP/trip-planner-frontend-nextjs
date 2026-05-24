export type MapProviderErrorCode =
  | "MAP_PROVIDER_NOT_CONFIGURED"
  | "MAP_PROVIDER_LOAD_FAILED"
  | "MAP_PROVIDER_REQUEST_FAILED"
  | "MAP_PROVIDER_ZERO_RESULTS"
  | "MAP_PROVIDER_UNSUPPORTED";

export class MapProviderError extends Error {
  readonly code: MapProviderErrorCode;
  readonly provider: string;
  readonly cause?: unknown;

  constructor({
    code,
    provider,
    message,
    cause
  }: {
    code: MapProviderErrorCode;
    provider: string;
    message: string;
    cause?: unknown;
  }) {
    super(message);
    this.name = "MapProviderError";
    this.code = code;
    this.provider = provider;
    this.cause = cause;
  }
}

export function normalizeGoogleMapsError(status: string, fallbackMessage: string) {
  if (status === "ZERO_RESULTS" || status === "NOT_FOUND") {
    return new MapProviderError({
      code: "MAP_PROVIDER_ZERO_RESULTS",
      provider: "google",
      message: fallbackMessage
    });
  }

  return new MapProviderError({
    code: "MAP_PROVIDER_REQUEST_FAILED",
    provider: "google",
    message: fallbackMessage,
    cause: status
  });
}

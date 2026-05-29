const isDevelopment = process.env.NODE_ENV === "development";

export function logSyncDebug(message: string, context?: Record<string, unknown>) {
  if (!isDevelopment) {
    return;
  }

  if (context) {
    console.debug(`[sync] ${message}`, context);
    return;
  }

  console.debug(`[sync] ${message}`);
}

import { apiConfig } from "./api";

function getDefaultWebSocketUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_COLLABORATION_WS_URL;

  if (configuredUrl) {
    return configuredUrl;
  }

  return null;
}

export const collaborationConfig = {
  websocketUrl: getDefaultWebSocketUrl(),
  heartbeatMs: 25_000,
  reconnectMs: 3_000,
  apiBaseUrl: apiConfig.baseUrl
} as const;

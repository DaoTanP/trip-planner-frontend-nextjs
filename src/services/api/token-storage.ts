import { authCookies } from "@/constants/cookies";

const memoryTokens: Partial<AuthTokenSnapshot> = {};

export interface AuthTokenSnapshot {
  accessToken: string;
  refreshToken: string;
  expiresIn?: string;
}

function canUseDocumentCookies() {
  return typeof document !== "undefined";
}

function getCookie(name: string) {
  if (!canUseDocumentCookies()) {
    return null;
  }

  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${encodeURIComponent(name)}=`));

  return cookie ? decodeURIComponent(cookie.split("=").slice(1).join("=")) : null;
}

export const authTokenStore = {
  getAccessToken() {
    return memoryTokens.accessToken ?? null;
  },
  getRefreshToken() {
    return memoryTokens.refreshToken ?? null;
  },
  getCsrfToken() {
    return getCookie(authCookies.csrfToken);
  },
  set(tokens: AuthTokenSnapshot) {
    memoryTokens.accessToken = tokens.accessToken;
    memoryTokens.refreshToken = tokens.refreshToken;
  },
  clear() {
    delete memoryTokens.accessToken;
    delete memoryTokens.refreshToken;
  }
};

import { authCookies } from "@/constants/cookies";

const memoryTokens: Partial<AuthTokenSnapshot> = {};

export interface AuthTokenSnapshot {
  accessToken: string;
  refreshToken: string;
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export const authTokenStore = {
  getAccessToken() {
    if (memoryTokens.accessToken) {
      return memoryTokens.accessToken;
    }

    if (!canUseStorage()) {
      return null;
    }

    return window.localStorage.getItem(authCookies.accessToken);
  },
  getRefreshToken() {
    if (memoryTokens.refreshToken) {
      return memoryTokens.refreshToken;
    }

    if (!canUseStorage()) {
      return null;
    }

    return window.localStorage.getItem(authCookies.refreshToken);
  },
  set(tokens: AuthTokenSnapshot) {
    memoryTokens.accessToken = tokens.accessToken;
    memoryTokens.refreshToken = tokens.refreshToken;

    if (!canUseStorage()) {
      return;
    }

    window.localStorage.setItem(authCookies.accessToken, tokens.accessToken);
    window.localStorage.setItem(authCookies.refreshToken, tokens.refreshToken);
  },
  clear() {
    delete memoryTokens.accessToken;
    delete memoryTokens.refreshToken;

    if (!canUseStorage()) {
      return;
    }

    window.localStorage.removeItem(authCookies.accessToken);
    window.localStorage.removeItem(authCookies.refreshToken);
  }
};

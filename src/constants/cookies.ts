export const authCookies = {
  accessToken: process.env.NEXT_PUBLIC_AUTH_ACCESS_COOKIE_NAME ?? "tp_access_token",
  refreshToken: process.env.NEXT_PUBLIC_AUTH_REFRESH_COOKIE_NAME ?? "tp_refresh_token",
  csrfToken: process.env.NEXT_PUBLIC_AUTH_CSRF_COOKIE_NAME ?? "tp_csrf_token"
} as const;

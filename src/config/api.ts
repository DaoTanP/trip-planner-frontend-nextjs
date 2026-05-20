export const apiConfig = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1",
  serverBaseUrl:
    process.env.API_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:4000/api/v1",
  timeoutMs: 20_000,
  auth: {
    loginPath: "/auth/login",
    registerPath: "/auth/register",
    oauthPath: (provider: "google") => `/auth/oauth/${provider}`,
    refreshPath: "/auth/refresh",
    logoutPath: "/auth/logout",
    mePath: "/auth/me"
  }
} as const;

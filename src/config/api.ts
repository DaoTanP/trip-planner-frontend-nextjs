export const apiConfig = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api",
  timeoutMs: 20_000,
  auth: {
    loginPath: "/auth/login",
    registerPath: "/auth/register",
    refreshPath: "/auth/refresh",
    logoutPath: "/auth/logout",
    mePath: "/auth/me"
  }
} as const;

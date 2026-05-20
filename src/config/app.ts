export const appConfig = {
  name: "Trip Planner",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  defaultTimeZone: process.env.NEXT_PUBLIC_DEFAULT_TIME_ZONE ?? "Asia/Bangkok",
  googleOAuthClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ""
} as const;

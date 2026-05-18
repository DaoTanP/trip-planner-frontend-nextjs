export const appConfig = {
  name: "Trip Planner",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  defaultTimeZone: process.env.NEXT_PUBLIC_DEFAULT_TIME_ZONE ?? "Asia/Bangkok"
} as const;

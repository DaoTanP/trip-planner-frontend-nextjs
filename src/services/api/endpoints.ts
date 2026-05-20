export const apiEndpoints = {
  auth: {
    login: "/auth/login",
    register: "/auth/register",
    oauth: (provider: "google") => `/auth/oauth/${provider}`,
    refresh: "/auth/refresh",
    logout: "/auth/logout",
    me: "/auth/me"
  },
  trips: {
    list: "/trips",
    detail: (tripId: string) => `/trips/${tripId}`
  },
  users: {
    me: "/users/me"
  }
} as const;

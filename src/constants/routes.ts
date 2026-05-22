export const routes = {
  home: "/",
  login: "/login",
  trips: "/trips",
  tripEdit: (tripId: string) => `/trips/${tripId}/edit`,
  profile: "/profile"
} as const;

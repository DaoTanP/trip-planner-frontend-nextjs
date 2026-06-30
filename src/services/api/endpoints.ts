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
    detail: (tripId: string) => `/trips/${tripId}`,
    itinerary: (tripId: string) => `/trips/${tripId}/itinerary`,
    reorderItinerary: (tripId: string) => `/trips/${tripId}/itinerary/reorder`,
    routePreferences: (tripId: string) => `/trips/${tripId}/route-preferences`,
    routePreference: (tripId: string, fromItemId: string, toItemId: string) =>
      `/trips/${tripId}/route-preferences/${fromItemId}/${toItemId}`,
    places: (tripId: string) => `/trips/${tripId}/places`,
    collaborators: (tripId: string) => `/trips/${tripId}/collaborators`,
    expenses: (tripId: string) => `/trips/${tripId}/expenses`,
    budget: (tripId: string) => `/trips/${tripId}/budget`,
    mutationEvents: (tripId: string) => `/trips/${tripId}/mutation-events`
  },
  itinerary: {
    item: (itemId: string) => `/itinerary-items/${itemId}`
  },
  expenses: {
    detail: (expenseId: string) => `/expenses/${expenseId}`
  },
  notes: {
    list: "/notes",
    detail: (noteId: string) => `/notes/${noteId}`
  },
  places: {
    list: "/places",
    search: "/places/search",
    resolve: "/places/resolve",
    reverseGeocode: "/places/reverse-geocode",
    detail: (placeId: string) => `/places/${placeId}`
  },
  users: {
    me: "/users/me"
  }
} as const;

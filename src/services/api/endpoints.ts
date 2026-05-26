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
    places: (tripId: string) => `/trips/${tripId}/places`,
    routes: (tripId: string) => `/trips/${tripId}/routes`,
    notes: (tripId: string) => `/trips/${tripId}/notes`,
    collaborators: (tripId: string) => `/trips/${tripId}/collaborators`,
    expenses: (tripId: string) => `/trips/${tripId}/expenses`
  },
  itinerary: {
    item: (itemId: string) => `/itinerary-items/${itemId}`
  },
  tripNotes: {
    detail: (noteId: string) => `/trip-notes/${noteId}`
  },
  places: {
    list: "/places",
    search: "/places/search",
    detail: (placeId: string) => `/places/${placeId}`
  },
  users: {
    me: "/users/me"
  }
} as const;

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
    days: (tripId: string) => `/trips/${tripId}/days`,
    reorderDays: (tripId: string) => `/trips/${tripId}/days/reorder`,
    reorderItems: (tripId: string) => `/trips/${tripId}/itinerary-items/reorder`,
    notes: (tripId: string) => `/trips/${tripId}/notes`
  },
  itinerary: {
    day: (dayId: string) => `/trip-days/${dayId}`,
    dayItems: (dayId: string) => `/trip-days/${dayId}/itinerary-items`,
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

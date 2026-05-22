import { queryOptions } from "@tanstack/react-query";

import { getTrip, getTrips } from "../services/trips.service";

export const tripKeys = {
  all: ["trips"] as const,
  lists: () => [...tripKeys.all, "list"] as const,
  list: (filters?: Record<string, unknown>) => [...tripKeys.lists(), filters ?? {}] as const,
  detail: (tripId: string) => [...tripKeys.all, "detail", tripId] as const
};

export function tripsQueryOptions() {
  return queryOptions({
    queryKey: tripKeys.list(),
    queryFn: ({ signal }) => getTrips(signal)
  });
}

export function tripDetailQueryOptions(tripId: string) {
  return queryOptions({
    queryKey: tripKeys.detail(tripId),
    queryFn: ({ signal }) => getTrip(tripId, signal),
    staleTime: 30_000
  });
}

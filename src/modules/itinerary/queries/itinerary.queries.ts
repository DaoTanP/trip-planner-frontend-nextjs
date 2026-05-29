import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

import { getItineraryItems } from "../services/itinerary.service";

export const itineraryKeys = {
  all: ["itinerary"] as const,
  byTrip: (tripId: string) => [...itineraryKeys.all, tripId] as const,
  items: (tripId: string) => [...itineraryKeys.byTrip(tripId), "items"] as const
};

export function itineraryQueryOptions(tripId: string) {
  return queryOptions({
    queryKey: itineraryKeys.items(tripId),
    queryFn: ({ signal }) => getItineraryItems(tripId, undefined, signal)
  });
}

export function itineraryInfiniteQueryOptions(tripId: string) {
  return infiniteQueryOptions({
    queryKey: itineraryKeys.items(tripId),
    queryFn: ({ signal, pageParam }) =>
      getItineraryItems(
        tripId,
        { cursor: typeof pageParam === "string" ? pageParam : undefined },
        signal
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    staleTime: 15_000
  });
}

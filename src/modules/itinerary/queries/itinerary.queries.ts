import { queryOptions } from "@tanstack/react-query";

import { getItineraryStops } from "../services/itinerary.service";

export const itineraryKeys = {
  all: ["itinerary"] as const,
  byTrip: (tripId: string) => [...itineraryKeys.all, tripId] as const
};

export function itineraryQueryOptions(tripId: string) {
  return queryOptions({
    queryKey: itineraryKeys.byTrip(tripId),
    queryFn: ({ signal }) => getItineraryStops(tripId, signal)
  });
}

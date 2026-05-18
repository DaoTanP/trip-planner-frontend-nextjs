import { queryOptions } from "@tanstack/react-query";

import { searchPlaces } from "../services/places.service";
import type { PlaceSearchParams } from "../types/place.types";

export const placeKeys = {
  all: ["places"] as const,
  search: (params: PlaceSearchParams) => [...placeKeys.all, "search", params] as const
};

export function placeSearchQueryOptions(params: PlaceSearchParams) {
  return queryOptions({
    queryKey: placeKeys.search(params),
    queryFn: ({ signal }) => searchPlaces(params, signal),
    enabled: params.query.trim().length > 0
  });
}

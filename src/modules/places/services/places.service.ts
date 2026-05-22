import { apiGet } from "@/services/api/request";
import { apiEndpoints } from "@/services/api/endpoints";
import type { ApiSuccessResponse } from "@/types/api";

import type { Place, PlaceSearchParams } from "../types/place.types";

export async function searchPlaces(params: PlaceSearchParams, signal?: AbortSignal) {
  const searchParams = new URLSearchParams();

  if (params.q) {
    searchParams.set("q", params.q);
  }
  if (params.countryCode) {
    searchParams.set("countryCode", params.countryCode);
  }
  if (params.limit) {
    searchParams.set("limit", String(params.limit));
  }
  if (params.near) {
    searchParams.set("lat", String(params.near.latitude));
    searchParams.set("lng", String(params.near.longitude));
  }

  const response = await apiGet<ApiSuccessResponse<{ places: Place[] }>>(
    `${apiEndpoints.places.search}?${searchParams.toString()}`,
    signal
  );

  return response.data.places;
}

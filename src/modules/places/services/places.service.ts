import { apiGet } from "@/services/api/request";
import type { ApiResponse } from "@/types/api";

import type { PlaceSearchParams, PlaceSearchResult } from "../types/place.types";

export async function searchPlaces(params: PlaceSearchParams, signal?: AbortSignal) {
  const searchParams = new URLSearchParams({
    q: params.query
  });

  if (params.near) {
    searchParams.set("lat", String(params.near.latitude));
    searchParams.set("lng", String(params.near.longitude));
  }

  const response = await apiGet<ApiResponse<PlaceSearchResult[]>>(
    `/places/search?${searchParams.toString()}`,
    signal
  );

  return response.data;
}

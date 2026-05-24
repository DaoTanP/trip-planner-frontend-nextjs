"use client";

import { useMutation } from "@tanstack/react-query";

import { createPlaceFromDetails } from "../services/places.service";
import type { PlaceDetails } from "../types/place.types";

export function useCreatePlaceFromDetailsMutation() {
  return useMutation({
    mutationFn: (details: PlaceDetails) => createPlaceFromDetails(details)
  });
}

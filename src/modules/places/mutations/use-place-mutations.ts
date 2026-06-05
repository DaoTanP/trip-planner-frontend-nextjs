"use client";

import { useMutation } from "@tanstack/react-query";

import { resolvePlace } from "../services/places.service";
import type { ResolvablePlaceInput } from "../types/place.types";

export function useResolvePlaceMutation() {
  return useMutation({
    mutationFn: (input: ResolvablePlaceInput) => resolvePlace(input)
  });
}

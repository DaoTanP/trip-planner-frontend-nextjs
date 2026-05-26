"use client";

import { MapCanvas } from "@/modules/map/components/map-canvas";
import type { TripMapProps } from "@/modules/map/types/map.types";

export function PlannerMap(props: TripMapProps) {
  return <MapCanvas {...props} />;
}

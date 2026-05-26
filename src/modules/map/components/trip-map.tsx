"use client";

import { PlannerMap } from "@/modules/map/components/planner-map";
import type { TripMapProps } from "@/modules/map/types/map.types";

export function TripMap(props: TripMapProps) {
  return <PlannerMap {...props} />;
}

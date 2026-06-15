import { Bike, Bus, Car, Footprints, type LucideIcon } from "lucide-react";

import type { MapTravelMode } from "@/modules/map/types/map.types";

export type TravelModeConfig = {
  color: {
    css: string;
    hex: string;
    className: string;
  };
  Icon: LucideIcon;
  labelKey: `routeModes.${MapTravelMode}`;
};

export const travelModeConfig = {
  driving: {
    color: {
      css: "var(--travel-mode-driving)",
      hex: "#2563eb",
      className: "text-travel-mode-driving"
    },
    Icon: Car,
    labelKey: "routeModes.driving"
  },
  walking: {
    color: {
      css: "var(--travel-mode-walking)",
      hex: "#0f766e",
      className: "text-travel-mode-walking"
    },
    Icon: Footprints,
    labelKey: "routeModes.walking"
  },
  bicycling: {
    color: {
      css: "var(--travel-mode-bicycling)",
      hex: "#0891b2",
      className: "text-travel-mode-bicycling"
    },
    Icon: Bike,
    labelKey: "routeModes.bicycling"
  },
  transit: {
    color: {
      css: "var(--travel-mode-transit)",
      hex: "#7c3aed",
      className: "text-travel-mode-transit"
    },
    Icon: Bus,
    labelKey: "routeModes.transit"
  }
} satisfies Record<MapTravelMode, TravelModeConfig>;

export function getTravelModeConfig(travelMode: MapTravelMode) {
  return travelModeConfig[travelMode];
}

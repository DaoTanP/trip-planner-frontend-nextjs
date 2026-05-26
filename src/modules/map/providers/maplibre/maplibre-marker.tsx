"use client";

import { Marker } from "react-map-gl/maplibre";
import { memo } from "react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import type { MapMarker } from "@/modules/map/types/map.types";

interface MapLibreMarkerProps {
  index: number;
  isHovered: boolean;
  isSelected: boolean;
  marker: MapMarker;
  onHover: (marker?: MapMarker) => void;
  onSelect: (marker: MapMarker) => void;
}

export const MapLibreMarker = memo(function MapLibreMarker({
  index,
  isHovered,
  isSelected,
  marker,
  onHover,
  onSelect
}: MapLibreMarkerProps) {
  const t = useTranslations("trip.editor.map");
  const isActive = isSelected || isHovered;

  return (
    <Marker
      anchor="bottom"
      latitude={marker.latitude}
      longitude={marker.longitude}
      style={{ zIndex: isActive ? 20 : 10 }}
    >
      <button
        type="button"
        className={cn(
          "flex size-10 items-center justify-center rounded-full border-2 border-background bg-primary text-xs font-bold text-primary-foreground shadow-lg transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2",
          isActive && "scale-110 bg-accent text-accent-foreground"
        )}
        aria-label={t("marker", { name: marker.label })}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(marker);
        }}
        onMouseEnter={() => onHover(marker)}
        onMouseLeave={() => onHover(undefined)}
        onFocus={() => onHover(marker)}
        onBlur={() => onHover(undefined)}
      >
        {markerInitials(marker) || index + 1}
      </button>
    </Marker>
  );
});

function markerInitials(marker: MapMarker) {
  return marker.label
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

"use client";

import { memo, useMemo } from "react";
import { Layer, Source, type LayerProps } from "react-map-gl/maplibre";
import { useTheme } from "next-themes";

import type { MapMarker, MapMarkerPresence } from "@/modules/map/types/map.types";
import { getCategoryMarkerHex, getMarkerPalette, markerColors, markerRenderConfig } from "@/theme";

export const mapLibreMarkerPointLayerId = "trip-marker-point";
const markerSourceId = "trip-markers";
export const mapLibreMarkerClusterLayerId = "trip-marker-cluster";
export const mapLibreMarkerClusterCountLayerId = "trip-marker-cluster-count";
export const mapLibreMarkerLabelLayerId = "trip-marker-label";
export const mapLibreMarkerShadowLayerId = "trip-marker-shadow";
export const mapLibreMarkerHaloLayerId = "trip-marker-halo";
export const mapLibreMarkerFocusHaloLayerId = "trip-marker-focus-halo";
export const mapLibreMarkerPresenceLayerId = "trip-marker-presence";
export const mapLibreMarkerPresenceLabelLayerId = "trip-marker-presence-label";

export const mapLibreMarkerFeatureLayerIds = [
  mapLibreMarkerHaloLayerId,
  mapLibreMarkerShadowLayerId,
  mapLibreMarkerPointLayerId,
  mapLibreMarkerLabelLayerId,
  mapLibreMarkerPresenceLayerId,
  mapLibreMarkerPresenceLabelLayerId
];
export const mapLibreMarkerClusterFeatureLayerIds = [
  mapLibreMarkerClusterLayerId,
  mapLibreMarkerClusterCountLayerId
];
export const mapLibreMarkerInteractiveLayerIds = [
  ...mapLibreMarkerFeatureLayerIds,
  ...mapLibreMarkerClusterFeatureLayerIds
];

type MarkerFeature = {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: {
    markerId: string;
    itemId: string | null;
    placeId: string | null;
    label: string;
    stopOrder: number;
    fillColor: string;
    hasPresence: boolean;
    isFocused: boolean;
    isHovered: boolean;
    isPresenceEditing: boolean;
    isSelected: boolean;
    presenceLabel: string;
  };
};

type MarkerFeatureCollection = {
  type: "FeatureCollection";
  features: MarkerFeature[];
};

interface MapLibreMarkerLayerProps {
  markers: MapMarker[];
  selectedMarkerId?: string | undefined;
  hoveredMarkerId?: string | undefined;
  focusedMarkerIds?: string[] | undefined;
  markerPresence?: MapMarkerPresence[] | undefined;
}

const clusterLayer: LayerProps = {
  id: mapLibreMarkerClusterLayerId,
  type: "circle",
  source: markerSourceId,
  filter: ["has", "point_count"],
  paint: {
    "circle-color": markerColors.cluster.hex,
    "circle-radius": markerRenderConfig.mapLibre.clusterCircleRadius,
    "circle-stroke-color": markerColors.stroke.hex,
    "circle-stroke-width": markerRenderConfig.mapLibre.clusterStrokeWidth
  }
};

const clusterCountLayer: LayerProps = {
  id: mapLibreMarkerClusterCountLayerId,
  type: "symbol",
  source: markerSourceId,
  filter: ["has", "point_count"],
  layout: {
    "text-field": ["get", "point_count_abbreviated"],
    "text-size": 12,
    "text-font": markerRenderConfig.mapLibre.labelFont
  },
  paint: {
    "text-color": markerColors.label.hex
  }
};

const markerShadowLayer: LayerProps = {
  id: mapLibreMarkerShadowLayerId,
  type: "circle",
  source: markerSourceId,
  filter: ["!", ["has", "point_count"]],
  paint: {
    "circle-color": markerColors.shadow.hex,

    "circle-opacity": markerRenderConfig.mapLibre.shadowOpacity,

    "circle-radius": markerRenderConfig.mapLibre.shadowCircleRadius,

    "circle-blur": markerRenderConfig.mapLibre.shadowBlur
  }
};

export const MapLibreMarkerLayer = memo(function MapLibreMarkerLayer({
  markers,
  selectedMarkerId,
  hoveredMarkerId,
  focusedMarkerIds = [],
  markerPresence = []
}: MapLibreMarkerLayerProps) {
  const { resolvedTheme } = useTheme();
  const colorMode = resolvedTheme === "dark" ? "dark" : "light";
  const markerPalette = getMarkerPalette(colorMode);
  const focusedMarkerIdSet = useMemo(() => new Set(focusedMarkerIds), [focusedMarkerIds]);
  const markerPresenceById = useMemo(
    () => new Map(markerPresence.map((presence) => [presence.markerId, presence.entries])),
    [markerPresence]
  );
  const markerHaloLayer = useMemo<LayerProps>(
    () => ({
      id: mapLibreMarkerHaloLayerId,
      type: "circle",
      source: markerSourceId,
      filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "isSelected"], true]],
      paint: {
        "circle-color": markerRenderConfig.mapLibre.markerHaloFillColor,
        "circle-radius": markerRenderConfig.mapLibre.markerHaloCircleRadius,
        "circle-stroke-color": markerPalette.halo,
        "circle-stroke-opacity": 0.4,
        "circle-stroke-width": markerRenderConfig.mapLibre.markerHaloStrokeWidth
      }
    }),
    [markerPalette.halo]
  );
  const markerFocusHaloLayer = useMemo<LayerProps>(
    () => ({
      id: mapLibreMarkerFocusHaloLayerId,
      type: "circle",
      source: markerSourceId,
      filter: [
        "all",
        ["!", ["has", "point_count"]],
        ["any", ["==", ["get", "isFocused"], true], ["==", ["get", "hasPresence"], true]]
      ],
      paint: {
        "circle-color": markerPalette.halo,
        "circle-opacity": 0.14,
        "circle-radius": markerRenderConfig.mapLibre.markerHaloCircleRadius,
        "circle-stroke-color": markerPalette.halo,
        "circle-stroke-opacity": 0.42,
        "circle-stroke-width": 2
      }
    }),
    [markerPalette.halo]
  );
  const markerLayer = useMemo<LayerProps>(
    () => ({
      id: mapLibreMarkerPointLayerId,
      type: "circle",
      source: markerSourceId,
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": [
          "case",
          ["get", "isSelected"],
          markerPalette.selected,
          ["get", "fillColor"]
        ],

        "circle-radius": markerRenderConfig.mapLibre.markerCircleRadius,

        "circle-stroke-color": markerPalette.stroke,

        "circle-stroke-width": markerRenderConfig.mapLibre.markerStrokeWidth
      }
    }),
    [markerPalette.selected, markerPalette.stroke]
  );
  const markerLabelLayer = useMemo<LayerProps>(
    () => ({
      id: mapLibreMarkerLabelLayerId,
      type: "symbol",
      source: markerSourceId,
      filter: ["!", ["has", "point_count"]],
      layout: {
        "text-field": ["to-string", ["get", "stopOrder"]],
        "text-size": markerRenderConfig.mapLibre.labelTextSize,
        "text-font": markerRenderConfig.mapLibre.labelFont,
        "text-allow-overlap": true,
        "text-ignore-placement": true
      },
      paint: {
        "text-color": markerPalette.label
      }
    }),
    [markerPalette.label]
  );
  const markerPresenceLayer = useMemo<LayerProps>(
    () => ({
      id: mapLibreMarkerPresenceLayerId,
      type: "circle",
      source: markerSourceId,
      filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "hasPresence"], true]],
      paint: {
        "circle-color": [
          "case",
          ["get", "isPresenceEditing"],
          markerPalette.selected,
          markerPalette.halo
        ],
        "circle-radius": 11,
        "circle-stroke-color": markerPalette.stroke,
        "circle-stroke-width": 2,
        "circle-translate": [0, -31]
      }
    }),
    [markerPalette.halo, markerPalette.selected, markerPalette.stroke]
  );
  const markerPresenceLabelLayer = useMemo<LayerProps>(
    () => ({
      id: mapLibreMarkerPresenceLabelLayerId,
      type: "symbol",
      source: markerSourceId,
      filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "hasPresence"], true]],
      layout: {
        "text-field": ["get", "presenceLabel"],
        "text-size": 9,
        "text-font": markerRenderConfig.mapLibre.labelFont,
        "text-allow-overlap": true,
        "text-ignore-placement": true,
        "text-offset": [0, -2.45]
      },
      paint: {
        "text-color": markerPalette.label
      }
    }),
    [markerPalette.label]
  );
  const markerData = useMemo<MarkerFeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: markers.map((marker) => {
        const presenceEntries = markerPresenceById.get(marker.id) ?? [];

        return {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [marker.longitude, marker.latitude]
          },
          properties: {
            markerId: marker.id,
            itemId: marker.itemId ?? null,
            placeId: marker.placeId ?? null,
            label: marker.label,
            stopOrder: marker.stopOrder,
            fillColor:
              marker.status === "CANCELLED"
                ? markerPalette.muted
                : getCategoryMarkerHex(marker.categoryKey, colorMode),
            hasPresence: presenceEntries.length > 0,
            isFocused: focusedMarkerIdSet.has(marker.id),
            isHovered: marker.id === hoveredMarkerId,
            isPresenceEditing: presenceEntries.some((entry) => entry.state !== "VIEWING"),
            isSelected: marker.id === selectedMarkerId,
            presenceLabel: getPresenceMarkerLabel(presenceEntries)
          }
        };
      })
    }),
    [
      colorMode,
      focusedMarkerIdSet,
      hoveredMarkerId,
      markerPalette.muted,
      markerPresenceById,
      markers,
      selectedMarkerId
    ]
  );

  return (
    <Source
      id={markerSourceId}
      type="geojson"
      data={markerData}
      cluster
      clusterRadius={markerRenderConfig.mapLibre.clusterRadius}
      clusterMaxZoom={markerRenderConfig.mapLibre.clusterMaxZoom}
    >
      <Layer {...markerShadowLayer} />
      <Layer {...markerFocusHaloLayer} />
      <Layer {...markerHaloLayer} />
      <Layer {...markerLayer} />
      <Layer {...markerLabelLayer} />
      <Layer {...markerPresenceLayer} />
      <Layer {...markerPresenceLabelLayer} />
      <Layer {...clusterLayer} />
      <Layer {...clusterCountLayer} />
    </Source>
  );
});

function getPresenceMarkerLabel(entries: MapMarkerPresence["entries"]) {
  if (entries.length === 0) {
    return "";
  }

  if (entries.length > 1) {
    return `+${entries.length}`;
  }

  const name = entries[0]?.userName.trim() ?? "";
  const parts = name.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";

  return `${first}${second}`.toUpperCase();
}

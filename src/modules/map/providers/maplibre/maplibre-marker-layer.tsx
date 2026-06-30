"use client";

import { memo, useMemo } from "react";
import { Layer, Source, type LayerProps } from "react-map-gl/maplibre";
import { useTheme } from "next-themes";

import type { MapMarker } from "@/modules/map/types/map.types";
import { getCategoryMarkerHex, getMarkerPalette, markerColors, markerRenderConfig } from "@/theme";

export const mapLibreMarkerPointLayerId = "trip-marker-point";
const markerSourceId = "trip-markers";
export const mapLibreMarkerClusterLayerId = "trip-marker-cluster";
export const mapLibreMarkerClusterCountLayerId = "trip-marker-cluster-count";
export const mapLibreMarkerLabelLayerId = "trip-marker-label";
export const mapLibreMarkerShadowLayerId = "trip-marker-shadow";
export const mapLibreMarkerHaloLayerId = "trip-marker-halo";

export const mapLibreMarkerFeatureLayerIds = [
  mapLibreMarkerHaloLayerId,
  mapLibreMarkerShadowLayerId,
  mapLibreMarkerPointLayerId,
  mapLibreMarkerLabelLayerId
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
    isFocused: boolean;
    isHovered: boolean;
    isSelected: boolean;
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
  focusedMarkerIds = []
}: MapLibreMarkerLayerProps) {
  const { resolvedTheme } = useTheme();
  const colorMode = resolvedTheme === "dark" ? "dark" : "light";
  const markerPalette = getMarkerPalette(colorMode);
  const focusedMarkerIdSet = useMemo(() => new Set(focusedMarkerIds), [focusedMarkerIds]);
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
  const markerData = useMemo<MarkerFeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: markers.map((marker) => ({
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
          isFocused: focusedMarkerIdSet.has(marker.id),
          isHovered: marker.id === hoveredMarkerId,
          isSelected: marker.id === selectedMarkerId
        }
      }))
    }),
    [colorMode, focusedMarkerIdSet, hoveredMarkerId, markerPalette.muted, markers, selectedMarkerId]
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
      <Layer {...markerHaloLayer} />
      <Layer {...markerLayer} />
      <Layer {...markerLabelLayer} />
      <Layer {...clusterLayer} />
      <Layer {...clusterCountLayer} />
    </Source>
  );
});

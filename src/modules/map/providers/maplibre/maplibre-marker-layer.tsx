"use client";

import { memo, useMemo } from "react";
import { Layer, Source, type LayerProps } from "react-map-gl/maplibre";

import type { MapMarker } from "@/modules/map/types/map.types";
import { markerColors, markerRenderConfig } from "@/theme";

export const mapLibreMarkerPointLayerId = "trip-marker-point";
const markerSourceId = "trip-markers";
export const mapLibreMarkerClusterLayerId = "trip-marker-cluster";
export const mapLibreMarkerClusterCountLayerId = "trip-marker-cluster-count";
export const mapLibreMarkerLabelLayerId = "trip-marker-label";
export const mapLibreMarkerShadowLayerId = "trip-marker-shadow";

export const mapLibreMarkerFeatureLayerIds = [
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

const markerLayer: LayerProps = {
  id: mapLibreMarkerPointLayerId,
  type: "circle",
  source: markerSourceId,
  filter: ["!", ["has", "point_count"]],
  paint: {
    "circle-color": [
      "case",
      ["get", "isSelected"],
      markerColors.selected.hex,
      ["get", "isHovered"],
      markerColors.hover.hex,
      markerColors.default.hex
    ],

    "circle-radius": markerRenderConfig.mapLibre.markerCircleRadius,

    "circle-stroke-color": markerColors.stroke.hex,

    "circle-stroke-width": markerRenderConfig.mapLibre.markerStrokeWidth
  }
};

const markerLabelLayer: LayerProps = {
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
    "text-color": markerColors.label.hex
  }
};

export const MapLibreMarkerLayer = memo(function MapLibreMarkerLayer({
  markers,
  selectedMarkerId,
  hoveredMarkerId,
  focusedMarkerIds = []
}: MapLibreMarkerLayerProps) {
  const focusedMarkerIdSet = useMemo(() => new Set(focusedMarkerIds), [focusedMarkerIds]);
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
          isFocused: focusedMarkerIdSet.has(marker.id),
          isHovered: marker.id === hoveredMarkerId,
          isSelected: marker.id === selectedMarkerId
        }
      }))
    }),
    [focusedMarkerIdSet, hoveredMarkerId, markers, selectedMarkerId]
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
      <Layer {...markerLayer} />
      <Layer {...markerLabelLayer} />
      <Layer {...clusterLayer} />
      <Layer {...clusterCountLayer} />
    </Source>
  );
});

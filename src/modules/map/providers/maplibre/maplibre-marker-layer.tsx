"use client";

import { memo, useMemo } from "react";
import { Layer, Source, type LayerProps } from "react-map-gl/maplibre";

import type { MapMarker } from "@/modules/map/types/map.types";

export const mapLibreMarkerPointLayerId = "trip-marker-point";
const markerSourceId = "trip-markers";
export const mapLibreMarkerClusterLayerId = "trip-marker-cluster";
const markerClusterCountLayerId = "trip-marker-cluster-count";
const markerLabelLayerId = "trip-marker-label";

export const mapLibreMarkerInteractiveLayerIds = [
  mapLibreMarkerPointLayerId,
  mapLibreMarkerClusterLayerId
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
    isActive: boolean;
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
    "circle-color": "#0f766e",
    "circle-radius": ["step", ["get", "point_count"], 18, 20, 24, 60, 30],
    "circle-stroke-color": "#ffffff",
    "circle-stroke-width": 3
  }
};

const clusterCountLayer: LayerProps = {
  id: markerClusterCountLayerId,
  type: "symbol",
  source: markerSourceId,
  filter: ["has", "point_count"],
  layout: {
    "text-field": ["get", "point_count_abbreviated"],
    "text-size": 12,
    "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"]
  },
  paint: {
    "text-color": "#ffffff"
  }
};

const markerShadowLayer: LayerProps = {
  id: "trip-marker-shadow",
  type: "circle",
  source: markerSourceId,
  filter: ["!", ["has", "point_count"]],
  paint: {
    "circle-color": "#000000",

    "circle-opacity": ["case", ["get", "isActive"], 0.25, 0.25],

    "circle-radius": ["case", ["get", "isActive"], 24, 20],

    // "circle-translate": [0, 2],

    "circle-blur": 0.2
  }
};

const markerLayer: LayerProps = {
  id: mapLibreMarkerPointLayerId,
  type: "circle",
  source: markerSourceId,
  filter: ["!", ["has", "point_count"]],
  paint: {
    "circle-color": ["case", ["get", "isActive"], "#f97316", "#2563eb"],

    "circle-radius": ["case", ["get", "isActive"], 18, 15],

    "circle-stroke-color": "#ffffff",

    "circle-stroke-width": ["case", ["get", "isActive"], 4, 3]
  }
};

const markerLabelLayer: LayerProps = {
  id: markerLabelLayerId,
  type: "symbol",
  source: markerSourceId,
  filter: ["!", ["has", "point_count"]],
  layout: {
    "text-field": ["to-string", ["get", "stopOrder"]],
    "text-size": ["case", ["get", "isActive"], 18, 15],
    "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
    "text-allow-overlap": true,
    "text-ignore-placement": true
  },
  paint: {
    "text-color": "#ffffff"
    // "text-halo-color": "#dddddd",
    // "text-halo-width": 1
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
          isActive:
            marker.id === selectedMarkerId ||
            marker.id === hoveredMarkerId ||
            focusedMarkerIdSet.has(marker.id)
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
      clusterRadius={44}
      clusterMaxZoom={14}
    >
      <Layer {...clusterLayer} />
      <Layer {...clusterCountLayer} />
      <Layer {...markerShadowLayer} />
      <Layer {...markerLayer} />
      <Layer {...markerLabelLayer} />
    </Source>
  );
});

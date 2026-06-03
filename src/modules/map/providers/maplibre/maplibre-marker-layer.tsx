"use client";

import { memo, useMemo } from "react";
import { Layer, Source, type LayerProps } from "react-map-gl/maplibre";

import type { MapMarker } from "@/modules/map/types/map.types";

export const mapLibreMarkerPointLayerId = "trip-marker-point";
const markerSourceId = "trip-markers";
const markerClusterLayerId = "trip-marker-cluster";
const markerClusterCountLayerId = "trip-marker-cluster-count";
const markerLabelLayerId = "trip-marker-label";

export const mapLibreMarkerInteractiveLayerIds = [mapLibreMarkerPointLayerId];

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
  id: markerClusterLayerId,
  type: "circle",
  source: markerSourceId,
  filter: ["has", "point_count"],
  paint: {
    "circle-color": "#0f766e",
    "circle-radius": ["step", ["get", "point_count"], 18, 20, 24, 60, 30],
    "circle-stroke-color": "#ffffff",
    "circle-stroke-width": 2
  }
};

const clusterCountLayer: LayerProps = {
  id: markerClusterCountLayerId,
  type: "symbol",
  source: markerSourceId,
  filter: ["has", "point_count"],
  layout: {
    "text-field": ["get", "point_count_abbreviated"],
    "text-size": 12
  },
  paint: {
    "text-color": "#ffffff"
  }
};

const markerLayer: LayerProps = {
  id: mapLibreMarkerPointLayerId,
  type: "circle",
  source: markerSourceId,
  filter: ["!", ["has", "point_count"]],
  paint: {
    "circle-color": ["case", ["get", "isActive"], "#f97316", "#2563eb"],
    "circle-radius": ["case", ["get", "isActive"], 12, 9],
    "circle-stroke-color": "#ffffff",
    "circle-stroke-width": 2
  }
};

const markerLabelLayer: LayerProps = {
  id: markerLabelLayerId,
  type: "symbol",
  source: markerSourceId,
  filter: ["!", ["has", "point_count"]],
  layout: {
    "text-field": ["to-string", ["get", "stopOrder"]],
    "text-size": 11,
    "text-allow-overlap": true,
    "text-ignore-placement": true
  },
  paint: {
    "text-color": "#ffffff"
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
      <Layer {...markerLayer} />
      <Layer {...markerLabelLayer} />
    </Source>
  );
});

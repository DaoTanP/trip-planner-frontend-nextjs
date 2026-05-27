"use client";

import { LocateFixed, Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import ReactMap, { type MapLayerMouseEvent } from "react-map-gl/maplibre";

import { Button } from "@/components/ui/button";
import { RouteSummary } from "@/modules/map/components/route-summary";
import { mapConfig } from "@/modules/map/config/map.config";
import { useMapInstance } from "@/modules/map/hooks/use-map-instance";
import { useMapViewport } from "@/modules/map/hooks/use-map-viewport";
import type { MapMarker, TripMapProps } from "@/modules/map/types/map.types";
import { getPointBounds, toLngLatBounds } from "@/modules/map/utils/bounds";
import { clampZoom, hasViewportChanged, normalizeViewport } from "@/modules/map/utils/viewport";

import { loadMapLibre } from "./maplibre-loader";
import {
  mapLibreMarkerInteractiveLayerIds,
  mapLibreMarkerPointLayerId,
  MapLibreMarkerLayer
} from "./maplibre-marker-layer";
import { MapLibreRouteLayer } from "./maplibre-route-layer";
import type { MapLibreMapRef } from "./maplibre.types";
import { viewportFromMap, viewportFromViewState } from "./maplibre.types";

export function MapLibreMap({
  markers,
  route,
  routeResult,
  viewport,
  selectedMarkerId,
  hoveredMarkerId,
  onViewportChange,
  onMarkerSelect,
  onMarkerHover
}: TripMapProps) {
  const t = useTranslations("trip.editor.map");
  const { mapRef, setMapInstance } = useMapInstance<MapLibreMapRef>();
  const { commitViewport, scheduleViewport } = useMapViewport({ onViewportChange });
  const mapLib = useMemo(() => loadMapLibre(), []);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const normalizedViewport = useMemo(() => normalizeViewport(viewport), [viewport]);
  const markerById = useMemo(
    () => new Map<string, MapMarker>(markers.map((marker) => [marker.id, marker])),
    [markers]
  );

  const handleMapLoad = useCallback(() => {
    setMapInstance(mapRef.current);
  }, [mapRef, setMapInstance]);

  const handleZoom = useCallback(
    (direction: 1 | -1) => {
      const map = mapRef.current;

      if (!map) {
        return;
      }

      const nextZoom = clampZoom(map.getZoom() + direction);
      map.zoomTo(nextZoom, { duration: 180 });
      commitViewport({
        ...viewportFromMap(map),
        zoom: nextZoom
      });
    },
    [commitViewport, mapRef]
  );

  const handleFitMarkers = useCallback(() => {
    const map = mapRef.current;
    const bounds = getPointBounds(markers);

    if (!map || !bounds) {
      return;
    }

    map.fitBounds(toLngLatBounds(bounds), {
      duration: 260,
      maxZoom: 15,
      padding: 64
    });
  }, [mapRef, markers]);

  const handleMarkerHover = useCallback(
    (marker?: MapMarker) => {
      onMarkerHover?.(marker);
    },
    [onMarkerHover]
  );

  const handleMarkerSelect = useCallback(
    (marker: MapMarker) => {
      onMarkerSelect(marker);
    },
    [onMarkerSelect]
  );

  const getMarkerFromEvent = useCallback(
    (event: MapLayerMouseEvent) => {
      const markerFeature = event.features?.find(
        (feature) => feature.layer.id === mapLibreMarkerPointLayerId
      );
      const markerId = markerFeature?.properties?.markerId;

      return typeof markerId === "string" ? markerById.get(markerId) : undefined;
    },
    [markerById]
  );

  const handleMapClick = useCallback(
    (event: MapLayerMouseEvent) => {
      const marker = getMarkerFromEvent(event);

      if (marker) {
        handleMarkerSelect(marker);
      }
    },
    [getMarkerFromEvent, handleMarkerSelect]
  );

  const handleMapMouseMove = useCallback(
    (event: MapLayerMouseEvent) => {
      const marker = getMarkerFromEvent(event);
      const map = mapRef.current;

      if (map) {
        map.getCanvas().style.cursor = marker ? "pointer" : "";
      }

      handleMarkerHover(marker);
    },
    [getMarkerFromEvent, handleMarkerHover, mapRef]
  );

  const handleMapMouseLeave = useCallback(() => {
    const map = mapRef.current;

    if (map) {
      map.getCanvas().style.cursor = "";
    }

    handleMarkerHover(undefined);
  }, [handleMarkerHover, mapRef]);

  const handleMoveEnd = useCallback(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    commitViewport(viewportFromMap(map));
  }, [commitViewport, mapRef]);

  const handleExternalViewport = useCallback(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    const currentViewport = viewportFromMap(map);

    if (!hasViewportChanged(currentViewport, normalizedViewport)) {
      return;
    }

    map.easeTo({
      center: [normalizedViewport.longitude, normalizedViewport.latitude],
      duration: 240,
      essential: true,
      zoom: normalizedViewport.zoom
    });
  }, [mapRef, normalizedViewport]);

  useEffect(() => {
    handleExternalViewport();
  }, [handleExternalViewport]);

  return (
    <section
      className="trip-maplibre relative h-[26rem] overflow-hidden rounded-md border bg-muted md:h-[calc(100dvh-8rem)]"
      aria-label={t("label")}
    >
      <ReactMap
        ref={mapRef}
        mapLib={mapLib}
        initialViewState={normalizedViewport}
        mapStyle={mapConfig.mapStyleUrl}
        minZoom={mapConfig.minZoom}
        maxZoom={mapConfig.maxZoom}
        attributionControl={false}
        dragRotate={false}
        touchPitch={false}
        reuseMaps
        interactiveLayerIds={mapLibreMarkerInteractiveLayerIds}
        style={{ height: "100%", width: "100%" }}
        onLoad={() => {
          setIsMapReady(true);
          handleMapLoad();
          handleExternalViewport();
        }}
        onMove={(event) => scheduleViewport(viewportFromViewState(event.viewState))}
        onMoveEnd={handleMoveEnd}
        onClick={handleMapClick}
        onMouseMove={handleMapMouseMove}
        onMouseLeave={handleMapMouseLeave}
        onError={() => {
          if (!isMapReady) {
            setHasLoadError(true);
          }
        }}
      >
        <MapLibreRouteLayer route={route} />
        <MapLibreMarkerLayer
          markers={markers}
          hoveredMarkerId={hoveredMarkerId}
          selectedMarkerId={selectedMarkerId}
        />
      </ReactMap>

      {hasLoadError ? (
        <div className="absolute inset-0 z-40 grid place-items-center bg-muted p-6 text-center text-sm text-muted-foreground">
          {t("loadError")}
        </div>
      ) : null}

      <div className="absolute right-4 top-4 z-30 grid gap-2">
        <Button
          type="button"
          size="icon"
          variant="secondary"
          aria-label={t("zoomIn")}
          onClick={() => handleZoom(1)}
        >
          <Plus aria-hidden="true" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          aria-label={t("zoomOut")}
          onClick={() => handleZoom(-1)}
        >
          <Minus aria-hidden="true" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          aria-label={t("fit")}
          disabled={markers.length === 0}
          onClick={handleFitMarkers}
        >
          <LocateFixed aria-hidden="true" />
        </Button>
      </div>

      <div className="absolute bottom-3 left-3 z-30 rounded-md bg-background/90 px-2 py-1 text-xs text-muted-foreground shadow-sm">
        {t("attributionMapLibre")}
      </div>
      <RouteSummary route={routeResult} />
    </section>
  );
}

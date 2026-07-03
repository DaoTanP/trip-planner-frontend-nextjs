"use client";

import { LocateFixed, Minus, Plus, Route } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  mapLibreMarkerClusterFeatureLayerIds,
  mapLibreMarkerFeatureLayerIds,
  mapLibreMarkerInteractiveLayerIds,
  MapLibreMarkerLayer
} from "./maplibre-marker-layer";
import { mapLibreRouteInteractiveLayerIds, MapLibreRouteLayer } from "./maplibre-route-layer";
import type { MapLibreMapRef } from "./maplibre.types";
import { viewportFromMap } from "./maplibre.types";

const mapLibreInteractiveLayerIds = [
  ...mapLibreMarkerInteractiveLayerIds,
  ...mapLibreRouteInteractiveLayerIds
];

export function MapLibreMap({
  markers,
  route,
  activeRoute,
  routeResult,
  viewport,
  selectedMarkerId,
  hoveredMarkerId,
  focusedMarkerIds,
  markerPresence,
  autoFitMarkerBoundsKey,
  onViewportChange,
  onMarkerSelect,
  onMarkerHover,
  onMapContextChange,
  onMapClick
}: TripMapProps) {
  const t = useTranslations("trip.editor.map");
  const { mapRef, setMapInstance } = useMapInstance<MapLibreMapRef>();
  const { commitViewport } = useMapViewport({ onViewportChange });
  const mapLib = useMemo(() => loadMapLibre(), []);
  const lastAutoFitMarkerBoundsKeyRef = useRef<string | undefined>(undefined);
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

  const handleFitActiveRoute = useCallback(() => {
    const map = mapRef.current;
    const bounds = getPointBounds(activeRoute ?? route);

    if (!map || !bounds) {
      return;
    }

    map.fitBounds(toLngLatBounds(bounds), {
      duration: 260,
      maxZoom: 15,
      padding: 72
    });
  }, [activeRoute, mapRef, route]);

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
      const markerFeature = event.features?.find((feature) =>
        mapLibreMarkerFeatureLayerIds.includes(feature.layer.id)
      );
      const markerId = markerFeature?.properties?.markerId;

      return typeof markerId === "string" ? markerById.get(markerId) : undefined;
    },
    [markerById]
  );

  const hasClusterFromEvent = useCallback(
    (event: MapLayerMouseEvent) =>
      event.features?.some((feature) =>
        mapLibreMarkerClusterFeatureLayerIds.includes(feature.layer.id)
      ) === true,
    []
  );

  const hasRouteFromEvent = useCallback(
    (event: MapLayerMouseEvent) =>
      event.features?.some((feature) =>
        mapLibreRouteInteractiveLayerIds.includes(feature.layer.id)
      ) === true,
    []
  );

  const handleClusterSelect = useCallback(
    (event: MapLayerMouseEvent) => {
      const map = mapRef.current;

      if (!map) {
        return;
      }

      map.easeTo({
        center: [event.lngLat.lng, event.lngLat.lat],
        duration: 220,
        essential: true,
        zoom: Math.min(mapConfig.maxZoom, map.getZoom() + 2)
      });
      onMapContextChange?.();
    },
    [mapRef, onMapContextChange]
  );

  const handleMapClick = useCallback(
    (event: MapLayerMouseEvent) => {
      const marker = getMarkerFromEvent(event);

      if (marker) {
        handleMarkerSelect(marker);
        return;
      }

      if (hasClusterFromEvent(event)) {
        handleClusterSelect(event);
        return;
      }

      if (hasRouteFromEvent(event)) {
        return;
      }

      onMapClick?.({
        latitude: event.lngLat.lat,
        longitude: event.lngLat.lng
      });
    },
    [
      getMarkerFromEvent,
      handleClusterSelect,
      handleMarkerSelect,
      hasClusterFromEvent,
      hasRouteFromEvent,
      onMapClick
    ]
  );

  const handleMapMouseMove = useCallback(
    (event: MapLayerMouseEvent) => {
      const marker = getMarkerFromEvent(event);
      const isCluster = hasClusterFromEvent(event);
      const map = mapRef.current;

      if (map) {
        map.getCanvas().style.cursor = marker || isCluster ? "pointer" : "";
      }

      handleMarkerHover(marker);
    },
    [getMarkerFromEvent, handleMarkerHover, hasClusterFromEvent, mapRef]
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

    map.jumpTo({
      center: [normalizedViewport.longitude, normalizedViewport.latitude],
      zoom: normalizedViewport.zoom
    });
  }, [mapRef, normalizedViewport]);

  useEffect(() => {
    handleExternalViewport();
  }, [handleExternalViewport]);

  useEffect(() => {
    const map = mapRef.current;
    const bounds = getPointBounds(markers);

    if (
      !isMapReady ||
      !map ||
      !bounds ||
      !autoFitMarkerBoundsKey ||
      lastAutoFitMarkerBoundsKeyRef.current === autoFitMarkerBoundsKey
    ) {
      return;
    }

    lastAutoFitMarkerBoundsKeyRef.current = autoFitMarkerBoundsKey;
    map.fitBounds(toLngLatBounds(bounds), {
      duration: 0,
      maxZoom: 15,
      padding: 64
    });
    commitViewport(viewportFromMap(map));
  }, [autoFitMarkerBoundsKey, commitViewport, isMapReady, mapRef, markers]);

  return (
    <section
      className="trip-maplibre relative h-[42dvh] min-h-72 max-h-[28rem] overflow-hidden rounded-md bg-muted md:h-dvh md:max-h-none md:rounded-none"
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
        interactiveLayerIds={mapLibreInteractiveLayerIds}
        style={{ height: "100%", width: "100%" }}
        onLoad={() => {
          setIsMapReady(true);
          handleMapLoad();
          handleExternalViewport();
        }}
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
        <MapLibreMarkerLayer
          markers={markers}
          hoveredMarkerId={hoveredMarkerId}
          focusedMarkerIds={focusedMarkerIds}
          selectedMarkerId={selectedMarkerId}
          markerPresence={markerPresence}
        />
        <MapLibreRouteLayer route={route} activeRoute={activeRoute} />
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
          aria-label={t("fitRoute")}
          disabled={(activeRoute?.length ?? route.length) < 2}
          onClick={handleFitActiveRoute}
        >
          <Route aria-hidden="true" />
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

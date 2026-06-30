"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { RouteSummary } from "@/modules/map/components/route-summary";
import { mapConfig } from "@/modules/map/config/map.config";
import type { MapMarker, MapRoutePoint, TripMapProps } from "@/modules/map/types/map.types";
import {
  getCategoryMarkerHex,
  getMarkerPalette,
  markerRenderConfig,
  routeColors,
  routeRenderConfig
} from "@/theme";

import { loadGoogleMaps } from "./google-map-loader";
import type {
  GoogleMap,
  GoogleMapOptions,
  GoogleMapsApi,
  GoogleMarker,
  GoogleMarkerIcon,
  GoogleMarkerLabel,
  GooglePolyline
} from "./google-map.types";
import { fromGoogleLatLng, toGoogleLatLngLiteral } from "./google-map.types";

type LoadState = "idle" | "loading" | "ready" | "error";

function createMarkerLabel(marker: MapMarker, color: string): GoogleMarkerLabel {
  return {
    text: String(marker.stopOrder),
    color,
    fontSize: markerRenderConfig.google.labelFontSize,
    fontWeight: markerRenderConfig.google.labelFontWeight
  };
}

function createMarkerIcon(
  googleMaps: GoogleMapsApi,
  marker: MapMarker,
  colorMode: "light" | "dark",
  markerPalette: ReturnType<typeof getMarkerPalette>,
  state: "default" | "emphasis" | "selected"
): GoogleMarkerIcon {
  const fillColor =
    state === "selected"
      ? markerPalette.selected
      : marker.status === "CANCELLED"
        ? markerPalette.muted
        : getCategoryMarkerHex(marker.categoryKey, colorMode);

  return {
    path: markerRenderConfig.google.path,
    fillColor,
    fillOpacity: 1,
    strokeColor: state === "selected" ? markerPalette.halo : markerPalette.stroke,
    strokeWeight:
      state === "selected"
        ? markerRenderConfig.google.selectedStrokeWeight
        : markerRenderConfig.google.strokeWeight,
    scale: markerRenderConfig.google.scale[state],
    anchor: new googleMaps.Point(
      markerRenderConfig.google.anchor.x,
      markerRenderConfig.google.anchor.y
    )
  };
}

function shouldUpdateViewport(map: GoogleMap, viewport: TripMapProps["viewport"]) {
  const center = map.getCenter();
  const zoom = map.getZoom();

  if (!center || typeof zoom !== "number") {
    return true;
  }

  return (
    Math.abs(center.lat() - viewport.latitude) > 0.00001 ||
    Math.abs(center.lng() - viewport.longitude) > 0.00001 ||
    Math.abs(zoom - viewport.zoom) > 0.01
  );
}

function resolveRoutePath(routeResult: TripMapProps["routeResult"], route: MapRoutePoint[]) {
  return routeResult?.points.length ? routeResult.points : route;
}

export function GoogleMapProvider({
  markers,
  route,
  activeRoute,
  routeResult,
  viewport,
  selectedMarkerId,
  hoveredMarkerId,
  focusedMarkerIds = [],
  autoFitMarkerBoundsKey,
  onViewportChange,
  onMarkerSelect,
  onMarkerHover,
  onMapClick
}: TripMapProps) {
  const locale = useLocale();
  const t = useTranslations("trip.editor.map");
  const { resolvedTheme } = useTheme();
  const colorMode = resolvedTheme === "dark" ? "dark" : "light";
  const markerPalette = getMarkerPalette(colorMode);
  const containerRef = useRef<HTMLDivElement>(null);
  const initialViewportRef = useRef(viewport);
  const googleMapsRef = useRef<GoogleMapsApi | null>(null);
  const mapRef = useRef<GoogleMap | null>(null);
  const markersRef = useRef<Map<string, GoogleMarker>>(new Map());
  const markerDataRef = useRef<Map<string, MapMarker>>(new Map());
  const lastAutoFitMarkerBoundsKeyRef = useRef<string | undefined>(undefined);
  const polylineRef = useRef<GooglePolyline | null>(null);
  const activePolylineRef = useRef<GooglePolyline | null>(null);
  const onViewportChangeRef = useRef(onViewportChange);
  const onMarkerSelectRef = useRef(onMarkerSelect);
  const onMarkerHoverRef = useRef(onMarkerHover);
  const onMapClickRef = useRef(onMapClick);
  const [loadState, setLoadState] = useState<LoadState>(
    mapConfig.googleMapsApiKey ? "loading" : "idle"
  );
  const [errorKey, setErrorKey] = useState<"missingApiKey" | "loadError">("loadError");

  const isMissingApiKey = !mapConfig.googleMapsApiKey;
  const displayLoadState = isMissingApiKey ? "error" : loadState;
  const displayErrorKey = isMissingApiKey ? "missingApiKey" : errorKey;
  const routePath = useMemo(() => resolveRoutePath(routeResult, route), [route, routeResult]);
  const focusedMarkerIdSet = useMemo(() => new Set(focusedMarkerIds), [focusedMarkerIds]);

  useEffect(() => {
    onViewportChangeRef.current = onViewportChange;
  }, [onViewportChange]);

  useEffect(() => {
    onMarkerSelectRef.current = onMarkerSelect;
  }, [onMarkerSelect]);

  useEffect(() => {
    onMarkerHoverRef.current = onMarkerHover;
  }, [onMarkerHover]);

  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    markerDataRef.current = new Map(markers.map((marker) => [marker.id, marker]));
  }, [markers]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    if (isMissingApiKey) {
      return;
    }

    let isMounted = true;
    const markerInstances = markersRef.current;

    void loadGoogleMaps({
      language: mapConfig.googleMapsLanguage || locale,
      region: mapConfig.googleMapsRegion
    })
      .then((googleMaps) => {
        if (!isMounted || !containerRef.current) {
          return;
        }

        const initialViewport = initialViewportRef.current;
        const mapOptions: GoogleMapOptions = {
          center: {
            lat: initialViewport.latitude,
            lng: initialViewport.longitude
          },
          clickableIcons: false,
          controlSize: 32,
          fullscreenControl: false,
          gestureHandling: "cooperative",
          mapTypeControl: false,
          streetViewControl: false,
          zoom: initialViewport.zoom,
          zoomControl: true
        };

        if (mapConfig.googleMapId) {
          mapOptions.mapId = mapConfig.googleMapId;
        }

        const map = new googleMaps.Map(containerRef.current, mapOptions);

        googleMapsRef.current = googleMaps;
        mapRef.current = map;
        map.addListener("idle", () => {
          const center = map.getCenter();
          const zoom = map.getZoom();

          if (!center || typeof zoom !== "number") {
            return;
          }

          onViewportChangeRef.current({
            latitude: center.lat(),
            longitude: center.lng(),
            zoom
          });
        });
        map.addListener("click", (event) => {
          if (event?.latLng) {
            onMapClickRef.current?.(fromGoogleLatLng(event.latLng));
          }
        });
        setLoadState("ready");
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setErrorKey("loadError");
        setLoadState("error");
      });

    return () => {
      isMounted = false;
      const googleMaps = googleMapsRef.current;

      if (googleMaps && mapRef.current) {
        googleMaps.event.clearInstanceListeners(mapRef.current);
      }
      markerInstances.forEach((marker) => {
        googleMaps?.event.clearInstanceListeners(marker);
        marker.setMap(null);
      });
      markerInstances.clear();
      if (polylineRef.current) {
        googleMaps?.event.clearInstanceListeners(polylineRef.current);
        polylineRef.current.setMap(null);
      }
      polylineRef.current = null;
      if (activePolylineRef.current) {
        googleMaps?.event.clearInstanceListeners(activePolylineRef.current);
        activePolylineRef.current.setMap(null);
      }
      activePolylineRef.current = null;
      mapRef.current = null;
    };
  }, [isMissingApiKey, locale]);

  useEffect(() => {
    const map = mapRef.current;

    if (loadState !== "ready" || !map || !shouldUpdateViewport(map, viewport)) {
      return;
    }

    map.setCenter({
      lat: viewport.latitude,
      lng: viewport.longitude
    });
    map.setZoom(viewport.zoom);
  }, [loadState, viewport]);

  useEffect(() => {
    const googleMaps = googleMapsRef.current;
    const map = mapRef.current;

    if (loadState !== "ready" || !googleMaps || !map) {
      return;
    }

    const activeIds = new Set(markers.map((marker) => marker.id));

    markers.forEach((marker) => {
      const isSelected = marker.id === selectedMarkerId;
      const isEmphasized = marker.id === hoveredMarkerId || focusedMarkerIdSet.has(marker.id);
      const markerState = isSelected ? "selected" : isEmphasized ? "emphasis" : "default";
      const position = {
        lat: marker.latitude,
        lng: marker.longitude
      };
      const icon = createMarkerIcon(googleMaps, marker, colorMode, markerPalette, markerState);
      const label = createMarkerLabel(marker, markerPalette.label);
      const existingMarker = markersRef.current.get(marker.id);

      if (existingMarker) {
        existingMarker.setPosition(position);
        existingMarker.setTitle(marker.label);
        existingMarker.setLabel(label);
        existingMarker.setIcon(icon);
        existingMarker.setZIndex(markerRenderConfig.google.zIndex[markerState]);
        return;
      }

      const googleMarker = new googleMaps.Marker({
        icon,
        label,
        map,
        optimized: true,
        position,
        title: marker.label,
        zIndex: markerRenderConfig.google.zIndex[markerState]
      });
      googleMarker.addListener("click", () => {
        const currentMarker = markerDataRef.current.get(marker.id);

        if (currentMarker) {
          onMarkerSelectRef.current(currentMarker);
        }
      });
      googleMarker.addListener("mouseover", () => {
        onMarkerHoverRef.current?.(markerDataRef.current.get(marker.id));
      });
      googleMarker.addListener("mouseout", () => {
        onMarkerHoverRef.current?.(undefined);
      });
      markersRef.current.set(marker.id, googleMarker);
    });

    markersRef.current.forEach((marker, markerId) => {
      if (activeIds.has(markerId)) {
        return;
      }

      googleMaps.event.clearInstanceListeners(marker);
      marker.setMap(null);
      markersRef.current.delete(markerId);
    });
  }, [
    colorMode,
    focusedMarkerIdSet,
    hoveredMarkerId,
    loadState,
    markerPalette,
    markers,
    selectedMarkerId
  ]);

  useEffect(() => {
    const googleMaps = googleMapsRef.current;
    const map = mapRef.current;

    if (
      loadState !== "ready" ||
      !googleMaps ||
      !map ||
      markers.length === 0 ||
      !autoFitMarkerBoundsKey ||
      lastAutoFitMarkerBoundsKeyRef.current === autoFitMarkerBoundsKey
    ) {
      return;
    }

    lastAutoFitMarkerBoundsKeyRef.current = autoFitMarkerBoundsKey;

    if (markers.length === 1) {
      const marker = markers[0];

      if (!marker) {
        return;
      }

      const nextViewport = {
        latitude: marker.latitude,
        longitude: marker.longitude,
        zoom: Math.max(viewport.zoom, 13)
      };

      map.setCenter({ lat: nextViewport.latitude, lng: nextViewport.longitude });
      map.setZoom(nextViewport.zoom);
      onViewportChangeRef.current(nextViewport);
      return;
    }

    const bounds = new googleMaps.LatLngBounds();
    markers.forEach((marker) => {
      bounds.extend({ lat: marker.latitude, lng: marker.longitude });
    });
    map.fitBounds(bounds);
  }, [autoFitMarkerBoundsKey, loadState, markers, viewport.zoom]);

  useEffect(() => {
    const googleMaps = googleMapsRef.current;
    const map = mapRef.current;

    if (loadState !== "ready" || !googleMaps || !map) {
      return;
    }

    if (routePath.length < 2) {
      if (polylineRef.current) {
        googleMaps.event.clearInstanceListeners(polylineRef.current);
        polylineRef.current.setMap(null);
      }
      polylineRef.current = null;
      return;
    }

    const path = routePath.map(toGoogleLatLngLiteral);
    const options = {
      clickable: true,
      geodesic: true,
      strokeColor: routeColors.default.hex,
      strokeOpacity: routeRenderConfig.default.googleOpacity,
      strokeWeight: routeRenderConfig.default.width
    };

    if (!polylineRef.current) {
      polylineRef.current = new googleMaps.Polyline({
        ...options,
        map,
        path
      });
      polylineRef.current.addListener("click", () => undefined);
      return;
    }

    polylineRef.current.setPath(path);
    polylineRef.current.setOptions(options);
  }, [loadState, routePath]);

  useEffect(() => {
    const googleMaps = googleMapsRef.current;
    const map = mapRef.current;

    if (loadState !== "ready" || !googleMaps || !map) {
      return;
    }

    if (!activeRoute || activeRoute.length < 2) {
      if (activePolylineRef.current) {
        googleMaps.event.clearInstanceListeners(activePolylineRef.current);
        activePolylineRef.current.setMap(null);
      }
      activePolylineRef.current = null;
      return;
    }

    const path = activeRoute.map(toGoogleLatLngLiteral);
    const options = {
      clickable: true,
      geodesic: true,
      strokeColor: routeColors.active.hex,
      strokeOpacity: routeRenderConfig.active.googleOpacity,
      strokeWeight: routeRenderConfig.active.width
    };

    if (!activePolylineRef.current) {
      activePolylineRef.current = new googleMaps.Polyline({
        ...options,
        map,
        path
      });
      activePolylineRef.current.addListener("click", () => undefined);
      return;
    }

    activePolylineRef.current.setPath(path);
    activePolylineRef.current.setOptions(options);
  }, [activeRoute, loadState]);

  return (
    <section
      className="relative h-[42dvh] min-h-72 max-h-[28rem] overflow-hidden rounded-md bg-muted md:h-dvh md:max-h-none md:rounded-none"
      aria-label={t("label")}
    >
      <div ref={containerRef} className="absolute inset-0" />
      {displayLoadState === "loading" ? (
        <div className="absolute inset-0 grid place-items-center bg-muted text-sm text-muted-foreground">
          {t("loading")}
        </div>
      ) : null}
      {displayLoadState === "error" ? (
        <div className="absolute inset-0 grid place-items-center bg-muted p-6 text-center text-sm text-muted-foreground">
          {t(displayErrorKey)}
        </div>
      ) : null}
      <div className="absolute bottom-3 left-3 z-30 rounded-md bg-background/90 px-2 py-1 text-xs text-muted-foreground shadow-sm">
        {t("attributionGoogle")}
      </div>
      <RouteSummary route={routeResult} />
      <div
        className={cn(
          "pointer-events-none absolute inset-0 rounded-md ring-1 ring-inset ring-border md:rounded-none",
          displayLoadState === "ready" && "ring-transparent"
        )}
        aria-hidden="true"
      />
    </section>
  );
}

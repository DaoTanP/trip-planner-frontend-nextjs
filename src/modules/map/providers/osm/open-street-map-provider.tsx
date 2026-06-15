"use client";

import { LocateFixed, Minus, Plus, Route } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RouteSummary } from "@/modules/map/components/route-summary";
import { mapConfig, resolveTileUrl } from "@/modules/map/config/map.config";
import type { MapRoutePoint, TripMapProps } from "@/modules/map/types/map.types";
import { getBoundsCenter, getPointBounds } from "@/modules/map/utils/bounds";
import { markerColorClassNames, markerRenderConfig, routeColors, routeRenderConfig } from "@/theme";
import {
  latitudeToWorldY,
  longitudeToWorldX,
  projectPoint,
  webMercatorTileSize,
  worldXToLongitude,
  worldXToTileX,
  worldYToLatitude,
  worldYToTileY
} from "@/modules/map/utils/web-mercator";

const tileRadius = 3;

function clampZoom(zoom: number) {
  return Math.min(mapConfig.maxZoom, Math.max(mapConfig.minZoom, zoom));
}

export function OpenStreetMapProvider({
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
  const t = useTranslations("trip.editor.map");
  const containerRef = useRef<HTMLDivElement>(null);
  const lastAutoFitMarkerBoundsKeyRef = useRef<string | undefined>(undefined);
  const dragStateRef = useRef<{
    moved: boolean;
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startWorldX: number;
    startWorldY: number;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const zoom = Math.round(clampZoom(viewport.zoom));
  const centerWorldX = longitudeToWorldX(viewport.longitude, zoom);
  const centerWorldY = latitudeToWorldY(viewport.latitude, zoom);
  const focusedMarkerIdSet = useMemo(() => new Set(focusedMarkerIds), [focusedMarkerIds]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) {
        return;
      }

      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height
      });
    });

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (
      !autoFitMarkerBoundsKey ||
      markers.length === 0 ||
      lastAutoFitMarkerBoundsKeyRef.current === autoFitMarkerBoundsKey
    ) {
      return;
    }

    const nextViewport = getViewportForPoints(markers);

    if (!nextViewport) {
      return;
    }

    lastAutoFitMarkerBoundsKeyRef.current = autoFitMarkerBoundsKey;
    onViewportChange(nextViewport);
  }, [autoFitMarkerBoundsKey, markers, onViewportChange]);

  const tiles = useMemo(() => {
    const centerTileX = worldXToTileX(centerWorldX);
    const centerTileY = worldYToTileY(centerWorldY);
    const tileCount = 2 ** zoom;
    const nextTiles: Array<{ key: string; x: number; y: number; left: number; top: number }> = [];

    for (let xOffset = -tileRadius; xOffset <= tileRadius; xOffset += 1) {
      for (let yOffset = -tileRadius; yOffset <= tileRadius; yOffset += 1) {
        const tileX = centerTileX + xOffset;
        const tileY = centerTileY + yOffset;

        if (tileY < 0 || tileY >= tileCount) {
          continue;
        }

        const wrappedX = ((tileX % tileCount) + tileCount) % tileCount;
        nextTiles.push({
          key: `${zoom}-${wrappedX}-${tileY}`,
          x: wrappedX,
          y: tileY,
          left: tileX * webMercatorTileSize - centerWorldX,
          top: tileY * webMercatorTileSize - centerWorldY
        });
      }
    }

    return nextTiles;
  }, [centerWorldX, centerWorldY, zoom]);

  const routePoints = useMemo(() => {
    if (size.width === 0 || size.height === 0) {
      return "";
    }

    return route
      .map((point) => {
        const projected = projectPoint(point, { ...viewport, zoom });
        return `${size.width / 2 + projected.x},${size.height / 2 + projected.y}`;
      })
      .join(" ");
  }, [route, size.height, size.width, viewport, zoom]);
  const activeRoutePoints = useMemo(() => {
    if (size.width === 0 || size.height === 0 || !activeRoute?.length) {
      return "";
    }

    return activeRoute
      .map((point) => {
        const projected = projectPoint(point, { ...viewport, zoom });
        return `${size.width / 2 + projected.x},${size.height / 2 + projected.y}`;
      })
      .join(" ");
  }, [activeRoute, size.height, size.width, viewport, zoom]);

  function handlePointerDown(event: PointerEvent<HTMLElement>) {
    const target = event.target as HTMLElement;

    if (event.button !== 0 || target.closest("button")) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      moved: false,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startWorldX: centerWorldX,
      startWorldY: centerWorldY
    };
    setIsDragging(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    const dragState = dragStateRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - dragState.startClientX;
    const deltaY = event.clientY - dragState.startClientY;
    const moved = Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3;

    dragState.moved = dragState.moved || moved;
    onViewportChange({
      latitude: worldYToLatitude(dragState.startWorldY - deltaY, zoom),
      longitude: worldXToLongitude(dragState.startWorldX - deltaX, zoom),
      zoom: viewport.zoom
    });
  }

  function handlePointerEnd(event: PointerEvent<HTMLElement>) {
    const dragState = dragStateRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    if (dragState.moved) {
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }

    dragStateRef.current = null;
    setIsDragging(false);
  }

  return (
    <section
      ref={containerRef}
      className={cn(
        "relative h-[42dvh] min-h-72 max-h-[28rem] touch-none overflow-hidden rounded-md border bg-muted md:h-[calc(100dvh-8rem)] md:max-h-none",
        isDragging ? "cursor-grabbing" : "cursor-grab"
      )}
      aria-label={t("label")}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onClick={(event) => {
        const target = event.target as HTMLElement;

        if (suppressClickRef.current) {
          suppressClickRef.current = false;
          return;
        }

        if (!onMapClick || target.closest("button")) {
          return;
        }

        const rect = event.currentTarget.getBoundingClientRect();
        const worldX = centerWorldX + event.clientX - rect.left - rect.width / 2;
        const worldY = centerWorldY + event.clientY - rect.top - rect.height / 2;

        onMapClick({
          latitude: worldYToLatitude(worldY, zoom),
          longitude: worldXToLongitude(worldX, zoom)
        });
      }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--fallback-map-grid-line)_1px,transparent_1px),linear-gradient(0deg,var(--fallback-map-grid-line)_1px,transparent_1px)] bg-[size:48px_48px]" />

      {tiles.map((tile) => (
        // OSM tiles are provider-controlled raster assets; Next Image optimization is not useful here.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={tile.key}
          alt=""
          src={resolveTileUrl({ x: tile.x, y: tile.y, z: zoom })}
          className="absolute size-64 max-w-none select-none"
          draggable={false}
          style={{
            left: `calc(50% + ${tile.left}px)`,
            top: `calc(50% + ${tile.top}px)`
          }}
        />
      ))}

      {routePoints || activeRoutePoints ? (
        <svg className="pointer-events-none absolute inset-0 size-full" aria-hidden="true">
          {routePoints ? (
            <polyline
              className="pointer-events-auto"
              points={routePoints}
              fill="none"
              stroke={routeColors.default.hex}
              strokeLinecap={routeRenderConfig.lineCap}
              strokeLinejoin={routeRenderConfig.lineJoin}
              strokeWidth={routeRenderConfig.default.width}
              strokeOpacity={routeRenderConfig.default.osmOpacity}
              pointerEvents="stroke"
              onClick={(event) => event.stopPropagation()}
            />
          ) : null}
          {activeRoutePoints ? (
            <polyline
              className="pointer-events-auto"
              points={activeRoutePoints}
              fill="none"
              stroke={routeColors.active.hex}
              strokeLinecap={routeRenderConfig.lineCap}
              strokeLinejoin={routeRenderConfig.lineJoin}
              strokeWidth={routeRenderConfig.active.width}
              strokeOpacity={routeRenderConfig.active.osmOpacity}
              pointerEvents="stroke"
              onClick={(event) => event.stopPropagation()}
            />
          ) : null}
        </svg>
      ) : null}

      {markers.map((marker) => {
        const projected = projectPoint(marker, { ...viewport, zoom });
        const isSelected = marker.id === selectedMarkerId;
        const isEmphasized = marker.id === hoveredMarkerId || focusedMarkerIdSet.has(marker.id);

        return (
          <button
            key={marker.id}
            type="button"
            className={cn(
              "absolute z-20 flex size-10 -translate-x-1/2 -translate-y-full items-center justify-center rounded-full border-2 border-background text-xs font-bold shadow-lg transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2",
              markerColorClassNames.default,
              isSelected && [
                markerRenderConfig.osm.selectedScaleClassName,
                markerColorClassNames.selected
              ],
              !isSelected &&
                isEmphasized && [
                  markerRenderConfig.osm.emphasizedScaleClassName,
                  markerColorClassNames.hover
                ]
            )}
            style={{
              left: `calc(50% + ${projected.x}px)`,
              top: `calc(50% + ${projected.y}px)`
            }}
            aria-label={t("marker", { name: marker.label })}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => onMarkerSelect(marker)}
            onMouseEnter={() => onMarkerHover?.(marker)}
            onMouseLeave={() => onMarkerHover?.(undefined)}
          >
            {marker.stopOrder}
          </button>
        );
      })}

      <div className="absolute right-4 top-4 z-30 grid gap-2">
        <Button
          type="button"
          size="icon"
          variant="secondary"
          aria-label={t("zoomIn")}
          onClick={() => onViewportChange({ ...viewport, zoom: clampZoom(viewport.zoom + 1) })}
        >
          <Plus aria-hidden="true" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          aria-label={t("zoomOut")}
          onClick={() => onViewportChange({ ...viewport, zoom: clampZoom(viewport.zoom - 1) })}
        >
          <Minus aria-hidden="true" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          aria-label={t("fitRoute")}
          disabled={(activeRoute?.length ?? route.length) < 2}
          onClick={() => {
            const nextViewport = getViewportForPoints(activeRoute?.length ? activeRoute : route);
            if (!nextViewport) {
              return;
            }

            onViewportChange(nextViewport);
          }}
        >
          <Route aria-hidden="true" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          aria-label={t("fit")}
          disabled={markers.length === 0}
          onClick={() => {
            const nextViewport = getViewportForPoints(markers);
            if (!nextViewport) {
              return;
            }

            onViewportChange(nextViewport);
          }}
        >
          <LocateFixed aria-hidden="true" />
        </Button>
      </div>

      <div className="absolute bottom-3 left-3 z-30 rounded-md bg-background/90 px-2 py-1 text-xs text-muted-foreground shadow-sm">
        {t("attributionOsm")}
      </div>
      <RouteSummary route={routeResult} />
    </section>
  );
}

function getViewportForPoints(points: MapRoutePoint[]) {
  const bounds = getPointBounds(points);

  if (!bounds) {
    return null;
  }

  const center = getBoundsCenter(bounds);
  const span = Math.max(Math.abs(bounds.north - bounds.south), Math.abs(bounds.east - bounds.west));

  return {
    latitude: center.latitude,
    longitude: center.longitude,
    zoom: getZoomForSpan(span)
  };
}

function getZoomForSpan(span: number) {
  if (span > 30) return 3;
  if (span > 10) return 5;
  if (span > 3) return 7;
  if (span > 1) return 9;
  if (span > 0.3) return 11;

  return 13;
}

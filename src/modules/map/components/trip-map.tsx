"use client";

import { LocateFixed, Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { mapConfig, resolveTileUrl } from "@/modules/map/config/map.config";
import type { MapMarker, TripMapProps } from "@/modules/map/types/map.types";
import {
  latitudeToWorldY,
  longitudeToWorldX,
  projectPoint,
  webMercatorTileSize,
  worldXToTileX,
  worldYToTileY
} from "@/modules/map/utils/web-mercator";

const tileRadius = 3;

function clampZoom(zoom: number) {
  return Math.min(mapConfig.maxZoom, Math.max(mapConfig.minZoom, zoom));
}

function markerInitials(marker: MapMarker) {
  return marker.label
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function TripMap({
  markers,
  route,
  viewport,
  selectedMarkerId,
  hoveredMarkerId,
  onViewportChange,
  onMarkerSelect
}: TripMapProps) {
  const t = useTranslations("trip.editor.map");
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const zoom = Math.round(clampZoom(viewport.zoom));
  const centerWorldX = longitudeToWorldX(viewport.longitude, zoom);
  const centerWorldY = latitudeToWorldY(viewport.latitude, zoom);

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

  return (
    <section
      ref={containerRef}
      className="relative min-h-[26rem] overflow-hidden rounded-md border bg-muted md:min-h-[calc(100dvh-8rem)]"
      aria-label={t("label")}
    >
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,.08)_1px,transparent_1px),linear-gradient(0deg,rgba(15,23,42,.08)_1px,transparent_1px)] bg-[size:48px_48px]" />

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

      {routePoints ? (
        <svg className="pointer-events-none absolute inset-0 size-full" aria-hidden="true">
          <polyline
            points={routePoints}
            fill="none"
            stroke="rgb(37 99 235)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="5"
            strokeOpacity="0.72"
          />
        </svg>
      ) : null}

      {markers.map((marker, index) => {
        const projected = projectPoint(marker, { ...viewport, zoom });
        const isActive = marker.id === selectedMarkerId;
        const isHovered = marker.id === hoveredMarkerId;

        return (
          <button
            key={marker.id}
            type="button"
            className={cn(
              "absolute z-20 flex size-10 -translate-x-1/2 -translate-y-full items-center justify-center rounded-full border-2 border-background bg-primary text-xs font-bold text-primary-foreground shadow-lg transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2",
              (isActive || isHovered) && "scale-110 bg-accent text-accent-foreground"
            )}
            style={{
              left: `calc(50% + ${projected.x}px)`,
              top: `calc(50% + ${projected.y}px)`
            }}
            aria-label={t("marker", { name: marker.label })}
            onClick={() => onMarkerSelect(marker)}
          >
            {markerInitials(marker) || index + 1}
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
          aria-label={t("fit")}
          onClick={() => {
            const firstMarker = markers[0];
            if (!firstMarker) {
              return;
            }
            onViewportChange({
              latitude: firstMarker.latitude,
              longitude: firstMarker.longitude,
              zoom: viewport.zoom
            });
          }}
        >
          <LocateFixed aria-hidden="true" />
        </Button>
      </div>

      <div className="absolute bottom-3 left-3 z-30 rounded-md bg-background/90 px-2 py-1 text-xs text-muted-foreground shadow-sm">
        {t("attribution")}
      </div>
    </section>
  );
}

import type { MapBounds, MapRoutePoint, MapViewport } from "@/modules/map/types/map.types";

export function getPointBounds(points: MapRoutePoint[]): MapBounds | undefined {
  if (points.length === 0) {
    return undefined;
  }

  return points.reduce<MapBounds>(
    (bounds, point) => ({
      north: Math.max(bounds.north, point.latitude),
      south: Math.min(bounds.south, point.latitude),
      east: Math.max(bounds.east, point.longitude),
      west: Math.min(bounds.west, point.longitude)
    }),
    {
      north: points[0]?.latitude ?? 0,
      south: points[0]?.latitude ?? 0,
      east: points[0]?.longitude ?? 0,
      west: points[0]?.longitude ?? 0
    }
  );
}

export function getBoundsCenter(bounds: MapBounds): MapRoutePoint {
  return {
    latitude: (bounds.north + bounds.south) / 2,
    longitude: (bounds.east + bounds.west) / 2
  };
}

export function toLngLatBounds(bounds: MapBounds) {
  return [
    [bounds.west, bounds.south],
    [bounds.east, bounds.north]
  ] as [[number, number], [number, number]];
}

export function getViewportForPoints(points: MapRoutePoint[]): MapViewport | undefined {
  const bounds = getPointBounds(points);

  if (!bounds) {
    return undefined;
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

import type { MapBounds, MapRoutePoint } from "@/modules/map/types/map.types";

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

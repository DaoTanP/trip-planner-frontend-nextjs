import type {
  ItineraryItem,
  ReorderItineraryItemsPayload
} from "@/modules/itinerary/types/itinerary.types";
import type { MapMarker, MapRoutePoint } from "@/modules/map/types/map.types";
import type { PlaceDto, RouteSegmentDto } from "@/services/api/contracts";

export const orderStride = 65_536;

export function getItemMarkerId(item: ItineraryItem) {
  return `item:${item.id}`;
}

export function getPlaceMap(places: PlaceDto[]) {
  return new Map(places.map((place) => [place.id, place]));
}

export function getItineraryMapMarkers(items: ItineraryItem[], places: PlaceDto[]): MapMarker[] {
  const placeMap = getPlaceMap(places);
  const markers: MapMarker[] = [];

  for (const item of [...items].sort((left, right) =>
    left.sortOrder === right.sortOrder
      ? left.id.localeCompare(right.id)
      : left.sortOrder - right.sortOrder
  )) {
    const place = item.placeId ? placeMap.get(item.placeId) : undefined;

    if (typeof place?.latitude !== "number" || typeof place.longitude !== "number") {
      continue;
    }

    markers.push({
      id: getItemMarkerId(item),
      itemId: item.id,
      placeId: place.id,
      label: place.name || item.title,
      latitude: place.latitude,
      longitude: place.longitude
    });
  }

  return markers;
}

export function getItineraryRoute(items: ItineraryItem[], places: PlaceDto[]): MapRoutePoint[] {
  return getItineraryMapMarkers(items, places).map((marker) => ({
    latitude: marker.latitude,
    longitude: marker.longitude
  }));
}

export function reorderItinerarySequence(items: ItineraryItem[], activeId: string, overId: string) {
  const activeIndex = items.findIndex((item) => item.id === activeId);
  const overIndex = items.findIndex((item) => item.id === overId);

  if (activeIndex < 0 || overIndex < 0) {
    return items;
  }

  const nextItems = [...items];
  const [activeItem] = nextItems.splice(activeIndex, 1);

  if (!activeItem) {
    return items;
  }

  nextItems.splice(overIndex, 0, activeItem);

  return nextItems;
}

function getOptimisticSortOrder(
  previousItem: ItineraryItem | undefined,
  nextItem: ItineraryItem | undefined,
  fallbackIndex: number
) {
  const lowerSortOrder = previousItem?.sortOrder ?? 0;
  const upperSortOrder = nextItem?.sortOrder ?? lowerSortOrder + orderStride * 2;

  return upperSortOrder - lowerSortOrder > 1
    ? lowerSortOrder + Math.floor((upperSortOrder - lowerSortOrder) / 2)
    : (fallbackIndex + 1) * orderStride;
}

export function buildItineraryReorderIntent(
  items: ItineraryItem[],
  activeId: string,
  overId: string,
  clientMutationId: string
): {
  optimisticItems: ItineraryItem[];
  payload: ReorderItineraryItemsPayload;
} | null {
  const nextItems = reorderItinerarySequence(items, activeId, overId);
  const movedIndex = nextItems.findIndex((item) => item.id === activeId);
  const movedItem = nextItems[movedIndex];

  if (!movedItem) {
    return null;
  }

  const previousItem = nextItems[movedIndex - 1];
  const nextItem = nextItems[movedIndex + 1];
  const optimisticSortOrder = getOptimisticSortOrder(previousItem, nextItem, movedIndex);

  return {
    optimisticItems: nextItems.map((item) =>
      item.id === movedItem.id ? { ...item, sortOrder: optimisticSortOrder } : item
    ),
    payload: {
      itemId: movedItem.id,
      beforeItemId: nextItem?.id ?? null,
      afterItemId: previousItem?.id ?? null,
      expectedVersion: movedItem.version,
      clientMutationId
    }
  };
}

export function getCachedRoutePoints(
  items: ItineraryItem[],
  routeSegments: RouteSegmentDto[],
  decode: (polyline: string) => MapRoutePoint[]
) {
  const segmentById = new Map(routeSegments.map((segment) => [segment.id, segment]));

  return [...items]
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .flatMap((item) => {
      const segment = item.routeSegmentId ? segmentById.get(item.routeSegmentId) : undefined;

      return segment ? decode(segment.polyline) : [];
    });
}

export function getItemRoutePoints(
  itemId: string | undefined,
  items: ItineraryItem[],
  routeSegments: RouteSegmentDto[],
  decode: (polyline: string) => MapRoutePoint[]
) {
  if (!itemId) {
    return [];
  }

  const item = items.find((candidate) => candidate.id === itemId);
  const segment = item?.routeSegmentId
    ? routeSegments.find((candidate) => candidate.id === item.routeSegmentId)
    : undefined;

  return segment ? decode(segment.polyline) : [];
}

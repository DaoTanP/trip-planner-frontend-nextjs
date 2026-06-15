import type {
  ItineraryItem,
  ReorderItineraryItemsPayload
} from "@/modules/itinerary/types/itinerary.types";
import type {
  DerivedRouteLeg,
  MapMarker,
  MapRoute,
  MapRoutePoint,
  MapTravelMode
} from "@/modules/map/types/map.types";
import type { PlaceDto } from "@/services/api/contracts";

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
  const orderedItems = [...items].sort((left, right) =>
    left.sortOrder === right.sortOrder
      ? left.id.localeCompare(right.id)
      : left.sortOrder - right.sortOrder
  );

  orderedItems.forEach((item, index) => {
    const place = placeMap.get(item.placeId);

    if (typeof place?.latitude !== "number" || typeof place.longitude !== "number") {
      return;
    }

    markers.push({
      id: getItemMarkerId(item),
      stopId: item.id,
      stopOrder: index + 1,
      itemId: item.id,
      placeId: place.id,
      label: place.name,
      latitude: place.latitude,
      longitude: place.longitude
    });
  });

  return markers;
}

export function getProviderRouteRequestPoints(markers: MapMarker[]): MapRoutePoint[] {
  return markers.map((marker) => ({
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

export function buildDerivedRouteLegs(
  items: ItineraryItem[],
  places: PlaceDto[],
  route?: MapRoute | undefined,
  travelMode: MapTravelMode = "driving"
): DerivedRouteLeg[] {
  const markers = getItineraryMapMarkers(items, places);

  return markers.slice(1).flatMap((marker, index) => {
    const previousMarker = markers[index];

    if (!previousMarker?.itemId || !previousMarker.placeId || !marker.itemId || !marker.placeId) {
      return [];
    }

    const routeLeg = route?.legs[index];

    return [
      {
        id: `leg:${previousMarker.itemId}:${marker.itemId}`,
        fromItemId: previousMarker.itemId,
        toItemId: marker.itemId,
        fromPlaceId: previousMarker.placeId,
        toPlaceId: marker.placeId,
        travelMode,
        ...(routeLeg?.distanceMeters !== undefined
          ? { distanceMeters: routeLeg.distanceMeters ?? undefined }
          : {}),
        ...(routeLeg?.durationSeconds !== undefined
          ? { durationSeconds: routeLeg.durationSeconds ?? undefined }
          : {}),
        ...(routeLeg?.points?.length
          ? {
              geometry: {
                type: "LineString" as const,
                coordinates: routeLeg.points.map(
                  (point) => [point.longitude, point.latitude] as [number, number]
                )
              }
            }
          : {})
      }
    ];
  });
}

export function getAdjacentRouteLegIds(itemId: string | undefined, routeLegs: DerivedRouteLeg[]) {
  if (!itemId) {
    return [];
  }

  return Array.from(
    new Set(
      routeLegs
        .filter((leg) => leg.fromItemId === itemId || leg.toItemId === itemId)
        .map((leg) => leg.id)
    )
  );
}

export function getRouteLegAdjacentItemIds(
  routeLegId: string | undefined,
  legs: DerivedRouteLeg[]
) {
  if (!routeLegId) {
    return [];
  }

  const leg = legs.find((candidate) => candidate.id === routeLegId);

  return leg ? [leg.fromItemId, leg.toItemId] : [];
}

export function getRouteLegPoints(
  routeLegIds: string[],
  routeLegs: DerivedRouteLeg[],
  markers: MapMarker[]
) {
  const routeLegIdSet = new Set(routeLegIds);
  const markerByItemId = new Map(
    markers
      .filter((marker): marker is MapMarker & { itemId: string } => Boolean(marker.itemId))
      .map((marker) => [marker.itemId, marker])
  );

  return routeLegs.flatMap((leg) => {
    if (!routeLegIdSet.has(leg.id)) {
      return [];
    }

    if (leg.geometry?.coordinates.length) {
      return leg.geometry.coordinates.map(([longitude, latitude]) => ({ latitude, longitude }));
    }

    const fromMarker = markerByItemId.get(leg.fromItemId);
    const toMarker = markerByItemId.get(leg.toItemId);

    return fromMarker && toMarker
      ? [
          { latitude: fromMarker.latitude, longitude: fromMarker.longitude },
          { latitude: toMarker.latitude, longitude: toMarker.longitude }
        ]
      : [];
  });
}

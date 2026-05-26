import type { ItineraryItem } from "@/modules/itinerary/types/itinerary.types";
import type { MapMarker, MapRoutePoint } from "@/modules/map/types/map.types";
import type { PlaceDto } from "@/services/api/contracts";

export const orderStride = 1024;

export function getItemMarkerId(item: ItineraryItem) {
  return `item:${item.id}`;
}

export function getPlaceMap(places: PlaceDto[]) {
  return new Map(places.map((place) => [place.id, place]));
}

export function getItineraryMapMarkers(items: ItineraryItem[], places: PlaceDto[]): MapMarker[] {
  const placeMap = getPlaceMap(places);
  const markers: MapMarker[] = [];

  for (const item of items) {
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

  return nextItems.map((item, index) => ({
    ...item,
    sortOrder: (index + 1) * orderStride
  }));
}

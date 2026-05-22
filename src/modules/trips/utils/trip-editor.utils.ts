import type { MapMarker, MapRoutePoint } from "@/modules/map/types/map.types";

import type { ItineraryItem, TripDay, TripDetail } from "../types/trip.types";

export const orderStride = 1024;

export function getItemMarkerId(item: ItineraryItem) {
  return `item:${item.id}`;
}

export function getTripMapMarkers(trip: TripDetail): MapMarker[] {
  return trip.days.flatMap((day) =>
    day.items
      .filter(
        (item) =>
          typeof item.place?.latitude === "number" && typeof item.place?.longitude === "number"
      )
      .map((item) => ({
        id: getItemMarkerId(item),
        itemId: item.id,
        placeId: item.placeId ?? undefined,
        label: item.place?.name ?? item.title,
        latitude: item.place?.latitude ?? 0,
        longitude: item.place?.longitude ?? 0
      }))
  );
}

export function getTripRoute(trip: TripDetail): MapRoutePoint[] {
  return getTripMapMarkers(trip).map((marker) => ({
    latitude: marker.latitude,
    longitude: marker.longitude
  }));
}

export function reorderDays(days: TripDay[], activeDayId: string, overDayId: string) {
  const activeIndex = days.findIndex((day) => day.id === activeDayId);
  const overIndex = days.findIndex((day) => day.id === overDayId);

  if (activeIndex < 0 || overIndex < 0) {
    return days;
  }

  const nextDays = [...days];
  const [activeDay] = nextDays.splice(activeIndex, 1);

  if (!activeDay) {
    return days;
  }

  nextDays.splice(overIndex, 0, activeDay);

  return nextDays.map((day, index) => ({ ...day, order: (index + 1) * orderStride }));
}

export function reorderItemsWithinDay(
  days: TripDay[],
  dayId: string,
  activeId: string,
  overId: string
) {
  return days.map((day) => {
    if (day.id !== dayId) {
      return day;
    }

    const activeIndex = day.items.findIndex((item) => item.id === activeId);
    const overIndex = day.items.findIndex((item) => item.id === overId);

    if (activeIndex < 0 || overIndex < 0) {
      return day;
    }

    const nextItems = [...day.items];
    const [activeItem] = nextItems.splice(activeIndex, 1);

    if (!activeItem) {
      return day;
    }

    nextItems.splice(overIndex, 0, activeItem);

    return {
      ...day,
      items: nextItems.map((item, index) => ({
        ...item,
        order: (index + 1) * orderStride
      }))
    };
  });
}

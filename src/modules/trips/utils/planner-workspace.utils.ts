import type {
  ItineraryItemStatusDto,
  ItineraryItemTypeDto,
  TripExpensesDto
} from "@/services/api/contracts";
import type { ItineraryItem } from "@/modules/itinerary/types/itinerary.types";
import type { SyncMutationQueueEntry, SyncMutationState } from "@/modules/sync/types/sync.types";
import type { PlaceDto, RouteSegmentDto } from "@/services/api/contracts";
import type { PlannerFilters } from "@/stores/use-planner-store";

import { getPlaceMap } from "./trip-editor.utils";

export type PlannerStats = {
  itineraryCount: number;
  placeCount: number;
  routeCount: number;
  totalRouteDistanceMeters: number;
  totalRouteDurationSeconds: number;
  noteCount: number;
  expenseCount: number;
  totalExpenses: number;
  expenseCurrency: string | null;
  derivedStartDate: string | null;
  derivedEndDate: string | null;
};

export type RouteSummaryByItem = Map<
  string,
  {
    id: string;
    travelMode: string;
    distanceMeters: number | null;
    durationSeconds: number | null;
  }
>;

export type ItemSyncState = Extract<
  SyncMutationState,
  "queued" | "sending" | "failed" | "retrying" | "conflicted"
>;

const nonFinalSyncStates = new Set<SyncMutationState>([
  "queued",
  "sending",
  "failed",
  "retrying",
  "conflicted"
]);

export function sortTimelineItems(items: ItineraryItem[]) {
  return [...items].sort((left, right) =>
    left.sortOrder === right.sortOrder
      ? left.id.localeCompare(right.id)
      : left.sortOrder - right.sortOrder
  );
}

export function filterTimelineItems(
  items: ItineraryItem[],
  places: PlaceDto[],
  filters: PlannerFilters
) {
  const placeMap = getPlaceMap(places);
  const normalizedQuery = filters.query.trim().toLowerCase();

  return sortTimelineItems(items).filter((item) => {
    if (filters.type !== "ALL" && item.type !== filters.type) {
      return false;
    }
    if (filters.status !== "ALL" && item.status !== filters.status) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const place = item.placeId ? placeMap.get(item.placeId) : undefined;
    const haystack = [
      item.title,
      item.description,
      item.type,
      item.status,
      item.timezone,
      place?.name,
      place?.formattedAddress,
      place?.countryCode
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

export function buildPlannerStats({
  tripNoteCount,
  items,
  places,
  routeSegments,
  expenses
}: {
  tripNoteCount: number;
  items: ItineraryItem[];
  places: PlaceDto[];
  routeSegments: RouteSegmentDto[];
  expenses?: TripExpensesDto | undefined;
}): PlannerStats {
  const totalRouteDistanceMeters = routeSegments.reduce(
    (total, route) => total + (route.distanceMeters ?? 0),
    0
  );
  const totalRouteDurationSeconds = routeSegments.reduce(
    (total, route) => total + (route.durationSeconds ?? 0),
    0
  );
  const expenseItems = expenses?.expenses ?? [];
  const currency = expenseItems.find((expense) => expense.currency)?.currency ?? null;
  const totalExpenses = expenseItems.reduce((total, expense) => total + expense.amount, 0);
  const itemNoteCount = items.reduce(
    (total, item) => total + (getItemMetadataNumber(item, "noteCount") ?? 0),
    0
  );
  const itemDates = items
    .flatMap((item) => [item.startTime, item.endTime])
    .filter((value): value is string => Boolean(value))
    .sort();

  return {
    itineraryCount: items.length,
    placeCount: places.length,
    routeCount: routeSegments.length,
    totalRouteDistanceMeters,
    totalRouteDurationSeconds,
    noteCount: tripNoteCount + itemNoteCount,
    expenseCount: expenseItems.length,
    totalExpenses,
    expenseCurrency: currency,
    derivedStartDate: itemDates[0] ?? null,
    derivedEndDate: itemDates[itemDates.length - 1] ?? null
  };
}

export function buildRouteSummaryByItem(
  items: ItineraryItem[],
  routeSegments: RouteSegmentDto[]
): RouteSummaryByItem {
  const segmentById = new Map(routeSegments.map((segment) => [segment.id, segment]));

  return new Map(
    items.flatMap((item) => {
      const route = item.routeSegmentId ? segmentById.get(item.routeSegmentId) : undefined;

      return route
        ? [
            [
              item.id,
              {
                id: route.id,
                travelMode: route.travelMode,
                distanceMeters: route.distanceMeters,
                durationSeconds: route.durationSeconds
              }
            ] as const
          ]
        : [];
    })
  );
}

export function buildItemSyncStateMap(
  entries: SyncMutationQueueEntry[],
  tripId: string
): Map<string, ItemSyncState> {
  const stateById = new Map<string, ItemSyncState>();

  entries.forEach((entry) => {
    if (
      entry.tripId !== tripId ||
      entry.entityType !== "ITINERARY_ITEM" ||
      !entry.entityId ||
      !nonFinalSyncStates.has(entry.state)
    ) {
      return;
    }

    stateById.set(entry.entityId, entry.state as ItemSyncState);
  });

  return stateById;
}

export function getItemMetadataList(item: ItineraryItem, key: string) {
  const metadata = asRecord(item.metadata);
  const value = metadata?.[key];

  return Array.isArray(value)
    ? value.filter((candidate): candidate is string => typeof candidate === "string").slice(0, 3)
    : [];
}

export function getItemMetadataString(item: ItineraryItem, key: string) {
  const metadata = asRecord(item.metadata);
  const value = metadata?.[key];

  return typeof value === "string" ? value : null;
}

export function getItemMetadataNumber(item: ItineraryItem, key: string) {
  const metadata = asRecord(item.metadata);
  const value = metadata?.[key];

  return typeof value === "number" ? value : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export const itineraryItemTypes: ItineraryItemTypeDto[] = [
  "ACTIVITY",
  "PLACE",
  "LODGING",
  "TRANSPORT",
  "FOOD",
  "NOTE",
  "TASK",
  "CUSTOM"
];

export const itineraryItemStatuses: ItineraryItemStatusDto[] = [
  "PLANNED",
  "BOOKED",
  "COMPLETED",
  "CANCELLED"
];

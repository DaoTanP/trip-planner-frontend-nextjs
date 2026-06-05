import type {
  BudgetSummaryDto,
  ItineraryItemStatusDto,
  ItineraryItemTypeDto,
  PlaceDto,
  TripExpensesDto
} from "@/services/api/contracts";
import type { ItineraryItem } from "@/modules/itinerary/types/itinerary.types";
import type { DerivedRouteLeg, MapRoute } from "@/modules/map/types/map.types";
import type { SyncMutationQueueEntry, SyncMutationState } from "@/modules/sync/types/sync.types";
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
  budgetLimit: number | null;
  remainingBudget: number | null;
  budgetUsagePercentage: number | null;
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
    if (filters.type !== "ALL" && !item.types.includes(filters.type as ItineraryItemTypeDto)) {
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
      item.summary,
      item.types.join(" "),
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
  tripExpenseCount,
  items,
  places,
  route,
  routeLegs,
  expenses,
  budgetSummary
}: {
  tripNoteCount: number;
  tripExpenseCount?: number | undefined;
  items: ItineraryItem[];
  places: PlaceDto[];
  route?: MapRoute | undefined;
  routeLegs: DerivedRouteLeg[];
  expenses?: TripExpensesDto | undefined;
  budgetSummary?: BudgetSummaryDto | undefined;
}): PlannerStats {
  const totalRouteDistanceMeters =
    route?.distanceMeters ??
    routeLegs.reduce((total, routeLeg) => total + (routeLeg.distanceMeters ?? 0), 0);
  const totalRouteDurationSeconds =
    route?.durationSeconds ??
    routeLegs.reduce((total, routeLeg) => total + (routeLeg.durationSeconds ?? 0), 0);
  const summary = budgetSummary ?? expenses?.summary;
  const expenseItems = expenses?.expenses ?? [];
  const itemNoteCount = items.reduce(
    (total, item) => total + (getItemMetadataNumber(item, "noteCount") ?? 0),
    0
  );
  const itemDates = items
    .flatMap((item) => getItemDateBounds(item))
    .filter((value): value is string => Boolean(value))
    .sort();

  return {
    itineraryCount: items.length,
    placeCount: places.length,
    routeCount: routeLegs.length,
    totalRouteDistanceMeters,
    totalRouteDurationSeconds,
    noteCount: tripNoteCount + itemNoteCount,
    expenseCount: tripExpenseCount ?? expenseItems.length,
    totalExpenses:
      summary?.spentAmount ?? expenseItems.reduce((total, expense) => total + expense.amount, 0),
    expenseCurrency:
      summary?.currency ?? expenseItems.find((expense) => expense.currency)?.currency ?? null,
    derivedStartDate: itemDates[0] ?? null,
    derivedEndDate: itemDates[itemDates.length - 1] ?? null,
    budgetLimit: summary?.budgetLimit ?? null,
    remainingBudget: summary?.remainingAmount ?? null,
    budgetUsagePercentage: summary?.usagePercentage ?? null
  };
}

export function buildRouteSummaryByItem(routeLegs: DerivedRouteLeg[]): RouteSummaryByItem {
  return new Map(
    routeLegs.map((routeLeg) => [
      routeLeg.toItemId,
      {
        id: routeLeg.id,
        travelMode: "route",
        distanceMeters: routeLeg.distanceMeters ?? null,
        durationSeconds: routeLeg.durationSeconds ?? null
      }
    ])
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
  "LODGING",
  "FOOD",
  "SHOPPING",
  "TRANSPORTATION",
  "OTHER"
];

export const itineraryItemStatuses: ItineraryItemStatusDto[] = [
  "PLANNED",
  "BOOKED",
  "COMPLETED",
  "CANCELLED"
];

function getItemDateBounds(item: ItineraryItem) {
  if (!item.startsAt) {
    return [];
  }

  const start = new Date(item.startsAt);
  const bounds = [start.toISOString()];

  if (item.durationMinutes !== null) {
    bounds.push(new Date(start.getTime() + item.durationMinutes * 60_000).toISOString());
  }

  return bounds;
}

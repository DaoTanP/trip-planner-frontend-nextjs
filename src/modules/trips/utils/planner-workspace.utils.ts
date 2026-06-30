import type {
  BudgetSummaryDto,
  ItineraryItemStatusDto,
  ItineraryItemTypeDto,
  PlaceDto,
  TripExpensesDto
} from "@/services/api/contracts";
import type { ItineraryItem } from "@/modules/itinerary/types/itinerary.types";
import type { DerivedRouteLeg, MapRoute, MapTravelMode } from "@/modules/map/types/map.types";
import type { SyncMutationQueueEntry, SyncMutationState } from "@/modules/sync/types/sync.types";
import type { PlannerFilters } from "@/stores/use-planner-store";

import { getPlaceMap } from "./trip-editor.utils";

export type PlannerStats = {
  itineraryCount: number;
  placeCount: number;
  routeCount: number;
  totalRouteDistanceMeters: number;
  totalRouteDurationSeconds: number;
  timingIssueCount: number;
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

export type ScheduleOverlapIssue = {
  firstItem: ItineraryItem;
  secondItem: ItineraryItem;
  firstSequence: number;
  secondSequence: number;
};

export type RouteSummaryByItem = Map<
  string,
  {
    id: string;
    travelMode: MapTravelMode;
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

export function sortStopSequence(items: ItineraryItem[]) {
  return [...items].sort((left, right) =>
    left.sortOrder === right.sortOrder
      ? left.id.localeCompare(right.id)
      : left.sortOrder - right.sortOrder
  );
}

export function filterStopSequence(
  items: ItineraryItem[],
  places: PlaceDto[],
  filters: PlannerFilters
) {
  const placeMap = getPlaceMap(places);
  const normalizedQuery = filters.query.trim().toLowerCase();

  return sortStopSequence(items).filter((item) => {
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

export function getScheduleOverlapIssue(items: ItineraryItem[]): ScheduleOverlapIssue | null {
  return getScheduleOverlapIssues(items)[0] ?? null;
}

export function countScheduleOverlapIssues(items: ItineraryItem[]) {
  return getScheduleOverlapIssues(items).length;
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
    timingIssueCount: countScheduleOverlapIssues(items),
    noteCount: tripNoteCount,
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

export function getScheduleOverlapIssues(items: ItineraryItem[]) {
  const orderedItems = sortStopSequence(items);
  const issues: ScheduleOverlapIssue[] = [];

  for (let index = 0; index < orderedItems.length - 1; index += 1) {
    const firstItem = orderedItems[index];
    const secondItem = orderedItems[index + 1];

    if (!firstItem || !secondItem || firstItem.durationMinutes === null) {
      continue;
    }

    const firstStartTime = getScheduleTime(firstItem.startsAt);
    const secondStartTime = getScheduleTime(secondItem.startsAt);

    if (firstStartTime === null || secondStartTime === null) {
      continue;
    }

    const firstEndTime = firstStartTime + Math.max(0, firstItem.durationMinutes) * 60_000;

    if (firstEndTime > secondStartTime) {
      issues.push({
        firstItem,
        secondItem,
        firstSequence: index + 1,
        secondSequence: index + 2
      });
    }
  }

  return issues;
}

export function buildRouteSummaryByItem(routeLegs: DerivedRouteLeg[]): RouteSummaryByItem {
  return new Map(
    routeLegs.map((routeLeg) => [
      routeLeg.toItemId,
      {
        id: routeLeg.id,
        travelMode: routeLeg.travelMode,
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

function getScheduleTime(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const time = new Date(value).getTime();

  return Number.isNaN(time) ? null : time;
}

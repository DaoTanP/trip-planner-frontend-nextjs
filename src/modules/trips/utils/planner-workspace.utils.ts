import type {
  ItineraryItemStatusDto,
  ItineraryItemTypeDto,
  TripExpensesDto
} from "@/services/api/contracts";
import type { ItineraryItem } from "@/modules/itinerary/types/itinerary.types";
import type { SyncMutationQueueEntry, SyncMutationState } from "@/modules/sync/types/sync.types";
import type { PlaceDto, RouteSegmentDto, TripCollaboratorDto } from "@/services/api/contracts";
import type {
  PlannerFilters,
  PlannerGroupingMode
} from "@/stores/use-planner-store";

import { getItemMarkerId, getPlaceMap } from "./trip-editor.utils";

export type TimelineGroup = {
  id: string;
  key: string;
  mode: PlannerGroupingMode;
  label?: string | undefined;
  fallbackKey?: "unscheduled" | "unknownCity" | undefined;
  itemCount: number;
};

export type TimelineRow =
  | {
      id: string;
      type: "group";
      group: TimelineGroup;
    }
  | {
      id: string;
      type: "item";
      groupId: string;
      item: ItineraryItem;
    };

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

export type PlannerInsightKind =
  | "missingRoutes"
  | "overlap"
  | "impossibleTravel"
  | "emptyDays"
  | "longIdle"
  | "budget";

export type PlannerInsightSeverity = "info" | "warning" | "critical";

export type PlannerInsight = {
  id: string;
  kind: PlannerInsightKind;
  severity: PlannerInsightSeverity;
  count: number;
  itemId?: string | undefined;
  minutes?: number | undefined;
  amount?: number | undefined;
  currency?: string | undefined;
};

export type CollaboratorPresence = {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: TripCollaboratorDto["role"];
  acceptedAt: string | null;
};

export type RouteSummaryByItem = Map<
  string,
  {
    travelMode: string;
    distanceMeters: number | null;
    durationSeconds: number | null;
  }
>;

export type ItemSyncState = Extract<SyncMutationState, "queued" | "sending" | "failed" | "retrying" | "conflicted">;

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

export function buildTimelineRows(
  items: ItineraryItem[],
  places: PlaceDto[],
  groupingMode: PlannerGroupingMode,
  locale: string,
  fallbackTimezone: string
): TimelineRow[] {
  if (groupingMode === "flat") {
    return items.map((item) => ({
      id: `item:${item.id}`,
      type: "item",
      groupId: "flat",
      item
    }));
  }

  const groups = new Map<string, { group: TimelineGroup; items: ItineraryItem[] }>();
  const placeMap = getPlaceMap(places);

  items.forEach((item) => {
    const group = getTimelineGroup(item, placeMap.get(item.placeId ?? ""), groupingMode, locale, fallbackTimezone);
    const current = groups.get(group.id);

    if (current) {
      current.items.push(item);
      current.group.itemCount += 1;
      return;
    }

    groups.set(group.id, { group: { ...group, itemCount: 1 }, items: [item] });
  });

  return Array.from(groups.values()).flatMap(({ group, items: groupItems }) => [
    {
      id: `group:${group.id}`,
      type: "group" as const,
      group
    },
    ...groupItems.map((item) => ({
      id: `item:${item.id}`,
      type: "item" as const,
      groupId: group.id,
      item
    }))
  ]);
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
    noteCount: tripNoteCount,
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

export function buildCollaboratorPresence(
  collaborators: TripCollaboratorDto[] | undefined
): CollaboratorPresence[] {
  return (collaborators ?? [])
    .filter((collaborator) => collaborator.deletedAt === null)
    .slice(0, 5)
    .map((collaborator) => ({
      id: collaborator.id,
      name: collaborator.user?.name ?? collaborator.role,
      avatarUrl: collaborator.user?.avatarUrl ?? null,
      role: collaborator.role,
      acceptedAt: collaborator.acceptedAt
    }));
}

export function buildPlannerInsights({
  items,
  places,
  routeSegments,
  expenses
}: {
  items: ItineraryItem[];
  places: PlaceDto[];
  routeSegments: RouteSegmentDto[];
  expenses?: TripExpensesDto | undefined;
}): PlannerInsight[] {
  const orderedItems = sortTimelineItems(items);
  const placeMap = getPlaceMap(places);
  const routeById = new Map(routeSegments.map((route) => [route.id, route]));
  const insights: PlannerInsight[] = [];

  const placeBackedItems = orderedItems.filter((item) => {
    const place = item.placeId ? placeMap.get(item.placeId) : undefined;

    return typeof place?.latitude === "number" && typeof place.longitude === "number";
  });
  const missingRouteCount = Math.max(0, placeBackedItems.length - 1 - routeSegments.length);

  if (missingRouteCount > 0) {
    insights.push({
      id: "missing-routes",
      kind: "missingRoutes",
      severity: "warning",
      count: missingRouteCount
    });
  }

  const timedItems = orderedItems
    .filter((item) => item.startTime)
    .map((item) => ({
      item,
      start: new Date(item.startTime ?? "").getTime(),
      end: new Date(item.endTime ?? item.startTime ?? "").getTime()
    }))
    .filter((item) => Number.isFinite(item.start) && Number.isFinite(item.end));

  let overlapCount = 0;
  let impossibleTravelCount = 0;
  let longIdleCount = 0;
  let previous = timedItems[0];

  for (let index = 1; index < timedItems.length; index += 1) {
    const current = timedItems[index];

    if (!previous || !current) {
      continue;
    }

    if (current.start < previous.end) {
      overlapCount += 1;
    }

    const gapMinutes = Math.round((current.start - previous.end) / 60_000);
    const route = current.item.routeSegmentId ? routeById.get(current.item.routeSegmentId) : undefined;
    const travelMinutes = route?.durationSeconds ? Math.ceil(route.durationSeconds / 60) : 0;

    if (gapMinutes >= 0 && travelMinutes > gapMinutes) {
      impossibleTravelCount += 1;
    }

    if (gapMinutes >= 360 && sameLocalDay(previous.item.endTime ?? previous.item.startTime, current.item.startTime)) {
      longIdleCount += 1;
    }

    previous = current.end > previous.end ? current : previous;
  }

  if (overlapCount > 0) {
    insights.push({
      id: "overlapping-events",
      kind: "overlap",
      severity: "critical",
      count: overlapCount
    });
  }

  if (impossibleTravelCount > 0) {
    insights.push({
      id: "impossible-travel",
      kind: "impossibleTravel",
      severity: "critical",
      count: impossibleTravelCount
    });
  }

  const emptyDayCount = countEmptyDays(timedItems.map(({ item }) => item));
  if (emptyDayCount > 0) {
    insights.push({
      id: "empty-days",
      kind: "emptyDays",
      severity: "info",
      count: emptyDayCount
    });
  }

  if (longIdleCount > 0) {
    insights.push({
      id: "long-idle",
      kind: "longIdle",
      severity: "info",
      count: longIdleCount,
      minutes: 360
    });
  }

  const budgetLimit = expenses?.budget?.totalLimit ?? null;
  const expenseTotal = expenses?.expenses.reduce((total, expense) => total + expense.amount, 0) ?? 0;
  if (budgetLimit !== null && expenseTotal > budgetLimit) {
    insights.push({
      id: "budget-warning",
      kind: "budget",
      severity: "warning",
      count: 1,
      amount: expenseTotal - budgetLimit,
      currency: expenses?.budget?.currency
    });
  }

  return insights.slice(0, 6);
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

export function getItemCoordinates(place?: PlaceDto | undefined) {
  if (typeof place?.latitude !== "number" || typeof place.longitude !== "number") {
    return null;
  }

  return `${place.latitude.toFixed(4)}, ${place.longitude.toFixed(4)}`;
}

export function getItemMapId(item: ItineraryItem) {
  return item.placeId ? getItemMarkerId(item) : null;
}

function getTimelineGroup(
  item: ItineraryItem,
  place: PlaceDto | undefined,
  groupingMode: PlannerGroupingMode,
  locale: string,
  fallbackTimezone: string
): TimelineGroup {
  if (groupingMode === "city") {
    const cityLabel = getCityLabel(place);

    return {
      id: `city:${cityLabel ?? "unknown"}`,
      key: cityLabel ?? "unknown",
      mode: groupingMode,
      label: cityLabel ?? undefined,
      fallbackKey: cityLabel ? undefined : "unknownCity",
      itemCount: 0
    };
  }

  if (groupingMode === "type") {
    return {
      id: `type:${item.type}`,
      key: item.type,
      mode: groupingMode,
      label: item.type,
      itemCount: 0
    };
  }

  const dayKey = getDayKey(item.startTime, item.timezone || fallbackTimezone);

  if (!dayKey) {
    return {
      id: "day:unscheduled",
      key: "unscheduled",
      mode: groupingMode,
      fallbackKey: "unscheduled",
      itemCount: 0
    };
  }

  return {
    id: `day:${dayKey}`,
    key: dayKey,
    mode: groupingMode,
    label: new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeZone: item.timezone || fallbackTimezone
    }).format(new Date(item.startTime ?? "")),
    itemCount: 0
  };
}

function getDayKey(timestamp: string | null, timezone: string) {
  if (!timestamp) {
    return null;
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric"
  }).formatToParts(new Date(timestamp));
  const values = new Map(parts.map((part) => [part.type, part.value]));
  const year = values.get("year");
  const month = values.get("month");
  const day = values.get("day");

  return year && month && day ? `${year}-${month}-${day}` : null;
}

function getCityLabel(place?: PlaceDto | undefined) {
  if (!place) {
    return null;
  }

  const formattedParts = (place.formattedAddress ?? place.address ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return formattedParts.at(-2) ?? place.countryCode ?? place.name ?? null;
}

function sameLocalDay(leftTimestamp: string | null, rightTimestamp: string | null) {
  if (!leftTimestamp || !rightTimestamp) {
    return false;
  }

  return leftTimestamp.slice(0, 10) === rightTimestamp.slice(0, 10);
}

function countEmptyDays(items: ItineraryItem[]) {
  const uniqueDays = new Set(
    items
      .map((item) => item.startTime?.slice(0, 10))
      .filter((value): value is string => Boolean(value))
  );
  const sortedDays = [...uniqueDays].sort();
  const firstDay = sortedDays[0];
  const lastDay = sortedDays[sortedDays.length - 1];

  if (!firstDay || !lastDay) {
    return 0;
  }

  const start = new Date(`${firstDay}T00:00:00.000Z`).getTime();
  const end = new Date(`${lastDay}T00:00:00.000Z`).getTime();
  const dayCount = Math.max(0, Math.round((end - start) / 86_400_000) + 1);

  return Math.max(0, dayCount - uniqueDays.size);
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

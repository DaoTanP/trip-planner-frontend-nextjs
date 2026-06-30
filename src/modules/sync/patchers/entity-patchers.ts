import type { InfiniteData, QueryClient } from "@tanstack/react-query";

import { expenseKeys } from "@/modules/expenses/queries/expense.queries";
import type { TripBudgetSummary } from "@/modules/expenses/types/expense.types";
import { itineraryKeys } from "@/modules/itinerary/queries/itinerary.queries";
import type { ItineraryItem, ItineraryItemsPage } from "@/modules/itinerary/types/itinerary.types";
import type { CollaborativeNote, CursorPage } from "@/modules/notes/types/note.types";
import { noteKeys } from "@/modules/notes/queries/note.queries";
import { placeKeys } from "@/modules/places/queries/place.queries";
import { tripKeys } from "@/modules/trips/queries/trip.queries";
import type {
  TripDetail,
  TripExpensesPage,
  TripRoutePreference
} from "@/modules/trips/types/trip.types";

import { patchInfiniteItems, upsertById } from "./infinite-page-patcher";
import type { EntityPatchPayload, TripMutationEvent } from "../types/sync.types";

type ItineraryInfiniteData = InfiniteData<ItineraryItemsPage, string | undefined>;
type NotesInfiniteData = InfiniteData<CursorPage<CollaborativeNote>, string | undefined>;
type ExpenseInfiniteData = InfiniteData<TripExpensesPage, string | undefined>;
type ExpenseListFilters = {
  categoryId?: unknown;
  itineraryItemId?: unknown;
  paidByUserId?: unknown;
};
const expenseListQueryPrefix = (tripId: string) => [...expenseKeys.byTrip(tripId), "list"] as const;
const expenseInfiniteListQueryPrefix = (tripId: string) =>
  [...expenseKeys.byTrip(tripId), "infinite-list"] as const;

const sortItineraryItems = (items: ItineraryItem[]) =>
  [...items].sort((left, right) =>
    left.sortOrder === right.sortOrder
      ? left.id.localeCompare(right.id)
      : left.sortOrder - right.sortOrder
  );

function applyItineraryItemPatch(items: ItineraryItem[], patch: EntityPatchPayload) {
  if (patch.patchType === "ENTITY_DELETED") {
    return items.filter((item) => item.id !== patch.entityId);
  }

  if (patch.patchType === "ENTITY_REBALANCED") {
    const affectedItems = Array.isArray(patch.fields?.affectedItems)
      ? patch.fields.affectedItems
      : [];
    const affectedById = new Map(
      affectedItems
        .filter((item): item is Record<string, unknown> => !!asRecord(item))
        .map((item) => [String(item.id), item])
    );

    return sortItineraryItems(
      items.map((item) => {
        const affected = affectedById.get(item.id);
        return affected ? ({ ...item, ...affected } as ItineraryItem) : item;
      })
    );
  }

  if (!patch.fields) {
    return items;
  }

  const nextItem = {
    ...(items.find((item) => item.id === patch.entityId) ?? {}),
    ...patch.fields
  } as ItineraryItem;

  return upsertById(items, nextItem, sortItineraryItems);
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const noteMatchesFilters = (
  note: CollaborativeNote,
  filters: Record<string, unknown> | null
): boolean => {
  if (!filters) {
    return true;
  }

  if (typeof filters.tripId === "string" && note.tripId !== filters.tripId) {
    return false;
  }
  if (
    typeof filters.targetEntityType === "string" &&
    note.targetEntityType !== filters.targetEntityType
  ) {
    return false;
  }
  if (
    typeof filters.targetEntityId === "string" &&
    note.targetEntityId !== filters.targetEntityId
  ) {
    return false;
  }
  if (typeof filters.parentNoteId === "string" && note.parentNoteId !== filters.parentNoteId) {
    return false;
  }
  if (filters.parentNoteId === undefined && note.parentNoteId !== null) {
    return false;
  }

  return true;
};

const asExpenseFilters = (value: unknown): ExpenseListFilters | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as ExpenseListFilters)
    : null;

const expenseMatchesFilters = (
  expense: TripExpensesPage["expenses"][number],
  filters: ExpenseListFilters | null
) => {
  if (!filters) {
    return true;
  }

  if (typeof filters.categoryId === "string" && expense.categoryId !== filters.categoryId) {
    return false;
  }
  if (
    typeof filters.itineraryItemId === "string" &&
    expense.itineraryItemId !== filters.itineraryItemId
  ) {
    return false;
  }
  if (typeof filters.paidByUserId === "string" && expense.paidByUserId !== filters.paidByUserId) {
    return false;
  }

  return true;
};

export function parseEntityPatchPayload(event: TripMutationEvent): EntityPatchPayload | null {
  const payload = asRecord(event.payload);
  if (!payload) {
    return null;
  }

  const patchType = payload.patchType;
  const entityType = payload.entityType ?? event.entityType;
  const entityId = payload.entityId ?? event.entityId;

  if (
    typeof patchType !== "string" ||
    typeof entityType !== "string" ||
    typeof entityId !== "string"
  ) {
    return null;
  }

  const fields = asRecord(payload.fields);
  const tombstone = asRecord(payload.tombstone);
  const patch: EntityPatchPayload = {
    patchType: patchType as EntityPatchPayload["patchType"],
    entityType,
    entityId
  };

  if (fields) patch.fields = fields;
  if (tombstone) patch.tombstone = tombstone;

  return patch;
}

export function patchTripRevision(queryClient: QueryClient, tripId: string, revision: string) {
  queryClient.setQueryData<TripDetail>(tripKeys.detail(tripId), (current) =>
    current ? { ...current, revision } : current
  );
}

export function patchTrip(queryClient: QueryClient, tripId: string, patch: EntityPatchPayload) {
  if (!patch.fields) {
    return;
  }

  queryClient.setQueryData<TripDetail>(tripKeys.detail(tripId), (current) =>
    current && current.id === patch.entityId ? { ...current, ...patch.fields } : current
  );
}

export function patchItineraryItem(
  queryClient: QueryClient,
  tripId: string,
  patch: EntityPatchPayload
) {
  queryClient.setQueryData<ItineraryInfiniteData>(itineraryKeys.items(tripId), (current) =>
    patchInfiniteItems<ItineraryItemsPage, ItineraryItem>(current, (items) =>
      applyItineraryItemPatch(items, patch)
    )
  );
  queryClient.setQueryData<ItineraryItem[]>(itineraryKeys.routeItems(tripId), (current) =>
    current ? applyItineraryItemPatch(current, patch) : current
  );

  if (patch.patchType !== "ENTITY_DELETED") {
    void queryClient.invalidateQueries({
      queryKey: placeKeys.byTrip(tripId),
      refetchType: "active"
    });
  } else {
    void queryClient.invalidateQueries({
      queryKey: tripKeys.routePreferences(tripId),
      refetchType: "active"
    });
  }
}

export function patchRoutePreference(
  queryClient: QueryClient,
  tripId: string,
  patch: EntityPatchPayload
) {
  if (patch.patchType === "ENTITY_DELETED") {
    queryClient.setQueryData<TripRoutePreference[]>(tripKeys.routePreferences(tripId), (current) =>
      current ? current.filter((routePreference) => routePreference.id !== patch.entityId) : current
    );
    return;
  }

  if (!patch.fields) {
    void queryClient.invalidateQueries({
      queryKey: tripKeys.routePreferences(tripId),
      refetchType: "active"
    });
    return;
  }

  const nextRoutePreference = patch.fields as TripRoutePreference;

  queryClient.setQueryData<TripRoutePreference[]>(tripKeys.routePreferences(tripId), (current) => {
    if (!current) {
      return [nextRoutePreference];
    }

    const existing = current.find(
      (routePreference) =>
        routePreference.id === patch.entityId ||
        (routePreference.fromItemId === nextRoutePreference.fromItemId &&
          routePreference.toItemId === nextRoutePreference.toItemId)
    );

    if (!existing) {
      return [...current, nextRoutePreference];
    }

    return current.map((routePreference) =>
      routePreference.id === existing.id ? nextRoutePreference : routePreference
    );
  });
}

export function patchNote(queryClient: QueryClient, patch: EntityPatchPayload) {
  const noteQueries = queryClient.getQueryCache().findAll({ queryKey: noteKeys.lists() });

  noteQueries.forEach((query) => {
    const filters = asRecord(query.queryKey[2]);

    queryClient.setQueryData<NotesInfiniteData>(query.queryKey, (current) =>
      patchInfiniteItems<CursorPage<CollaborativeNote>, CollaborativeNote>(current, (notes) => {
        const currentNote = notes.find((note) => note.id === patch.entityId);

        if (patch.patchType === "ENTITY_DELETED") {
          const tombstone = patch.tombstone ?? {};
          return notes.map((note) =>
            note.id === patch.entityId ? ({ ...note, ...tombstone } as CollaborativeNote) : note
          );
        }

        if (!patch.fields) {
          return notes;
        }

        const nextNote = {
          ...(currentNote ?? {}),
          ...patch.fields
        } as CollaborativeNote;

        if (!currentNote && !noteMatchesFilters(nextNote, filters)) {
          return notes;
        }

        return upsertById(notes, nextNote);
      })
    );
  });
}

export function patchExpense(queryClient: QueryClient, tripId: string, patch: EntityPatchPayload) {
  const patchPage = (
    current: TripExpensesPage | undefined,
    filters: ExpenseListFilters | null,
    canInsert: boolean
  ) => {
    if (!current) {
      return current;
    }

    if (patch.patchType === "ENTITY_DELETED") {
      return {
        ...current,
        expenses: current.expenses.filter((expense) => expense.id !== patch.entityId)
      };
    }

    if (!patch.fields) {
      return current;
    }

    const nextExpense = {
      ...(current.expenses.find((expense) => expense.id === patch.entityId) ?? {}),
      ...patch.fields
    } as TripExpensesPage["expenses"][number];
    const existing = current.expenses.some((expense) => expense.id === patch.entityId);

    return {
      ...current,
      expenses:
        expenseMatchesFilters(nextExpense, filters) && (canInsert || existing)
          ? upsertById(current.expenses, nextExpense)
          : current.expenses.filter((expense) => expense.id !== patch.entityId)
    };
  };

  queryClient
    .getQueryCache()
    .findAll({ queryKey: expenseListQueryPrefix(tripId) })
    .forEach((query) => {
      const filters = asExpenseFilters(query.queryKey[4]);

      queryClient.setQueryData<TripExpensesPage>(query.queryKey, (current) =>
        patchPage(current, filters, true)
      );
    });

  queryClient
    .getQueryCache()
    .findAll({ queryKey: expenseInfiniteListQueryPrefix(tripId) })
    .forEach((query) => {
      const filters = asExpenseFilters(query.queryKey[4]);

      queryClient.setQueryData<ExpenseInfiniteData>(query.queryKey, (current) =>
        current
          ? {
              ...current,
              pages: current.pages.map(
                (page, index) => patchPage(page, filters, index === 0) ?? page
              )
            }
          : current
      );
    });
  void queryClient.invalidateQueries({
    queryKey: expenseListQueryPrefix(tripId),
    refetchType: "active"
  });
  void queryClient.invalidateQueries({
    queryKey: expenseInfiniteListQueryPrefix(tripId),
    refetchType: "active"
  });
  void queryClient.invalidateQueries({ queryKey: expenseKeys.budget(tripId) });
}

export function patchBudget(queryClient: QueryClient, tripId: string, patch: EntityPatchPayload) {
  if (!patch.fields) {
    void queryClient.invalidateQueries({ queryKey: expenseKeys.budget(tripId) });
    return;
  }

  queryClient.setQueryData<TripBudgetSummary>(expenseKeys.budget(tripId), (current) => {
    const currentBudget = current?.budget ?? null;
    const nextBudget =
      patch.patchType === "ENTITY_DELETED"
        ? null
        : ({
            ...(currentBudget ?? {}),
            ...patch.fields
          } as NonNullable<TripBudgetSummary["budget"]>);

    return current
      ? {
          ...current,
          budget: nextBudget
        }
      : current;
  });
  void queryClient.invalidateQueries({ queryKey: expenseKeys.budget(tripId) });
}

function invalidateTripResources(queryClient: QueryClient, tripId: string) {
  void queryClient.invalidateQueries({ queryKey: tripKeys.detail(tripId) });
  void queryClient.invalidateQueries({ queryKey: itineraryKeys.byTrip(tripId) });
  void queryClient.invalidateQueries({ queryKey: expenseKeys.byTrip(tripId) });
  void queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
}

function invalidateTripDetailForCountChange(
  queryClient: QueryClient,
  tripId: string,
  patch: EntityPatchPayload
) {
  if (
    (patch.patchType === "ENTITY_CREATED" || patch.patchType === "ENTITY_DELETED") &&
    (patch.entityType === "ITINERARY_ITEM" ||
      patch.entityType === "NOTE" ||
      patch.entityType === "EXPENSE")
  ) {
    void queryClient.invalidateQueries({
      queryKey: tripKeys.detail(tripId),
      refetchType: "active"
    });
  }
}

export function applyEntityPatch(
  queryClient: QueryClient,
  tripId: string,
  patch: EntityPatchPayload
) {
  switch (patch.entityType) {
    case "TRIP":
      patchTrip(queryClient, tripId, patch);
      break;
    case "ITINERARY_ITEM":
      patchItineraryItem(queryClient, tripId, patch);
      break;
    case "TRIP_ROUTE_PREFERENCE":
      patchRoutePreference(queryClient, tripId, patch);
      break;
    case "NOTE":
      patchNote(queryClient, patch);
      break;
    case "EXPENSE":
      patchExpense(queryClient, tripId, patch);
      break;
    case "BUDGET":
      patchBudget(queryClient, tripId, patch);
      break;
    default:
      invalidateTripResources(queryClient, tripId);
      break;
  }

  invalidateTripDetailForCountChange(queryClient, tripId, patch);
}

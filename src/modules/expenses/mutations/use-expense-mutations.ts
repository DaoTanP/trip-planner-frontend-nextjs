"use client";

import {
  type InfiniteData,
  useMutation,
  useQueryClient,
  type QueryClient
} from "@tanstack/react-query";

import { syncMutationQueue } from "@/modules/sync/queue/mutation-queue";
import { runQueuedMutation } from "@/modules/sync/runtime/sync-runtime";
import { tripKeys } from "@/modules/trips/queries/trip.queries";
import type { TripDetail } from "@/modules/trips/types/trip.types";

import { expenseKeys } from "../queries/expense.queries";
import {
  createExpense,
  deleteExpense,
  updateExpense,
  upsertBudget
} from "../services/expenses.service";
import type {
  CreateExpensePayload,
  DeleteExpenseQuery,
  TripBudgetSummary,
  TripExpense,
  TripExpenses,
  UpdateExpensePayload,
  UpsertBudgetPayload
} from "../types/expense.types";

const getTripRevision = (queryClient: QueryClient, tripId: string) =>
  queryClient.getQueryData<TripDetail>(tripKeys.detail(tripId))?.revision;

const getUsableTripRevision = (queryClient: QueryClient, tripId: string) => {
  const queryState = queryClient.getQueryState<TripDetail>(tripKeys.detail(tripId));
  const hasPendingTripMutation = syncMutationQueue
    .getSnapshot()
    .some((entry) => entry.tripId === tripId && entry.state !== "acknowledged");

  if (
    hasPendingTripMutation ||
    queryState?.isInvalidated ||
    queryState?.fetchStatus === "fetching"
  ) {
    return undefined;
  }

  return getTripRevision(queryClient, tripId);
};

const withMutationMeta = <
  TPayload extends { clientMutationId?: string; expectedRevision?: string }
>(
  payload: TPayload,
  queryClient: QueryClient,
  tripId: string
): TPayload & { clientMutationId: string } => {
  const nextPayload: TPayload & { clientMutationId: string } = {
    ...payload,
    clientMutationId: payload.clientMutationId ?? crypto.randomUUID()
  };
  const expectedRevision = payload.expectedRevision ?? getUsableTripRevision(queryClient, tripId);

  if (expectedRevision !== undefined) {
    nextPayload.expectedRevision = expectedRevision;
  }

  return nextPayload;
};

const patchTrip = (
  queryClient: QueryClient,
  tripId: string,
  patch: (trip: TripDetail) => TripDetail
) => {
  queryClient.setQueryData<TripDetail>(tripKeys.detail(tripId), (current) =>
    current ? patch(current) : current
  );
};

const expenseListQueryPrefix = (tripId: string) => [...expenseKeys.byTrip(tripId), "list"] as const;
const expenseInfiniteListQueryPrefix = (tripId: string) =>
  [...expenseKeys.byTrip(tripId), "infinite-list"] as const;

type TripExpensesInfiniteData = InfiniteData<TripExpenses, string | undefined>;
type ExpenseListFilters = {
  categoryId?: unknown;
  itineraryItemId?: unknown;
  paidByUserId?: unknown;
};

const upsertExpense = (expenses: TripExpense[], expense: TripExpense) => [
  expense,
  ...expenses.filter((candidate) => candidate.id !== expense.id)
];

const asExpenseFilters = (value: unknown): ExpenseListFilters | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as ExpenseListFilters)
    : null;

const expenseMatchesFilters = (expense: TripExpense, filters: ExpenseListFilters | null) => {
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

const patchExpensePage = (
  current: TripExpenses | undefined,
  expense: TripExpense,
  filters: ExpenseListFilters | null,
  canInsert: boolean
) => {
  if (!current) {
    return current;
  }

  const existing = current.expenses.some((candidate) => candidate.id === expense.id);

  return {
    ...current,
    expenses:
      expenseMatchesFilters(expense, filters) && (canInsert || existing)
        ? upsertExpense(current.expenses, expense)
        : current.expenses.filter((candidate) => candidate.id !== expense.id)
  };
};

const upsertExpenseInLists = (
  queryClient: QueryClient,
  tripId: string,
  expense: TripExpense,
  { insertIfMissing }: { insertIfMissing: boolean }
) => {
  queryClient
    .getQueryCache()
    .findAll({ queryKey: expenseListQueryPrefix(tripId) })
    .forEach((query) => {
      const filters = asExpenseFilters(query.queryKey[4]);

      queryClient.setQueryData<TripExpenses>(query.queryKey, (current) =>
        patchExpensePage(current, expense, filters, insertIfMissing)
      );
    });

  queryClient
    .getQueryCache()
    .findAll({ queryKey: expenseInfiniteListQueryPrefix(tripId) })
    .forEach((query) => {
      const filters = asExpenseFilters(query.queryKey[4]);

      queryClient.setQueryData<TripExpensesInfiniteData>(query.queryKey, (current) =>
        current
          ? {
              ...current,
              pages: current.pages.map((page, index) => {
                const patchedPage = patchExpensePage(
                  page,
                  expense,
                  filters,
                  insertIfMissing && index === 0
                );

                if (!patchedPage) {
                  return page;
                }

                return patchedPage;
              })
            }
          : current
      );
    });
};

const removeExpenseFromLists = (queryClient: QueryClient, tripId: string, expenseId: string) => {
  queryClient.setQueriesData<TripExpenses>(
    { queryKey: expenseListQueryPrefix(tripId) },
    (current) =>
      current
        ? {
            ...current,
            expenses: current.expenses.filter((expense) => expense.id !== expenseId)
          }
        : current
  );
  queryClient.setQueriesData<TripExpensesInfiniteData>(
    { queryKey: expenseInfiniteListQueryPrefix(tripId) },
    (current) =>
      current
        ? {
            ...current,
            pages: current.pages.map((page) => ({
              ...page,
              expenses: page.expenses.filter((expense) => expense.id !== expenseId)
            }))
          }
        : current
  );
};

const invalidateExpenseDerivedData = (queryClient: QueryClient, tripId: string) => {
  void queryClient.invalidateQueries({
    queryKey: expenseListQueryPrefix(tripId),
    refetchType: "active"
  });
  void queryClient.invalidateQueries({
    queryKey: expenseInfiniteListQueryPrefix(tripId),
    refetchType: "active"
  });
  void queryClient.invalidateQueries({ queryKey: expenseKeys.budget(tripId) });
};

export function useCreateExpenseMutation(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateExpensePayload) => {
      const nextPayload = withMutationMeta(payload, queryClient, tripId);

      return runQueuedMutation({
        tripId,
        clientMutationId: nextPayload.clientMutationId,
        entityType: "EXPENSE",
        operation: "ENTITY_CREATED",
        payload: nextPayload as Record<string, unknown>,
        mutationFn: () => createExpense(tripId, nextPayload)
      });
    },
    onSuccess: (result) => {
      upsertExpenseInLists(queryClient, tripId, result.expense, { insertIfMissing: true });
      patchTrip(queryClient, tripId, (trip) => ({
        ...trip,
        revision: result.revision,
        expenseCount: trip.expenseCount + 1
      }));
      invalidateExpenseDerivedData(queryClient, tripId);
    }
  });
}

export function useUpdateExpenseMutation(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ expenseId, payload }: { expenseId: string; payload: UpdateExpensePayload }) => {
      const nextPayload = withMutationMeta(payload, queryClient, tripId);

      return runQueuedMutation({
        tripId,
        clientMutationId: nextPayload.clientMutationId,
        entityType: "EXPENSE",
        entityId: expenseId,
        operation: "ENTITY_UPDATED",
        payload: nextPayload as Record<string, unknown>,
        mutationFn: () => updateExpense(expenseId, nextPayload)
      });
    },
    onSuccess: (result) => {
      upsertExpenseInLists(queryClient, tripId, result.expense, { insertIfMissing: false });
      patchTrip(queryClient, tripId, (trip) => ({ ...trip, revision: result.revision }));
      invalidateExpenseDerivedData(queryClient, tripId);
    }
  });
}

export function useDeleteExpenseMutation(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ expenseId, params }: { expenseId: string; params?: DeleteExpenseQuery }) => {
      const nextParams = withMutationMeta(params ?? {}, queryClient, tripId);

      return runQueuedMutation({
        tripId,
        clientMutationId: nextParams.clientMutationId,
        entityType: "EXPENSE",
        entityId: expenseId,
        operation: "ENTITY_DELETED",
        payload: nextParams as Record<string, unknown>,
        mutationFn: () => deleteExpense(expenseId, nextParams)
      });
    },
    onSuccess: (expenseId) => {
      removeExpenseFromLists(queryClient, tripId, expenseId);
      patchTrip(queryClient, tripId, (trip) => ({
        ...trip,
        expenseCount: Math.max(0, trip.expenseCount - 1)
      }));
      invalidateExpenseDerivedData(queryClient, tripId);
      void queryClient.invalidateQueries({ queryKey: tripKeys.detail(tripId) });
    }
  });
}

export function useUpsertBudgetMutation(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpsertBudgetPayload) => {
      const nextPayload = withMutationMeta(payload, queryClient, tripId);

      return runQueuedMutation({
        tripId,
        clientMutationId: nextPayload.clientMutationId,
        entityType: "BUDGET",
        operation: "ENTITY_UPDATED",
        payload: nextPayload as Record<string, unknown>,
        mutationFn: () => upsertBudget(tripId, nextPayload)
      });
    },
    onSuccess: (result) => {
      const summary: TripBudgetSummary = {
        budget: result.budget,
        currency: result.currency,
        budgetLimit: result.budgetLimit,
        spentAmount: result.spentAmount,
        remainingAmount: result.remainingAmount,
        usagePercentage: result.usagePercentage
      };

      queryClient.setQueryData<TripBudgetSummary>(expenseKeys.budget(tripId), summary);
      patchTrip(queryClient, tripId, (trip) => ({ ...trip, revision: result.revision }));
    }
  });
}

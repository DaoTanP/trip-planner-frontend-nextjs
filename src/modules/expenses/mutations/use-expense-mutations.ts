"use client";

import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";

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
  const expectedRevision = payload.expectedRevision ?? getTripRevision(queryClient, tripId);

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

const upsertExpenseInLists = (queryClient: QueryClient, tripId: string, expense: TripExpense) => {
  queryClient.setQueriesData<TripExpenses>(
    { queryKey: expenseListQueryPrefix(tripId) },
    (current) =>
      current
        ? {
            ...current,
            expenses: [
              expense,
              ...current.expenses.filter((candidate) => candidate.id !== expense.id)
            ]
          }
        : current
  );
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
      upsertExpenseInLists(queryClient, tripId, result.expense);
      patchTrip(queryClient, tripId, (trip) => ({
        ...trip,
        revision: result.revision,
        expenseCount: trip.expenseCount + 1
      }));
      void queryClient.invalidateQueries({ queryKey: expenseKeys.budget(tripId) });
      void queryClient.invalidateQueries({ queryKey: expenseKeys.byTrip(tripId) });
      void queryClient.invalidateQueries({ queryKey: tripKeys.detail(tripId) });
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
      upsertExpenseInLists(queryClient, tripId, result.expense);
      patchTrip(queryClient, tripId, (trip) => ({ ...trip, revision: result.revision }));
      void queryClient.invalidateQueries({ queryKey: expenseKeys.budget(tripId) });
      void queryClient.invalidateQueries({ queryKey: expenseKeys.byTrip(tripId) });
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
      void queryClient.invalidateQueries({ queryKey: expenseKeys.budget(tripId) });
      void queryClient.invalidateQueries({ queryKey: expenseKeys.byTrip(tripId) });
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
      void queryClient.invalidateQueries({ queryKey: expenseKeys.byTrip(tripId) });
    }
  });
}

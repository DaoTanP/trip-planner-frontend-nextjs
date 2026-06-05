import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

import { getTripBudget, getTripExpenses } from "../services/expenses.service";
import type { ListExpensesQuery } from "../types/expense.types";

const normalizeExpenseFilters = (filters?: ListExpensesQuery) => ({
  ...(filters?.categoryId ? { categoryId: filters.categoryId } : {}),
  ...(filters?.itineraryItemId ? { itineraryItemId: filters.itineraryItemId } : {}),
  ...(filters?.paidByUserId ? { paidByUserId: filters.paidByUserId } : {}),
  ...(filters?.cursor ? { cursor: filters.cursor } : {}),
  ...(filters?.limit ? { limit: filters.limit } : {})
});

export const expenseKeys = {
  all: ["expenses"] as const,
  byTrip: (tripId: string) => [...expenseKeys.all, "trip", tripId] as const,
  list: (tripId: string, filters?: ListExpensesQuery) =>
    [...expenseKeys.byTrip(tripId), "list", normalizeExpenseFilters(filters)] as const,
  infiniteList: (tripId: string, filters?: ListExpensesQuery) =>
    [...expenseKeys.byTrip(tripId), "infinite-list", normalizeExpenseFilters(filters)] as const,
  budget: (tripId: string) => [...expenseKeys.byTrip(tripId), "budget"] as const
};

export function tripExpensesQueryOptions(tripId: string, filters?: ListExpensesQuery) {
  return queryOptions({
    queryKey: expenseKeys.list(tripId, filters),
    queryFn: ({ signal }) => getTripExpenses(tripId, filters, signal),
    staleTime: 30_000
  });
}

export function tripExpensesInfiniteQueryOptions(tripId: string, filters?: ListExpensesQuery) {
  return infiniteQueryOptions({
    queryKey: expenseKeys.infiniteList(tripId, filters),
    queryFn: ({ signal, pageParam }) => {
      const nextFilters: ListExpensesQuery = { ...filters };
      if (typeof pageParam === "string") nextFilters.cursor = pageParam;

      return getTripExpenses(tripId, nextFilters, signal);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    staleTime: 30_000
  });
}

export function tripBudgetQueryOptions(tripId: string) {
  return queryOptions({
    queryKey: expenseKeys.budget(tripId),
    queryFn: ({ signal }) => getTripBudget(tripId, signal),
    staleTime: 30_000
  });
}

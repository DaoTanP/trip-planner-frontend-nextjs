import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "@/services/api/request";
import { apiEndpoints } from "@/services/api/endpoints";
import type {
  ApiSuccessResponse,
  BudgetSummaryDto,
  CursorPaginationMeta,
  ListExpensesQueryDto
} from "@/services/api/contracts";

import type {
  BudgetMutationResult,
  CreateExpensePayload,
  DeleteExpenseQuery,
  ExpenseMutationResult,
  TripBudgetSummary,
  TripExpenses,
  UpdateExpensePayload,
  UpsertBudgetPayload
} from "../types/expense.types";

function withExpenseParams(url: string, params?: ListExpensesQueryDto) {
  const searchParams = new URLSearchParams();

  if (params?.categoryId) searchParams.set("categoryId", params.categoryId);
  if (params?.itineraryItemId) searchParams.set("itineraryItemId", params.itineraryItemId);
  if (params?.paidByUserId) searchParams.set("paidByUserId", params.paidByUserId);
  if (params?.cursor) searchParams.set("cursor", params.cursor);
  if (params?.limit) searchParams.set("limit", String(params.limit));

  const queryString = searchParams.toString();
  return queryString ? `${url}?${queryString}` : url;
}

function withDeleteParams(url: string, params?: DeleteExpenseQuery) {
  const searchParams = new URLSearchParams();

  if (params?.expectedRevision) searchParams.set("expectedRevision", params.expectedRevision);
  if (params?.clientMutationId) searchParams.set("clientMutationId", params.clientMutationId);
  if (params?.deviceId) searchParams.set("deviceId", params.deviceId);

  const queryString = searchParams.toString();
  return queryString ? `${url}?${queryString}` : url;
}

export async function getTripExpenses(
  tripId: string,
  params?: ListExpensesQueryDto,
  signal?: AbortSignal
) {
  const response = await apiGet<
    ApiSuccessResponse<Omit<TripExpenses, "pagination">, { pagination: CursorPaginationMeta }>
  >(withExpenseParams(apiEndpoints.trips.expenses(tripId), params), signal);

  return {
    ...response.data,
    pagination: response.meta.pagination
  } satisfies TripExpenses;
}

export async function getTripBudget(tripId: string, signal?: AbortSignal) {
  const response = await apiGet<ApiSuccessResponse<BudgetSummaryDto>>(
    apiEndpoints.trips.budget(tripId),
    signal
  );

  return response.data satisfies TripBudgetSummary;
}

export async function createExpense(tripId: string, payload: CreateExpensePayload) {
  const response = await apiPost<ApiSuccessResponse<ExpenseMutationResult>, CreateExpensePayload>(
    apiEndpoints.trips.expenses(tripId),
    payload
  );

  return response.data;
}

export async function updateExpense(expenseId: string, payload: UpdateExpensePayload) {
  const response = await apiPatch<ApiSuccessResponse<ExpenseMutationResult>, UpdateExpensePayload>(
    apiEndpoints.expenses.detail(expenseId),
    payload
  );

  return response.data;
}

export async function deleteExpense(expenseId: string, params?: DeleteExpenseQuery) {
  await apiDelete<void>(withDeleteParams(apiEndpoints.expenses.detail(expenseId), params));

  return expenseId;
}

export async function upsertBudget(tripId: string, payload: UpsertBudgetPayload) {
  const response = await apiPut<ApiSuccessResponse<BudgetMutationResult>, UpsertBudgetPayload>(
    apiEndpoints.trips.budget(tripId),
    payload
  );

  return response.data;
}

import type {
  BudgetSummaryDto,
  CreateExpenseRequestDto,
  DeleteExpenseQueryDto,
  ExpenseCategoryDto,
  ExpenseDto,
  ListExpensesQueryDto,
  UpsertBudgetRequestDto,
  UpdateExpenseRequestDto
} from "@/services/api/contracts";
import type { TripExpensesPage } from "@/modules/trips/types/trip.types";

export type TripExpense = ExpenseDto;
export type TripExpenseCategory = ExpenseCategoryDto;
export type TripExpenses = TripExpensesPage;
export type TripBudgetSummary = BudgetSummaryDto;
export type ListExpensesQuery = ListExpensesQueryDto;
export type CreateExpensePayload = CreateExpenseRequestDto;
export type UpdateExpensePayload = UpdateExpenseRequestDto;
export type DeleteExpenseQuery = DeleteExpenseQueryDto;
export type UpsertBudgetPayload = UpsertBudgetRequestDto;

export type ExpenseMutationResult = {
  expense: TripExpense;
  revision: string;
  clientMutationId?: string;
};

export type BudgetMutationResult = TripBudgetSummary & {
  revision: string;
  clientMutationId?: string;
};

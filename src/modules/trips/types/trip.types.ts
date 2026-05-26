import type {
  CreateTripNoteRequestDto,
  CreateTripRequestDto,
  ExpenseCategoryDto,
  ExpenseDto,
  PaginationMeta,
  RouteSegmentDto,
  TripCollaboratorDto,
  TripDetailDto,
  TripExpensesDto,
  TripNoteDto,
  TripSummaryDto
} from "@/services/api/contracts";

export type Trip = TripSummaryDto;
export type TripDetail = TripDetailDto;
export type TripNote = TripNoteDto;
export type TripRouteSegment = RouteSegmentDto;
export type TripCollaborator = TripCollaboratorDto;
export type TripExpense = ExpenseDto;
export type TripExpenseCategory = ExpenseCategoryDto;
export type TripExpenses = TripExpensesDto;
export type CreateTripPayload = CreateTripRequestDto;
export type CreateTripNotePayload = CreateTripNoteRequestDto;
export type TripsListMeta = {
  pagination: PaginationMeta;
};

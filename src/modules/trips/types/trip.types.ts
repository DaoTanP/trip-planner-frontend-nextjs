import type {
  CreateNoteRequestDto,
  CreateTripRequestDto,
  CursorPaginationMeta,
  ExpenseCategoryDto,
  ExpenseDto,
  NoteDto,
  PaginationMeta,
  RouteSegmentDto,
  TripCollaboratorDto,
  TripDetailDto,
  TripExpensesDto,
  TripSummaryDto
} from "@/services/api/contracts";

export type Trip = TripSummaryDto;
export type TripDetail = TripDetailDto;
export type TripEditorNote = NoteDto;
export type TripRouteSegment = RouteSegmentDto;
export type TripCollaborator = TripCollaboratorDto;
export type TripExpense = ExpenseDto;
export type TripExpenseCategory = ExpenseCategoryDto;
export type TripExpenses = TripExpensesDto;
export type CreateTripPayload = CreateTripRequestDto;
export type CreateNotePayload = CreateNoteRequestDto;
export type TripsListMeta = {
  pagination: PaginationMeta;
};

export type CursorPage<TItem> = {
  items: TItem[];
  pagination: CursorPaginationMeta;
};

export type TripExpensesPage = TripExpenses & {
  pagination: CursorPaginationMeta;
};

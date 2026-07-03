import type {
  CreateTripRequestDto,
  CursorPaginationMeta,
  ExpenseCategoryDto,
  ExpenseDto,
  ListMutationEventsResponseDto,
  MutationEventDto,
  OptimizeTripRequestDto,
  PaginationMeta,
  PlanningAnalysisDto,
  PlanningEngineReadModelDto,
  PlanningInsightsDto,
  PlanningOptimizationResponseDto,
  PlanningRecommendationsDto,
  PlanningRouteOptimizationDto,
  TripCollaboratorDto,
  TripDetailDto,
  TripExpensesDto,
  TripRoutePreferenceDto,
  TripSummaryDto,
  UpsertTripRoutePreferenceRequestDto,
  UpsertTripRoutePreferenceResponseDto
} from "@/services/api/contracts";

export type Trip = TripSummaryDto;
export type TripDetail = TripDetailDto;
export type TripCollaborator = TripCollaboratorDto;
export type TripExpense = ExpenseDto;
export type TripExpenseCategory = ExpenseCategoryDto;
export type TripExpenses = TripExpensesDto;
export type TripMutationEvent = MutationEventDto;
export type TripRoutePreference = TripRoutePreferenceDto;
export type TripPlanningAnalysis = PlanningAnalysisDto;
export type TripPlanningModel = PlanningEngineReadModelDto;
export type TripPlanningInsights = PlanningInsightsDto;
export type TripPlanningRecommendations = PlanningRecommendationsDto;
export type TripRouteOptimization = PlanningRouteOptimizationDto;
export type OptimizeTripPayload = OptimizeTripRequestDto;
export type OptimizeTripResult = PlanningOptimizationResponseDto;
export type UpsertTripRoutePreferencePayload = UpsertTripRoutePreferenceRequestDto;
export type UpsertTripRoutePreferenceResult = UpsertTripRoutePreferenceResponseDto;
export type CreateTripPayload = CreateTripRequestDto;
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

export type TripMutationEventsPage = ListMutationEventsResponseDto;

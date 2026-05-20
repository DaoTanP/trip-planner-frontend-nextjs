import type {
  CreateTripRequestDto,
  ListTripsQueryDto,
  PaginationMeta,
  TripSummaryDto
} from "@/services/api/contracts";

export type Trip = TripSummaryDto;
export type CreateTripPayload = CreateTripRequestDto;
export type ListTripsQuery = ListTripsQueryDto;
export type TripsListMeta = {
  pagination: PaginationMeta;
};

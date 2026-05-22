import type {
  CreateTripRequestDto,
  CreateTripNoteRequestDto,
  ItineraryItemDto,
  ListTripsQueryDto,
  PaginationMeta,
  PlaceDto,
  ReorderTripDaysRequestDto,
  TripDayDto,
  TripDetailDto,
  TripNoteDto,
  TripSummaryDto
} from "@/services/api/contracts";

export type Trip = TripSummaryDto;
export type TripDetail = TripDetailDto;
export type TripDay = TripDayDto;
export type ItineraryItem = ItineraryItemDto;
export type TripPlace = PlaceDto;
export type TripNote = TripNoteDto;
export type CreateTripPayload = CreateTripRequestDto;
export type CreateTripNotePayload = CreateTripNoteRequestDto;
export type ReorderTripDaysPayload = ReorderTripDaysRequestDto;
export type ListTripsQuery = ListTripsQueryDto;
export type TripsListMeta = {
  pagination: PaginationMeta;
};

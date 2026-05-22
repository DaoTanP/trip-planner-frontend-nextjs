import type {
  CreateItineraryItemRequestDto,
  ItineraryItemDto,
  ReorderItineraryItemsRequestDto,
  TripDayDto,
  UpdateItineraryItemRequestDto
} from "@/services/api/contracts";

export type TripDay = TripDayDto;
export type ItineraryItem = ItineraryItemDto;
export type CreateItineraryItemPayload = CreateItineraryItemRequestDto;
export type UpdateItineraryItemPayload = UpdateItineraryItemRequestDto;
export type ReorderItineraryItemsPayload = ReorderItineraryItemsRequestDto;

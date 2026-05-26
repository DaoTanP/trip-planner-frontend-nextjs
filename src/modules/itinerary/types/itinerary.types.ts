import type {
  CreateItineraryItemRequestDto,
  ItineraryItemDto,
  ReorderItineraryItemsRequestDto,
  UpdateItineraryItemRequestDto
} from "@/services/api/contracts";

export type ItineraryItem = ItineraryItemDto;
export type CreateItineraryItemPayload = CreateItineraryItemRequestDto;
export type UpdateItineraryItemPayload = UpdateItineraryItemRequestDto;
export type ReorderItineraryItemsPayload = ReorderItineraryItemsRequestDto;

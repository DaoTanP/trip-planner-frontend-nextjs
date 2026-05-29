import type {
  CreateItineraryItemRequestDto,
  CursorPaginationMeta,
  ItineraryItemDto,
  ReorderItineraryItemsResponseDto,
  ReorderItineraryItemsRequestDto,
  UpdateItineraryItemRequestDto
} from "@/services/api/contracts";

export type ItineraryItem = ItineraryItemDto;
export type CreateItineraryItemPayload = CreateItineraryItemRequestDto;
export type UpdateItineraryItemPayload = UpdateItineraryItemRequestDto;
export type ReorderItineraryItemsPayload = ReorderItineraryItemsRequestDto;
export type ReorderItineraryItemsResult = ReorderItineraryItemsResponseDto;
export type ItineraryItemMutationResult = {
  item: ItineraryItem;
  revision: string;
  clientMutationId?: string;
};
export type ItineraryItemsPage = {
  items: ItineraryItem[];
  pagination: CursorPaginationMeta;
};

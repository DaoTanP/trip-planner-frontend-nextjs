import type { ItineraryItemStatusDto } from "@/services/api/contracts";
import type { CategoryColorKey } from "@/theme/colors/category-colors";

export interface MapMarker {
  id: string;
  stopId: string;
  stopOrder: number;
  label: string;
  latitude: number;
  longitude: number;
  categoryKey: CategoryColorKey;
  status: ItineraryItemStatusDto;
  itemId?: string | undefined;
  placeId?: string | undefined;
}

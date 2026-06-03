export interface MapMarker {
  id: string;
  stopId: string;
  stopOrder: number;
  label: string;
  latitude: number;
  longitude: number;
  itemId?: string | undefined;
  placeId?: string | undefined;
}

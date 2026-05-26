export interface MapMarker {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  itemId?: string | undefined;
  placeId?: string | undefined;
}

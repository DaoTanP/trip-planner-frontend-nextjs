export interface ItineraryStop {
  id: string;
  tripId: string;
  placeId: string;
  day: number;
  order: number;
  arrivalTime?: string;
  departureTime?: string;
  notes?: string;
}

export interface ReorderItineraryStopPayload {
  stopId: string;
  day: number;
  order: number;
}

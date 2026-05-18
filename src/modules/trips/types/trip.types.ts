export type TripStatus = "draft" | "planning" | "booked" | "completed";

export interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  status: TripStatus;
  collaboratorCount: number;
  stopCount: number;
  coverImageUrl?: string;
  updatedAt: string;
}

export interface CreateTripPayload {
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
}

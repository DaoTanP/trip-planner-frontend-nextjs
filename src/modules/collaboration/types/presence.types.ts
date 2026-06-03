"use client";

export type PresenceEntityType = "TRIP" | "ITINERARY_ITEM" | "NOTE";
export type PresenceState = "VIEWING" | "EDITING" | "REPLYING";

export type PresenceEntry = {
  tripId: string;
  clientId: string;
  userId: string;
  userName: string;
  userAvatarUrl: string | null;
  entityType: PresenceEntityType;
  entityId: string;
  state: PresenceState;
  timestamp: number;
};

export type LocalPresenceSource = {
  tripId: string;
  entityType: PresenceEntityType;
  entityId: string;
  state: PresenceState;
  priority: number;
};

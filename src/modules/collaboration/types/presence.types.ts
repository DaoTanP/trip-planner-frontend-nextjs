"use client";

import type { MutationEventDto } from "@/services/api/contracts";

import type { RevisionConflictDetails } from "@/modules/sync/types/sync.types";

export type PresenceEntityType =
  | "TRIP"
  | "ITINERARY"
  | "ITINERARY_ITEM"
  | "PLACE"
  | "EXPENSE"
  | "BUDGET"
  | "NOTE"
  | "MAP";

export type PresenceUserStatus = "ACTIVE" | "IDLE" | "OFFLINE";
export type PresenceState = "VIEWING" | "EDITING" | "REPLYING";
export type PresenceConnectionStatus = "idle" | "connecting" | "connected" | "reconnecting";

export type PresenceCursor = {
  x: number;
  y: number;
  entityType?: PresenceEntityType | undefined;
  entityId?: string | undefined;
};

export type TripPresence = {
  tripId: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  status: PresenceUserStatus;
  focusedEntityType?: PresenceEntityType | undefined;
  focusedEntityId?: string | undefined;
  editingEntityType?: PresenceEntityType | undefined;
  editingEntityId?: string | undefined;
  editingState?: Extract<PresenceState, "EDITING" | "REPLYING"> | undefined;
  cursor?: PresenceCursor | null | undefined;
  lastSeen: number;
  deviceId: string;
  clientId: string;
};

export type PresenceSnapshotMetadata = {
  snapshotVersion: number;
  presenceRevision: number;
  generatedAt: string;
  activeUserCount: number;
};

export type PresenceEntry = {
  tripId: string;
  clientId: string;
  deviceId: string;
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

export type LocalPresenceSnapshot = {
  focus?: LocalPresenceSource | undefined;
  edit?: LocalPresenceSource | undefined;
};

export type PresenceSocketEvent =
  | {
      type: "presence.snapshot";
      tripId: string;
      presences: TripPresence[];
      metadata?: PresenceSnapshotMetadata | undefined;
      snapshotVersion?: number | undefined;
      presenceRevision?: number | undefined;
      generatedAt?: string | undefined;
      activeUserCount?: number | undefined;
    }
  | {
      type: "presence.join";
      presence: TripPresence;
    }
  | {
      type: "presence.leave";
      tripId: string;
      clientId: string;
      deviceId?: string | undefined;
      userId?: string | undefined;
    }
  | {
      type: "presence.heartbeat";
      presence: TripPresence;
    }
  | {
      type: "presence.focus.changed";
      presence: TripPresence;
    }
  | {
      type: "presence.edit.started";
      presence: TripPresence;
    }
  | {
      type: "presence.edit.stopped";
      presence: TripPresence;
    }
  | {
      type: "presence.cursor.changed";
      presence: TripPresence;
    }
  | {
      type: "revision.conflict";
      tripId: string;
      entityType: PresenceEntityType | string;
      entityId?: string | undefined;
      operation?: string | undefined;
      localPayload?: Record<string, unknown> | undefined;
      details: RevisionConflictDetails;
    }
  | {
      type: "trip.updated";
      tripId: string;
      event?: MutationEventDto | undefined;
      latestRevision?: string | undefined;
      revision?: string | undefined;
      entityType?: string | undefined;
      entityId?: string | undefined;
      operation?: string | undefined;
      actorId?: string | undefined;
      deviceId?: string | undefined;
      clientMutationId?: string | undefined;
      version?: number | undefined;
      changedFields?: string[] | undefined;
      payload?: Record<string, unknown> | null | undefined;
      patch?:
        | {
            entityType: string;
            entityId?: string | undefined;
            operation: string;
            revision: string;
            version?: number | undefined;
            changedFields?: string[] | undefined;
            payload?: Record<string, unknown> | null | undefined;
          }
        | undefined;
    }
  | {
      type: "planning.invalidated";
      tripId: string;
      revision: string;
      entityType: string;
      entityId?: string | undefined;
      affectedModels: Array<"issues" | "metrics" | "suggestions" | "timeline" | "route" | "budget">;
    };

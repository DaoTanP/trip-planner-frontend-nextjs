import type {
  ListMutationEventsResponseDto,
  MutationEventDto,
  RevisionConflictDetailsDto
} from "@/services/api/contracts";

export type SyncEntityType =
  | "TRIP"
  | "ITINERARY_ITEM"
  | "TRIP_ROUTE_PREFERENCE"
  | "NOTE"
  | "EXPENSE"
  | "BUDGET";

export type SyncOperation =
  | "ENTITY_CREATED"
  | "ENTITY_UPDATED"
  | "ENTITY_MOVED"
  | "ENTITY_DELETED"
  | "ENTITY_REBALANCED";

export type SyncMutationState =
  | "queued"
  | "sending"
  | "acknowledged"
  | "failed"
  | "retrying"
  | "conflicted";

export type EntityPatchPayload = {
  patchType: SyncOperation;
  entityType: SyncEntityType | string;
  entityId: string;
  fields?: Record<string, unknown>;
  tombstone?: Record<string, unknown>;
};

export type SyncMutationQueueEntry = {
  id: string;
  tripId: string;
  clientMutationId: string;
  entityType: SyncEntityType | string;
  entityId?: string | undefined;
  operation: SyncOperation | string;
  state: SyncMutationState;
  payload?: Record<string, unknown> | undefined;
  attemptCount: number;
  createdAt: number;
  updatedAt: number;
  lastError?: string | undefined;
};

export type SyncMutationQueueInput = {
  tripId: string;
  clientMutationId: string;
  entityType: SyncEntityType | string;
  entityId?: string | undefined;
  operation: SyncOperation | string;
  payload?: Record<string, unknown> | undefined;
};

export type TripMutationEventsPage = ListMutationEventsResponseDto;
export type TripMutationEvent = MutationEventDto;
export type RevisionConflictDetails = RevisionConflictDetailsDto;

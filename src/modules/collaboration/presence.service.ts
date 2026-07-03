"use client";

import type { AuthUser } from "@/modules/auth/types/auth.types";

import type {
  LocalPresenceSnapshot,
  PresenceEntityType,
  PresenceSocketEvent,
  PresenceState,
  PresenceUserStatus,
  TripPresence
} from "./types/presence.types";

const deviceIdStorageKey = "trip-planner-presence-device-id";
let presenceClientId: string | null = null;
type PlanningInvalidatedModel = Extract<
  PresenceSocketEvent,
  { type: "planning.invalidated" }
>["affectedModels"][number];
const planningInvalidatedModels = new Set<PlanningInvalidatedModel>([
  "issues",
  "metrics",
  "suggestions",
  "timeline",
  "route",
  "budget"
]);

export function createPresenceId(prefix: string) {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

export function getPresenceClientId() {
  presenceClientId ??= createPresenceId("presence-client");

  return presenceClientId;
}

export function getPresenceDeviceId() {
  if (typeof window === "undefined") {
    return createPresenceId("presence-device");
  }

  const existingDeviceId = window.localStorage.getItem(deviceIdStorageKey);

  if (existingDeviceId) {
    return existingDeviceId;
  }

  const deviceId = createPresenceId("presence-device");
  window.localStorage.setItem(deviceIdStorageKey, deviceId);

  return deviceId;
}

export function buildTripPresence({
  tripId,
  user,
  snapshot,
  clientId,
  deviceId
}: {
  tripId: string;
  user: AuthUser;
  snapshot: LocalPresenceSnapshot;
  clientId: string;
  deviceId: string;
}): TripPresence {
  return {
    tripId,
    userId: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl,
    status:
      typeof document !== "undefined" && document.visibilityState !== "visible" ? "IDLE" : "ACTIVE",
    focusedEntityType: snapshot.focus?.entityType ?? "TRIP",
    focusedEntityId: snapshot.focus?.entityId ?? tripId,
    editingEntityType: snapshot.edit?.entityType,
    editingEntityId: snapshot.edit?.entityId,
    editingState:
      snapshot.edit?.state === "EDITING" || snapshot.edit?.state === "REPLYING"
        ? snapshot.edit.state
        : undefined,
    lastSeen: Date.now(),
    deviceId,
    clientId
  };
}

export function isPresenceSocketEvent(value: unknown): value is PresenceSocketEvent {
  return normalizePresenceSocketEvent(value) !== null;
}

export function normalizePresenceSocketEvent(value: unknown): PresenceSocketEvent | null {
  const event = unwrapSocketEnvelope(value);

  if (!isRecord(event)) {
    return null;
  }

  const type = event.type;

  if (
    type === "presence.join" ||
    type === "presence.heartbeat" ||
    type === "presence.focus.changed" ||
    type === "presence.edit.started" ||
    type === "presence.edit.stopped" ||
    type === "presence.cursor.changed" ||
    type === "presence.user.joined" ||
    type === "presence.user.updated" ||
    type === "presence.focus.updated" ||
    type === "presence.edit.updated"
  ) {
    const presence = normalizeTripPresence(event.presence);

    if (!presence) {
      return null;
    }

    return {
      type: normalizePresenceEventType(type),
      presence
    };
  }

  if (type === "presence.snapshot") {
    const tripId = typeof event.tripId === "string" ? event.tripId : null;
    const rawPresences = Array.isArray(event.presences) ? event.presences : null;

    if (!tripId || !rawPresences) {
      return null;
    }

    return {
      type: "presence.snapshot",
      tripId,
      presences: rawPresences
        .map((presence) => normalizeTripPresence(presence))
        .filter((presence): presence is TripPresence => presence !== null),
      metadata: isRecord(event.metadata)
        ? {
            snapshotVersion: toNumber(event.metadata.snapshotVersion, 0),
            presenceRevision: toNumber(event.metadata.presenceRevision, 0),
            generatedAt:
              typeof event.metadata.generatedAt === "string"
                ? event.metadata.generatedAt
                : new Date().toISOString(),
            activeUserCount: toNumber(event.metadata.activeUserCount, 0)
          }
        : undefined,
      snapshotVersion: toOptionalNumber(event.snapshotVersion),
      presenceRevision: toOptionalNumber(event.presenceRevision),
      generatedAt: typeof event.generatedAt === "string" ? event.generatedAt : undefined,
      activeUserCount: toOptionalNumber(event.activeUserCount)
    };
  }

  if (type === "presence.leave" || type === "presence.user.left") {
    if (typeof event.tripId !== "string" || typeof event.clientId !== "string") {
      return null;
    }

    return {
      type: "presence.leave",
      tripId: event.tripId,
      clientId: event.clientId,
      deviceId: typeof event.deviceId === "string" ? event.deviceId : undefined,
      userId: typeof event.userId === "string" ? event.userId : undefined
    };
  }

  if (type === "revision.conflict") {
    if (typeof event.tripId !== "string" || typeof event.entityType !== "string") {
      return null;
    }

    return event as Extract<PresenceSocketEvent, { type: "revision.conflict" }>;
  }

  if (type === "trip.updated") {
    if (typeof event.tripId !== "string") {
      return null;
    }

    return event as Extract<PresenceSocketEvent, { type: "trip.updated" }>;
  }

  if (type === "planning.invalidated") {
    if (typeof event.tripId !== "string" || typeof event.revision !== "string") {
      return null;
    }

    return {
      type: "planning.invalidated",
      tripId: event.tripId,
      revision: event.revision,
      entityType: typeof event.entityType === "string" ? event.entityType : "TRIP",
      entityId: typeof event.entityId === "string" ? event.entityId : undefined,
      affectedModels: Array.isArray(event.affectedModels)
        ? event.affectedModels.filter(isPlanningInvalidatedModel)
        : []
    };
  }

  return null;
}

function unwrapSocketEnvelope(value: unknown) {
  if (!value || typeof value !== "object") {
    return value;
  }

  const candidate = value as {
    eventType?: unknown;
    payload?: unknown;
  };

  if (
    typeof candidate.eventType === "string" &&
    candidate.payload &&
    typeof candidate.payload === "object"
  ) {
    return {
      type: candidate.eventType,
      ...(candidate.payload as Record<string, unknown>),
      tripId:
        typeof (candidate.payload as Record<string, unknown>).tripId === "string"
          ? (candidate.payload as Record<string, unknown>).tripId
          : (value as { tripId?: unknown }).tripId
    };
  }

  return value;
}

function isPlanningInvalidatedModel(value: unknown): value is PlanningInvalidatedModel {
  return (
    typeof value === "string" && planningInvalidatedModels.has(value as PlanningInvalidatedModel)
  );
}

function normalizePresenceEventType(
  type: unknown
): Extract<PresenceSocketEvent, { presence: TripPresence }>["type"] {
  if (
    type === "presence.join" ||
    type === "presence.heartbeat" ||
    type === "presence.focus.changed" ||
    type === "presence.edit.started" ||
    type === "presence.edit.stopped" ||
    type === "presence.cursor.changed"
  ) {
    return type;
  }

  if (type === "presence.focus.updated") {
    return "presence.focus.changed";
  }

  if (type === "presence.edit.updated") {
    return "presence.edit.started";
  }

  if (type === "presence.user.updated") {
    return "presence.heartbeat";
  }

  return "presence.join";
}

function normalizeTripPresence(value: unknown): TripPresence | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.tripId !== "string" ||
    typeof value.userId !== "string" ||
    typeof value.clientId !== "string" ||
    typeof value.deviceId !== "string"
  ) {
    return null;
  }

  const focus = isRecord(value.focus) ? value.focus : null;
  const editing = isRecord(value.editing) ? value.editing : null;
  const focusedEntityType = normalizeEntityType(value.focusedEntityType ?? focus?.entityType);
  const focusedEntityId =
    typeof value.focusedEntityId === "string"
      ? value.focusedEntityId
      : typeof focus?.entityId === "string"
        ? focus.entityId
        : undefined;
  const editingEntityType = normalizeEntityType(value.editingEntityType ?? editing?.entityType);
  const editingEntityId =
    typeof value.editingEntityId === "string"
      ? value.editingEntityId
      : typeof editing?.entityId === "string"
        ? editing.entityId
        : undefined;
  const editingState = normalizePresenceState(value.editingState ?? editing?.state);
  const name =
    typeof value.name === "string"
      ? value.name
      : typeof value.displayName === "string"
        ? value.displayName
        : "Someone";

  return {
    tripId: value.tripId,
    userId: value.userId,
    name,
    avatarUrl:
      typeof value.avatarUrl === "string" || value.avatarUrl === null
        ? value.avatarUrl
        : typeof value.avatar === "string" || value.avatar === null
          ? value.avatar
          : null,
    status: normalizePresenceStatus(value.status),
    focusedEntityType,
    focusedEntityId,
    editingEntityType,
    editingEntityId,
    editingState,
    cursor: isRecord(value.cursor) ? (value.cursor as TripPresence["cursor"]) : undefined,
    lastSeen: toNumber(value.lastSeen, Date.now()),
    deviceId: value.deviceId,
    clientId: value.clientId
  };
}

function normalizeEntityType(value: unknown): PresenceEntityType | undefined {
  return value === "TRIP" ||
    value === "ITINERARY" ||
    value === "ITINERARY_ITEM" ||
    value === "PLACE" ||
    value === "EXPENSE" ||
    value === "BUDGET" ||
    value === "NOTE" ||
    value === "MAP"
    ? value
    : undefined;
}

function normalizePresenceStatus(value: unknown): PresenceUserStatus {
  return value === "ACTIVE" || value === "IDLE" || value === "OFFLINE" ? value : "ACTIVE";
}

function normalizePresenceState(
  value: unknown
): Extract<PresenceState, "EDITING" | "REPLYING"> | undefined {
  return value === "EDITING" || value === "REPLYING" ? value : undefined;
}

function toNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toOptionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

export function getPresenceChannelName(tripId: string) {
  return `trip-planner-presence:${tripId}`;
}

export function getNoteThreadPresenceId({
  targetEntityType,
  targetEntityId,
  parentNoteId
}: {
  targetEntityType: string;
  targetEntityId: string;
  parentNoteId?: string | undefined;
}) {
  return parentNoteId ? `reply:${parentNoteId}` : `root:${targetEntityType}:${targetEntityId}`;
}

"use client";

import { createStore } from "zustand/vanilla";

import type {
  LocalPresenceSnapshot,
  LocalPresenceSource,
  PresenceConnectionStatus,
  PresenceEntityType,
  PresenceEntry,
  PresenceState,
  TripPresence
} from "./types/presence.types";

type StoredLocalPresenceSource = LocalPresenceSource & {
  updatedAt: number;
};

type PresenceTransport = "websocket" | "local";

type PresenceStoreState = {
  presencesByClientId: Map<string, TripPresence>;
  localSourcesById: Map<string, StoredLocalPresenceSource>;
  connectionStatusByTripId: Map<string, PresenceConnectionStatus>;
  transportByTripId: Map<string, PresenceTransport>;
};

const staleAfterMs = 45_000;

export const presenceStore = createStore<PresenceStoreState>(() => ({
  presencesByClientId: new Map(),
  localSourcesById: new Map(),
  connectionStatusByTripId: new Map(),
  transportByTripId: new Map()
}));

function getEntityKey(tripId: string, entityType: PresenceEntityType, entityId: string) {
  return `${tripId}:${entityType}:${entityId}`;
}

function isFresh(presence: TripPresence, now = Date.now()) {
  return now - presence.lastSeen <= staleAfterMs;
}

function isActivePresence(presence: TripPresence, now = Date.now()) {
  return presence.status === "ACTIVE" && isFresh(presence, now);
}

function toFocusEntry(presence: TripPresence): PresenceEntry | null {
  if (!presence.focusedEntityType || !presence.focusedEntityId) {
    return null;
  }

  return {
    tripId: presence.tripId,
    clientId: presence.clientId,
    deviceId: presence.deviceId,
    userId: presence.userId,
    userName: presence.name,
    userAvatarUrl: presence.avatarUrl,
    entityType: presence.focusedEntityType,
    entityId: presence.focusedEntityId,
    state: "VIEWING",
    timestamp: presence.lastSeen
  };
}

function toEditingEntry(presence: TripPresence): PresenceEntry | null {
  if (!presence.editingEntityType || !presence.editingEntityId) {
    return null;
  }

  return {
    tripId: presence.tripId,
    clientId: presence.clientId,
    deviceId: presence.deviceId,
    userId: presence.userId,
    userName: presence.name,
    userAvatarUrl: presence.avatarUrl,
    entityType: presence.editingEntityType,
    entityId: presence.editingEntityId,
    state: presence.editingState ?? "EDITING",
    timestamp: presence.lastSeen
  };
}

function getPresenceEntries(presence: TripPresence) {
  const editingEntry = toEditingEntry(presence);
  const focusEntry = toFocusEntry(presence);

  if (
    editingEntry &&
    focusEntry &&
    getEntityKey(editingEntry.tripId, editingEntry.entityType, editingEntry.entityId) ===
      getEntityKey(focusEntry.tripId, focusEntry.entityType, focusEntry.entityId)
  ) {
    return [editingEntry];
  }

  return [editingEntry, focusEntry].filter((entry): entry is PresenceEntry => entry !== null);
}

function getActivePresences(tripId: string, excludeUserId?: string | undefined) {
  const now = Date.now();

  return Array.from(presenceStore.getState().presencesByClientId.values())
    .filter((presence) => presence.tripId === tripId && isActivePresence(presence, now))
    .filter((presence) => presence.userId !== excludeUserId)
    .sort((first, second) => second.lastSeen - first.lastSeen);
}

export function upsertTripPresence(presence: TripPresence) {
  presenceStore.setState((state) => {
    const nextPresences = new Map(state.presencesByClientId);
    nextPresences.set(presence.clientId, {
      ...presence,
      lastSeen: presence.lastSeen || Date.now()
    });

    return {
      presencesByClientId: nextPresences
    };
  });
}

export function removePresenceClient(clientId: string) {
  presenceStore.setState((state) => {
    if (!state.presencesByClientId.has(clientId)) {
      return state;
    }

    const nextPresences = new Map(state.presencesByClientId);
    nextPresences.delete(clientId);

    return {
      presencesByClientId: nextPresences
    };
  });
}

export function replaceTripPresenceSnapshot(
  tripId: string,
  presences: TripPresence[],
  currentClientId?: string | undefined
) {
  presenceStore.setState((state) => {
    const nextPresences = new Map(
      Array.from(state.presencesByClientId.entries()).filter(
        ([clientId, presence]) => presence.tripId !== tripId || clientId === currentClientId
      )
    );

    for (const presence of presences) {
      if (presence.clientId !== currentClientId) {
        nextPresences.set(presence.clientId, {
          ...presence,
          lastSeen: presence.lastSeen || Date.now()
        });
      }
    }

    return {
      presencesByClientId: nextPresences
    };
  });
}

export function pruneStalePresence() {
  const now = Date.now();

  presenceStore.setState((state) => {
    const nextPresences = new Map(
      Array.from(state.presencesByClientId.entries()).filter(([, presence]) =>
        isFresh(presence, now)
      )
    );

    if (nextPresences.size === state.presencesByClientId.size) {
      return state;
    }

    return {
      presencesByClientId: nextPresences
    };
  });
}

export function getTripPresenceEntries(tripId: string, excludeUserId?: string | undefined) {
  return getActivePresences(tripId, excludeUserId).flatMap(getPresenceEntries);
}

export function getEntityPresenceEntries(
  tripId: string,
  entityType: PresenceEntityType,
  entityId: string,
  excludeUserId?: string | undefined
) {
  const entityKey = getEntityKey(tripId, entityType, entityId);

  return getTripPresenceEntries(tripId, excludeUserId).filter(
    (entry) => getEntityKey(entry.tripId, entry.entityType, entry.entityId) === entityKey
  );
}

export function getTripPresences(tripId: string, excludeUserId?: string | undefined) {
  return getActivePresences(tripId, excludeUserId);
}

export function setLocalPresenceSource(sourceId: string, source: LocalPresenceSource) {
  presenceStore.setState((state) => {
    const nextSources = new Map(state.localSourcesById);
    nextSources.set(sourceId, { ...source, updatedAt: Date.now() });

    return {
      localSourcesById: nextSources
    };
  });
}

export function removeLocalPresenceSource(sourceId: string) {
  presenceStore.setState((state) => {
    if (!state.localSourcesById.has(sourceId)) {
      return state;
    }

    const nextSources = new Map(state.localSourcesById);
    nextSources.delete(sourceId);

    return {
      localSourcesById: nextSources
    };
  });
}

export function getActiveLocalPresenceSnapshot(tripId: string): LocalPresenceSnapshot {
  const sources = Array.from(presenceStore.getState().localSourcesById.values()).filter(
    (source) => source.tripId === tripId
  );
  const sortByPriority = (first: StoredLocalPresenceSource, second: StoredLocalPresenceSource) => {
    if (first.priority !== second.priority) {
      return second.priority - first.priority;
    }

    return second.updatedAt - first.updatedAt;
  };
  const focus = sources.filter((source) => source.state === "VIEWING").sort(sortByPriority)[0];
  const edit = sources
    .filter((source) => source.state === "EDITING" || source.state === "REPLYING")
    .sort(sortByPriority)[0];

  return {
    ...(focus ? { focus } : {}),
    ...(edit ? { edit } : {})
  };
}

export function getActiveLocalPresenceSource(tripId: string) {
  const snapshot = getActiveLocalPresenceSnapshot(tripId);

  return snapshot.edit ?? snapshot.focus;
}

export function setPresenceConnectionStatus(
  tripId: string,
  status: PresenceConnectionStatus,
  transport: PresenceTransport
) {
  presenceStore.setState((state) => {
    const nextStatuses = new Map(state.connectionStatusByTripId);
    const nextTransports = new Map(state.transportByTripId);
    nextStatuses.set(tripId, status);
    nextTransports.set(tripId, transport);

    return {
      connectionStatusByTripId: nextStatuses,
      transportByTripId: nextTransports
    };
  });
}

export function getPresenceConnectionStatus(tripId: string): PresenceConnectionStatus {
  return presenceStore.getState().connectionStatusByTripId.get(tripId) ?? "idle";
}

export function getPresenceTransport(tripId: string): PresenceTransport {
  return presenceStore.getState().transportByTripId.get(tripId) ?? "local";
}

export function clearTripPresence(tripId: string) {
  presenceStore.setState((state) => {
    const nextPresences = new Map(
      Array.from(state.presencesByClientId.entries()).filter(
        ([, presence]) => presence.tripId !== tripId
      )
    );
    const nextStatuses = new Map(state.connectionStatusByTripId);
    const nextTransports = new Map(state.transportByTripId);

    nextStatuses.delete(tripId);
    nextTransports.delete(tripId);

    return {
      presencesByClientId: nextPresences,
      connectionStatusByTripId: nextStatuses,
      transportByTripId: nextTransports
    };
  });
}

export function presenceStateRank(state: PresenceState) {
  const stateRank: Record<PresenceState, number> = {
    VIEWING: 1,
    EDITING: 2,
    REPLYING: 3
  };

  return stateRank[state];
}

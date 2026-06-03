"use client";

import type {
  LocalPresenceSource,
  PresenceEntry,
  PresenceEntityType
} from "../types/presence.types";

type Listener = () => void;

type StoredLocalPresenceSource = LocalPresenceSource & {
  updatedAt: number;
};

const staleAfterMs = 15_000;
const entriesByClientId = new Map<string, PresenceEntry>();
const tripListeners = new Map<string, Set<Listener>>();
const entityListeners = new Map<string, Set<Listener>>();
const localPresenceListeners = new Set<Listener>();
const localSources = new Map<string, StoredLocalPresenceSource>();

function getEntityKey(tripId: string, entityType: PresenceEntityType, entityId: string) {
  return `${tripId}:${entityType}:${entityId}`;
}

function getEntryEntityKey(entry: PresenceEntry) {
  return getEntityKey(entry.tripId, entry.entityType, entry.entityId);
}

function isFresh(entry: PresenceEntry) {
  return Date.now() - entry.timestamp <= staleAfterMs;
}

function notifyListeners(listeners: Set<Listener> | undefined) {
  listeners?.forEach((listener) => listener());
}

function notifyPresenceChange(previous?: PresenceEntry, next?: PresenceEntry) {
  const tripIds = new Set<string>();
  const entityKeys = new Set<string>();

  if (previous) {
    tripIds.add(previous.tripId);
    entityKeys.add(getEntryEntityKey(previous));
  }

  if (next) {
    tripIds.add(next.tripId);
    entityKeys.add(getEntryEntityKey(next));
  }

  tripIds.forEach((tripId) => notifyListeners(tripListeners.get(tripId)));
  entityKeys.forEach((entityKey) => notifyListeners(entityListeners.get(entityKey)));
}

function notifyLocalPresenceChange() {
  localPresenceListeners.forEach((listener) => listener());
}

export function subscribeTripPresence(tripId: string, listener: Listener) {
  const listeners = tripListeners.get(tripId) ?? new Set<Listener>();
  listeners.add(listener);
  tripListeners.set(tripId, listeners);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      tripListeners.delete(tripId);
    }
  };
}

export function subscribeEntityPresence(
  tripId: string,
  entityType: PresenceEntityType,
  entityId: string,
  listener: Listener
) {
  const entityKey = getEntityKey(tripId, entityType, entityId);
  const listeners = entityListeners.get(entityKey) ?? new Set<Listener>();
  listeners.add(listener);
  entityListeners.set(entityKey, listeners);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      entityListeners.delete(entityKey);
    }
  };
}

export function subscribeLocalPresence(listener: Listener) {
  localPresenceListeners.add(listener);

  return () => {
    localPresenceListeners.delete(listener);
  };
}

export function upsertPresenceEntry(entry: PresenceEntry) {
  const previous = entriesByClientId.get(entry.clientId);
  entriesByClientId.set(entry.clientId, entry);
  notifyPresenceChange(previous, entry);
}

export function removePresenceClient(clientId: string) {
  const previous = entriesByClientId.get(clientId);

  if (!previous) {
    return;
  }

  entriesByClientId.delete(clientId);
  notifyPresenceChange(previous);
}

export function pruneStalePresence() {
  const now = Date.now();

  entriesByClientId.forEach((entry, clientId) => {
    if (now - entry.timestamp <= staleAfterMs) {
      return;
    }

    entriesByClientId.delete(clientId);
    notifyPresenceChange(entry);
  });
}

export function getTripPresenceEntries(tripId: string, excludeUserId?: string) {
  return Array.from(entriesByClientId.values())
    .filter((entry) => entry.tripId === tripId && isFresh(entry))
    .filter((entry) => entry.userId !== excludeUserId)
    .sort((first, second) => second.timestamp - first.timestamp);
}

export function getEntityPresenceEntries(
  tripId: string,
  entityType: PresenceEntityType,
  entityId: string,
  excludeUserId?: string
) {
  return getTripPresenceEntries(tripId, excludeUserId).filter(
    (entry) => entry.entityType === entityType && entry.entityId === entityId
  );
}

export function setLocalPresenceSource(sourceId: string, source: LocalPresenceSource) {
  localSources.set(sourceId, { ...source, updatedAt: Date.now() });
  notifyLocalPresenceChange();
}

export function removeLocalPresenceSource(sourceId: string) {
  if (!localSources.delete(sourceId)) {
    return;
  }

  notifyLocalPresenceChange();
}

export function getActiveLocalPresenceSource(tripId: string) {
  return Array.from(localSources.values())
    .filter((source) => source.tripId === tripId)
    .sort((first, second) => {
      if (first.priority !== second.priority) {
        return second.priority - first.priority;
      }

      return second.updatedAt - first.updatedAt;
    })[0];
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { AuthUser } from "@/modules/auth/types/auth.types";

import {
  getActiveLocalPresenceSource,
  getEntityPresenceEntries,
  getTripPresenceEntries,
  pruneStalePresence,
  removeLocalPresenceSource,
  removePresenceClient,
  setLocalPresenceSource,
  subscribeEntityPresence,
  subscribeLocalPresence,
  subscribeTripPresence,
  upsertPresenceEntry
} from "../runtime/presence-store";
import type {
  LocalPresenceSource,
  PresenceEntityType,
  PresenceEntry,
  PresenceState
} from "../types/presence.types";

type PresenceMessage =
  | {
      type: "presence:update";
      entry: PresenceEntry;
    }
  | {
      type: "presence:leave";
      tripId: string;
      clientId: string;
    };

type UsePresenceSourceOptions = LocalPresenceSource & {
  enabled?: boolean | undefined;
};

const heartbeatMs = 5_000;
let presenceClientId: string | null = null;

function getPresenceClientId() {
  if (presenceClientId) {
    return presenceClientId;
  }

  presenceClientId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `presence:${Date.now()}:${Math.random().toString(36).slice(2)}`;

  return presenceClientId;
}

function getSourceId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `presence-source:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

function isPresenceMessage(value: unknown): value is PresenceMessage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as { type?: unknown };

  return candidate.type === "presence:update" || candidate.type === "presence:leave";
}

function getPresenceChannelName(tripId: string) {
  return `trip-planner-presence:${tripId}`;
}

export function useTripPresenceConnection({
  tripId,
  user
}: {
  tripId: string;
  user?: AuthUser | undefined;
}) {
  useEffect(() => {
    if (!user) {
      return;
    }

    const clientId = getPresenceClientId();
    const channel =
      typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel(getPresenceChannelName(tripId))
        : null;

    const publishActivePresence = () => {
      const activeSource = getActiveLocalPresenceSource(tripId);

      if (!activeSource) {
        return;
      }

      const entry: PresenceEntry = {
        ...activeSource,
        clientId,
        userId: user.id,
        userName: user.name,
        userAvatarUrl: user.avatarUrl,
        timestamp: Date.now()
      };

      upsertPresenceEntry(entry);
      channel?.postMessage({ type: "presence:update", entry } satisfies PresenceMessage);
    };

    const handleMessage = (event: MessageEvent<unknown>) => {
      if (!isPresenceMessage(event.data)) {
        return;
      }

      if (event.data.type === "presence:update") {
        if (event.data.entry.tripId === tripId && event.data.entry.clientId !== clientId) {
          upsertPresenceEntry(event.data.entry);
        }

        return;
      }

      if (event.data.tripId === tripId && event.data.clientId !== clientId) {
        removePresenceClient(event.data.clientId);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        publishActivePresence();
      }
    };

    channel?.addEventListener("message", handleMessage);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    const unsubscribeLocalPresence = subscribeLocalPresence(publishActivePresence);
    const heartbeat = window.setInterval(() => {
      pruneStalePresence();
      publishActivePresence();
    }, heartbeatMs);

    publishActivePresence();

    return () => {
      window.clearInterval(heartbeat);
      unsubscribeLocalPresence();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      channel?.postMessage({
        type: "presence:leave",
        tripId,
        clientId
      } satisfies PresenceMessage);
      channel?.removeEventListener("message", handleMessage);
      channel?.close();
      removePresenceClient(clientId);
    };
  }, [tripId, user]);
}

export function usePresenceSource({
  tripId,
  entityType,
  entityId,
  state,
  priority,
  enabled = true
}: UsePresenceSourceOptions) {
  const sourceIdRef = useRef<string | null>(null);

  if (sourceIdRef.current === null) {
    sourceIdRef.current = getSourceId();
  }

  useEffect(() => {
    const sourceId = sourceIdRef.current;

    if (!enabled || !sourceId) {
      if (sourceId) {
        removeLocalPresenceSource(sourceId);
      }

      return;
    }

    setLocalPresenceSource(sourceId, {
      tripId,
      entityType,
      entityId,
      state,
      priority
    });

    return () => removeLocalPresenceSource(sourceId);
  }, [enabled, entityId, entityType, priority, state, tripId]);
}

export function useTripPresenceEntries(tripId: string, excludeUserId?: string | undefined) {
  const [entries, setEntries] = useState<PresenceEntry[]>(() =>
    getTripPresenceEntries(tripId, excludeUserId)
  );

  useEffect(() => {
    const updateEntries = () => setEntries(getTripPresenceEntries(tripId, excludeUserId));

    updateEntries();

    return subscribeTripPresence(tripId, updateEntries);
  }, [excludeUserId, tripId]);

  return entries;
}

export function useEntityPresenceEntries({
  tripId,
  entityType,
  entityId,
  excludeUserId
}: {
  tripId: string;
  entityType: PresenceEntityType;
  entityId: string;
  excludeUserId?: string | undefined;
}) {
  const [entries, setEntries] = useState<PresenceEntry[]>(() =>
    getEntityPresenceEntries(tripId, entityType, entityId, excludeUserId)
  );

  useEffect(() => {
    const updateEntries = () =>
      setEntries(getEntityPresenceEntries(tripId, entityType, entityId, excludeUserId));

    updateEntries();

    return subscribeEntityPresence(tripId, entityType, entityId, updateEntries);
  }, [entityId, entityType, excludeUserId, tripId]);

  return entries;
}

export function useUniquePresenceUsers(entries: PresenceEntry[]) {
  return useMemo(() => getUniquePresenceUsers(entries), [entries]);
}

export function getUniquePresenceUsers(entries: PresenceEntry[]) {
  const stateRank: Record<PresenceState, number> = {
    VIEWING: 1,
    EDITING: 2,
    REPLYING: 3
  };
  const byUser = new Map<string, PresenceEntry>();

  for (const entry of entries) {
    const current = byUser.get(entry.userId);

    if (
      !current ||
      stateRank[entry.state] > stateRank[current.state] ||
      (stateRank[entry.state] === stateRank[current.state] && entry.timestamp > current.timestamp)
    ) {
      byUser.set(entry.userId, entry);
    }
  }

  return Array.from(byUser.values()).sort((first, second) => {
    if (stateRank[first.state] !== stateRank[second.state]) {
      return stateRank[second.state] - stateRank[first.state];
    }

    return second.timestamp - first.timestamp;
  });
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

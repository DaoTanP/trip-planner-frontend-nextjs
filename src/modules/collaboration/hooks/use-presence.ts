"use client";

import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";

import type { AuthUser } from "@/modules/auth/types/auth.types";
import { applyRealtimeTripUpdate } from "@/modules/sync/realtime/realtime-cache-updater";
import { reconcileRevisionGap } from "@/modules/sync/reconciliation/reconciliation";
import { tripKeys } from "@/modules/trips/queries/trip.queries";
import type { TripDetail } from "@/modules/trips/types/trip.types";

import {
  getActiveLocalPresenceSnapshot,
  getEntityPresenceEntries,
  getPresenceConnectionStatus,
  getPresenceTransport,
  getTripPresenceEntries,
  getTripPresences,
  presenceStateRank,
  presenceStore,
  removeLocalPresenceSource,
  setLocalPresenceSource
} from "../presence.store";
import {
  buildTripPresence,
  createPresenceId,
  getNoteThreadPresenceId,
  getPresenceClientId,
  getPresenceDeviceId
} from "../presence.service";
import { CollaborationPresenceTransport } from "../presence.websocket";
import type {
  LocalPresenceSource,
  PresenceConnectionStatus,
  PresenceEntityType,
  PresenceEntry
} from "../types/presence.types";

type UsePresenceSourceOptions = LocalPresenceSource & {
  enabled?: boolean | undefined;
};

const subscribePresenceStore = (onStoreChange: () => void) =>
  presenceStore.subscribe(onStoreChange);

function usePresenceSnapshot<T>(cacheKey: string, getSnapshotValue: () => T) {
  const snapshotRef = useRef<{
    cacheKey: string;
    state: ReturnType<typeof presenceStore.getState>;
    value: T;
  } | null>(null);

  const getSnapshot = useCallback(() => {
    const state = presenceStore.getState();
    const current = snapshotRef.current;

    if (current && current.cacheKey === cacheKey && current.state === state) {
      return current.value;
    }

    const value = getSnapshotValue();
    snapshotRef.current = { cacheKey, state, value };

    return value;
  }, [cacheKey, getSnapshotValue]);

  return useSyncExternalStore(subscribePresenceStore, getSnapshot, getSnapshot);
}

export function useTripPresenceConnection({
  tripId,
  user
}: {
  tripId: string;
  user?: AuthUser | undefined;
}) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) {
      return;
    }

    const clientId = getPresenceClientId();
    const deviceId = getPresenceDeviceId();
    const buildPresence = () =>
      buildTripPresence({
        tripId,
        user,
        clientId,
        deviceId,
        snapshot: getActiveLocalPresenceSnapshot(tripId)
      });
    const transport = new CollaborationPresenceTransport({
      tripId,
      clientId,
      deviceId,
      onConnected: () => {
        const currentRevision = queryClient.getQueryData<TripDetail>(
          tripKeys.detail(tripId)
        )?.revision;

        if (currentRevision) {
          void reconcileRevisionGap(queryClient, tripId, currentRevision);
        }
      },
      onTripUpdated: (event) => {
        void applyRealtimeTripUpdate(queryClient, event);
      },
      onPlanningInvalidated: (event) => {
        void queryClient.invalidateQueries({ queryKey: tripKeys.planning(event.tripId) });
        void queryClient.invalidateQueries({ queryKey: tripKeys.planningInsights(event.tripId) });
      }
    });

    const publishPresenceChange = () => {
      transport.publishPresence("presence.focus.changed");
      const snapshot = getActiveLocalPresenceSnapshot(tripId);

      if (snapshot.edit) {
        transport.publishPresence("presence.edit.started");
      } else {
        transport.publishPresence("presence.edit.stopped");
      }
    };

    const handleVisibilityChange = () => {
      publishPresenceChange();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    const unsubscribeLocalPresence = presenceStore.subscribe((state, previousState) => {
      if (state.localSourcesById !== previousState.localSourcesById) {
        publishPresenceChange();
      }
    });

    transport.start(() => buildPresence());
    publishPresenceChange();

    return () => {
      unsubscribeLocalPresence();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      transport.stop();
    };
  }, [queryClient, tripId, user]);
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
    sourceIdRef.current = createPresenceId("presence-source");
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
  const cacheKey = `trip-entries:${tripId}:${excludeUserId ?? ""}`;
  const getSnapshotValue = useCallback(
    () => getTripPresenceEntries(tripId, excludeUserId),
    [excludeUserId, tripId]
  );

  return usePresenceSnapshot(cacheKey, getSnapshotValue);
}

export function useTripPresences(tripId: string, excludeUserId?: string | undefined) {
  const cacheKey = `trip-presences:${tripId}:${excludeUserId ?? ""}`;
  const getSnapshotValue = useCallback(
    () => getTripPresences(tripId, excludeUserId),
    [excludeUserId, tripId]
  );

  return usePresenceSnapshot(cacheKey, getSnapshotValue);
}

export function usePresenceConnectionStatus(tripId: string): {
  status: PresenceConnectionStatus;
  transport: "websocket" | "local";
} {
  const getSnapshotValue = useCallback(
    () => ({
      status: getPresenceConnectionStatus(tripId),
      transport: getPresenceTransport(tripId)
    }),
    [tripId]
  );

  return usePresenceSnapshot(`connection:${tripId}`, getSnapshotValue);
}

export function useMarkerPresenceEntries({
  tripId,
  markerIdsByItemId,
  excludeUserId
}: {
  tripId: string;
  markerIdsByItemId: Map<string, string>;
  excludeUserId?: string | undefined;
}) {
  const markerCacheKey = useMemo(
    () =>
      Array.from(markerIdsByItemId.entries())
        .sort(([firstItemId], [secondItemId]) => firstItemId.localeCompare(secondItemId))
        .map(([itemId, markerId]) => `${itemId}:${markerId}`)
        .join("|"),
    [markerIdsByItemId]
  );
  const getSnapshotValue = useCallback(() => {
    const entriesByMarkerId = new Map<string, PresenceEntry[]>();
    const entries = getTripPresenceEntries(tripId, excludeUserId);

    entries.forEach((entry) => {
      if (entry.entityType !== "ITINERARY_ITEM") {
        return;
      }

      const markerId = markerIdsByItemId.get(entry.entityId);

      if (!markerId) {
        return;
      }

      entriesByMarkerId.set(markerId, [...(entriesByMarkerId.get(markerId) ?? []), entry]);
    });

    return entriesByMarkerId;
  }, [excludeUserId, markerIdsByItemId, tripId]);

  return usePresenceSnapshot(
    `marker-entries:${tripId}:${excludeUserId ?? ""}:${markerCacheKey}`,
    getSnapshotValue
  );
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
  const cacheKey = `entity-entries:${tripId}:${entityType}:${entityId}:${excludeUserId ?? ""}`;
  const getSnapshotValue = useCallback(
    () => getEntityPresenceEntries(tripId, entityType, entityId, excludeUserId),
    [entityId, entityType, excludeUserId, tripId]
  );

  return usePresenceSnapshot(cacheKey, getSnapshotValue);
}

export function useUniquePresenceUsers(entries: PresenceEntry[]) {
  return useMemo(() => getUniquePresenceUsers(entries), [entries]);
}

export function getUniquePresenceUsers(entries: PresenceEntry[]) {
  const byUser = new Map<string, PresenceEntry>();

  for (const entry of entries) {
    const current = byUser.get(entry.userId);

    if (
      !current ||
      presenceStateRank(entry.state) > presenceStateRank(current.state) ||
      (presenceStateRank(entry.state) === presenceStateRank(current.state) &&
        entry.timestamp > current.timestamp)
    ) {
      byUser.set(entry.userId, entry);
    }
  }

  return Array.from(byUser.values()).sort((first, second) => {
    if (presenceStateRank(first.state) !== presenceStateRank(second.state)) {
      return presenceStateRank(second.state) - presenceStateRank(first.state);
    }

    return second.timestamp - first.timestamp;
  });
}

export { getNoteThreadPresenceId };

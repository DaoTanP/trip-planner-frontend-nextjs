"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";

import { activityStore, getTripActivityEvents, subscribeActivityStore } from "../activity.store";

export function useActivityFeed(tripId: string) {
  const snapshotRef = useRef<{
    state: ReturnType<typeof activityStore.getState>;
    tripId: string;
    value: ReturnType<typeof getTripActivityEvents>;
  } | null>(null);

  const getSnapshot = useCallback(() => {
    const state = activityStore.getState();
    const current = snapshotRef.current;

    if (current && current.tripId === tripId && current.state === state) {
      return current.value;
    }

    const value = getTripActivityEvents(tripId);
    snapshotRef.current = { state, tripId, value };

    return value;
  }, [tripId]);

  return useSyncExternalStore(subscribeActivityStore, getSnapshot, getSnapshot);
}

"use client";

import { createStore } from "zustand/vanilla";

import type { MutationEventDto } from "@/services/api/contracts";

type ActivityStoreState = {
  eventsByTripId: Map<string, MutationEventDto[]>;
};

type ActivityListener = () => void;
const maxEventsPerTrip = 100;

export const activityStore = createStore<ActivityStoreState>(() => ({
  eventsByTripId: new Map()
}));

export function recordActivityEvent(event: MutationEventDto) {
  activityStore.setState((state) => {
    const currentEvents = state.eventsByTripId.get(event.tripId) ?? [];

    if (currentEvents.some((candidate) => candidate.id === event.id)) {
      return state;
    }

    const nextEvents = [event, ...currentEvents]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, maxEventsPerTrip);
    const nextEventsByTripId = new Map(state.eventsByTripId);
    nextEventsByTripId.set(event.tripId, nextEvents);

    return {
      eventsByTripId: nextEventsByTripId
    };
  });
}

export function getTripActivityEvents(tripId: string) {
  return activityStore.getState().eventsByTripId.get(tripId) ?? [];
}

export function subscribeActivityStore(listener: ActivityListener) {
  return activityStore.subscribe(listener);
}

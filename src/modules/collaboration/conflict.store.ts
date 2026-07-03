"use client";

import { createStore } from "zustand/vanilla";

import type { RevisionConflictDetails } from "@/modules/sync/types/sync.types";

import type { PresenceEntityType } from "./types/presence.types";

export type CollaborationConflict = {
  id: string;
  tripId: string;
  entityType: PresenceEntityType | string;
  entityId?: string | undefined;
  operation?: string | undefined;
  localPayload?: Record<string, unknown> | undefined;
  details: RevisionConflictDetails;
  createdAt: number;
};

type ConflictStoreState = {
  conflicts: CollaborationConflict[];
};

export const conflictStore = createStore<ConflictStoreState>(() => ({
  conflicts: []
}));

export function reportRevisionConflict(conflict: Omit<CollaborationConflict, "id" | "createdAt">) {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `conflict:${Date.now()}:${Math.random().toString(36).slice(2)}`;

  conflictStore.setState((state) => ({
    conflicts: [
      ...state.conflicts,
      {
        ...conflict,
        id,
        createdAt: Date.now()
      }
    ]
  }));
}

export function dismissRevisionConflict(conflictId: string) {
  conflictStore.setState((state) => ({
    conflicts: state.conflicts.filter((conflict) => conflict.id !== conflictId)
  }));
}

export function getActiveRevisionConflict(tripId?: string | undefined) {
  const conflicts = conflictStore.getState().conflicts;

  return tripId ? conflicts.find((conflict) => conflict.tripId === tripId) : (conflicts[0] ?? null);
}

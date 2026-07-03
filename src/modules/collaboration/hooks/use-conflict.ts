"use client";

import { useStore } from "zustand";

import { conflictStore, getActiveRevisionConflict } from "../conflict.store";

export function useActiveRevisionConflict(tripId?: string | undefined) {
  return useStore(conflictStore, () => getActiveRevisionConflict(tripId));
}

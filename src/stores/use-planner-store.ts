"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface PlannerFilters {
  query: string;
  type: string;
  status: string;
}

interface PlannerState {
  selectedTripId: string | undefined;
  selectedItemId: string | undefined;
  selectedPlaceId: string | undefined;
  selectedItemFocusRequestId: number;
  hoveredItemId: string | undefined;
  selectedRouteLegId: string | undefined;
  hoveredRouteLegId: string | undefined;
  filters: PlannerFilters;
  isFilterBarOpen: boolean;
  setSelectedTripId: (tripId?: string) => void;
  selectItem: (itemId?: string, placeId?: string) => void;
  setHoveredItemId: (itemId?: string) => void;
  selectRouteLeg: (routeLegId?: string) => void;
  setHoveredRouteLegId: (routeLegId?: string) => void;
  setFilters: (filters: Partial<PlannerFilters>) => void;
  clearFilters: () => void;
  setFilterBarOpen: (isOpen: boolean) => void;
}

const defaultFilters: PlannerFilters = {
  query: "",
  type: "ALL",
  status: "ALL"
};

export const usePlannerStore = create<PlannerState>()(
  persist(
    (set) => ({
      selectedTripId: undefined,
      selectedItemId: undefined,
      selectedPlaceId: undefined,
      selectedItemFocusRequestId: 0,
      hoveredItemId: undefined,
      selectedRouteLegId: undefined,
      hoveredRouteLegId: undefined,
      filters: defaultFilters,
      isFilterBarOpen: false,
      setSelectedTripId: (selectedTripId) =>
        set((state) =>
          state.selectedTripId === selectedTripId
            ? { selectedTripId }
            : {
                selectedTripId,
                selectedItemId: undefined,
                selectedPlaceId: undefined,
                selectedItemFocusRequestId: 0,
                hoveredItemId: undefined,
                selectedRouteLegId: undefined,
                hoveredRouteLegId: undefined
              }
        ),
      selectItem: (selectedItemId, selectedPlaceId) =>
        set((state) => ({
          selectedItemId,
          selectedPlaceId,
          selectedItemFocusRequestId: state.selectedItemFocusRequestId + 1,
          selectedRouteLegId: undefined
        })),
      setHoveredItemId: (hoveredItemId) => set({ hoveredItemId }),
      selectRouteLeg: (selectedRouteLegId) =>
        set({
          selectedRouteLegId,
          selectedItemId: undefined,
          selectedPlaceId: undefined,
          selectedItemFocusRequestId: 0
        }),
      setHoveredRouteLegId: (hoveredRouteLegId) => set({ hoveredRouteLegId }),
      setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
      clearFilters: () => set({ filters: defaultFilters }),
      setFilterBarOpen: (isFilterBarOpen) => set({ isFilterBarOpen })
    }),
    {
      name: "trip-planner-workspace",
      version: 2,
      migrate: (persistedState) => {
        if (!persistedState || typeof persistedState !== "object") {
          return persistedState;
        }

        const state = {
          ...(persistedState as Partial<PlannerState> & {
            viewport?: unknown;
          })
        };
        delete state.viewport;

        return state;
      },
      partialize: (state) => ({
        filters: state.filters
      })
    }
  )
);

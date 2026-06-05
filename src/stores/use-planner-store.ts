"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { mapConfig } from "@/modules/map/config/map.config";
import type { MapViewport } from "@/modules/map/types/map.types";

export interface PlannerFilters {
  query: string;
  type: string;
  status: string;
}

interface PlannerState {
  selectedTripId: string | undefined;
  selectedItemId: string | undefined;
  selectedPlaceId: string | undefined;
  hoveredItemId: string | undefined;
  selectedRouteLegId: string | undefined;
  hoveredRouteLegId: string | undefined;
  filters: PlannerFilters;
  viewport: MapViewport;
  isFilterBarOpen: boolean;
  setSelectedTripId: (tripId?: string) => void;
  selectItem: (itemId?: string, placeId?: string) => void;
  setHoveredItemId: (itemId?: string) => void;
  selectRouteLeg: (routeLegId?: string) => void;
  setHoveredRouteLegId: (routeLegId?: string) => void;
  setFilters: (filters: Partial<PlannerFilters>) => void;
  clearFilters: () => void;
  setViewport: (viewport: MapViewport) => void;
  setFilterBarOpen: (isOpen: boolean) => void;
}

const defaultFilters: PlannerFilters = {
  query: "",
  type: "ALL",
  status: "ALL"
};

const defaultViewport: MapViewport = {
  latitude: mapConfig.defaultViewport.latitude,
  longitude: mapConfig.defaultViewport.longitude,
  zoom: mapConfig.defaultViewport.zoom
};

export const usePlannerStore = create<PlannerState>()(
  persist(
    (set) => ({
      selectedTripId: undefined,
      selectedItemId: undefined,
      selectedPlaceId: undefined,
      hoveredItemId: undefined,
      selectedRouteLegId: undefined,
      hoveredRouteLegId: undefined,
      filters: defaultFilters,
      viewport: defaultViewport,
      isFilterBarOpen: false,
      setSelectedTripId: (selectedTripId) =>
        set((state) =>
          state.selectedTripId === selectedTripId
            ? { selectedTripId }
            : {
                selectedTripId,
                selectedItemId: undefined,
                selectedPlaceId: undefined,
                hoveredItemId: undefined,
                selectedRouteLegId: undefined,
                hoveredRouteLegId: undefined
              }
        ),
      selectItem: (selectedItemId, selectedPlaceId) =>
        set({ selectedItemId, selectedPlaceId, selectedRouteLegId: undefined }),
      setHoveredItemId: (hoveredItemId) => set({ hoveredItemId }),
      selectRouteLeg: (selectedRouteLegId) =>
        set({ selectedRouteLegId, selectedItemId: undefined, selectedPlaceId: undefined }),
      setHoveredRouteLegId: (hoveredRouteLegId) => set({ hoveredRouteLegId }),
      setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
      clearFilters: () => set({ filters: defaultFilters }),
      setViewport: (viewport) => set({ viewport }),
      setFilterBarOpen: (isFilterBarOpen) => set({ isFilterBarOpen })
    }),
    {
      name: "trip-planner-workspace",
      partialize: (state) => ({
        filters: state.filters,
        viewport: state.viewport
      })
    }
  )
);

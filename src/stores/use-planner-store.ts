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
  selectedRouteSegmentId: string | undefined;
  hoveredRouteSegmentId: string | undefined;
  filters: PlannerFilters;
  viewport: MapViewport;
  isFilterBarOpen: boolean;
  setSelectedTripId: (tripId?: string) => void;
  selectItem: (itemId?: string, placeId?: string) => void;
  setHoveredItemId: (itemId?: string) => void;
  selectRouteSegment: (routeSegmentId?: string) => void;
  setHoveredRouteSegmentId: (routeSegmentId?: string) => void;
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
      selectedRouteSegmentId: undefined,
      hoveredRouteSegmentId: undefined,
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
                selectedRouteSegmentId: undefined,
                hoveredRouteSegmentId: undefined
              }
        ),
      selectItem: (selectedItemId, selectedPlaceId) =>
        set({ selectedItemId, selectedPlaceId, selectedRouteSegmentId: undefined }),
      setHoveredItemId: (hoveredItemId) => set({ hoveredItemId }),
      selectRouteSegment: (selectedRouteSegmentId) =>
        set({ selectedRouteSegmentId, selectedItemId: undefined, selectedPlaceId: undefined }),
      setHoveredRouteSegmentId: (hoveredRouteSegmentId) => set({ hoveredRouteSegmentId }),
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

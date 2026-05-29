"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { mapConfig } from "@/modules/map/config/map.config";
import type { MapViewport } from "@/modules/map/types/map.types";

export type PlannerGroupingMode = "day" | "city" | "type" | "flat";
export type PlannerQuickAddType =
  | "place"
  | "activity"
  | "note"
  | "transport"
  | "lodging"
  | "expense";

interface PlannerDraftStop {
  placeId: string;
  order: number;
}

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
  activeRouteItemId: string | undefined;
  draftStops: PlannerDraftStop[];
  filters: PlannerFilters;
  groupingMode: PlannerGroupingMode;
  viewport: MapViewport;
  isPlaceSearchOpen: boolean;
  isCommandPaletteOpen: boolean;
  isMobileMapOpen: boolean;
  quickAddType: PlannerQuickAddType | undefined;
  setSelectedTripId: (tripId?: string) => void;
  selectItem: (itemId?: string, placeId?: string) => void;
  setHoveredItemId: (itemId?: string) => void;
  setActiveRouteItemId: (itemId?: string) => void;
  setFilters: (filters: Partial<PlannerFilters>) => void;
  clearFilters: () => void;
  setGroupingMode: (groupingMode: PlannerGroupingMode) => void;
  setViewport: (viewport: MapViewport) => void;
  setPlaceSearchOpen: (isOpen: boolean) => void;
  setCommandPaletteOpen: (isOpen: boolean) => void;
  setMobileMapOpen: (isOpen: boolean) => void;
  setQuickAddType: (quickAddType?: PlannerQuickAddType) => void;
  addDraftStop: (stop: PlannerDraftStop) => void;
  clearDraftStops: () => void;
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
      activeRouteItemId: undefined,
      draftStops: [],
      filters: defaultFilters,
      groupingMode: "day",
      viewport: defaultViewport,
      isPlaceSearchOpen: false,
      isCommandPaletteOpen: false,
      isMobileMapOpen: false,
      quickAddType: undefined,
      setSelectedTripId: (selectedTripId) => set({ selectedTripId }),
      selectItem: (selectedItemId, selectedPlaceId) => set({ selectedItemId, selectedPlaceId }),
      setHoveredItemId: (hoveredItemId) => set({ hoveredItemId }),
      setActiveRouteItemId: (activeRouteItemId) => set({ activeRouteItemId }),
      setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
      clearFilters: () => set({ filters: defaultFilters }),
      setGroupingMode: (groupingMode) => set({ groupingMode }),
      setViewport: (viewport) => set({ viewport }),
      setPlaceSearchOpen: (isPlaceSearchOpen) => set({ isPlaceSearchOpen }),
      setCommandPaletteOpen: (isCommandPaletteOpen) => set({ isCommandPaletteOpen }),
      setMobileMapOpen: (isMobileMapOpen) => set({ isMobileMapOpen }),
      setQuickAddType: (quickAddType) => set({ quickAddType }),
      addDraftStop: (stop) => set((state) => ({ draftStops: [...state.draftStops, stop] })),
      clearDraftStops: () => set({ draftStops: [] })
    }),
    {
      name: "trip-planner-workspace",
      partialize: (state) => ({
        filters: state.filters,
        groupingMode: state.groupingMode,
        viewport: state.viewport
      })
    }
  )
);

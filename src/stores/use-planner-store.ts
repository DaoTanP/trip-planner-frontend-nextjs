"use client";

import { create } from "zustand";

import { mapConfig } from "@/modules/map/config/map.config";
import type { MapViewport } from "@/modules/map/types/map.types";

interface PlannerDraftStop {
  placeId: string;
  order: number;
}

interface PlannerFilters {
  query: string;
}

interface PlannerState {
  selectedTripId: string | undefined;
  selectedItemId: string | undefined;
  selectedPlaceId: string | undefined;
  hoveredItemId: string | undefined;
  draftStops: PlannerDraftStop[];
  filters: PlannerFilters;
  viewport: MapViewport;
  isPlaceSearchOpen: boolean;
  setSelectedTripId: (tripId?: string) => void;
  selectItem: (itemId?: string, placeId?: string) => void;
  setHoveredItemId: (itemId?: string) => void;
  setFilters: (filters: Partial<PlannerFilters>) => void;
  setViewport: (viewport: MapViewport) => void;
  setPlaceSearchOpen: (isOpen: boolean) => void;
  addDraftStop: (stop: PlannerDraftStop) => void;
  clearDraftStops: () => void;
}

export const usePlannerStore = create<PlannerState>((set) => ({
  selectedTripId: undefined,
  selectedItemId: undefined,
  selectedPlaceId: undefined,
  hoveredItemId: undefined,
  draftStops: [],
  filters: {
    query: ""
  },
  viewport: {
    latitude: mapConfig.defaultViewport.latitude,
    longitude: mapConfig.defaultViewport.longitude,
    zoom: mapConfig.defaultViewport.zoom
  },
  isPlaceSearchOpen: false,
  setSelectedTripId: (selectedTripId) => set({ selectedTripId }),
  selectItem: (selectedItemId, selectedPlaceId) => set({ selectedItemId, selectedPlaceId }),
  setHoveredItemId: (hoveredItemId) => set({ hoveredItemId }),
  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
  setViewport: (viewport) => set({ viewport }),
  setPlaceSearchOpen: (isPlaceSearchOpen) => set({ isPlaceSearchOpen }),
  addDraftStop: (stop) => set((state) => ({ draftStops: [...state.draftStops, stop] })),
  clearDraftStops: () => set({ draftStops: [] })
}));

"use client";

import { create } from "zustand";

interface PlannerDraftStop {
  placeId: string;
  day: number;
  order: number;
}

interface PlannerFilters {
  query: string;
  day?: number;
}

interface MapViewport {
  latitude: number;
  longitude: number;
  zoom: number;
}

interface PlannerState {
  selectedTripId: string | undefined;
  draftStops: PlannerDraftStop[];
  filters: PlannerFilters;
  viewport: MapViewport;
  setSelectedTripId: (tripId?: string) => void;
  setFilters: (filters: Partial<PlannerFilters>) => void;
  setViewport: (viewport: MapViewport) => void;
  addDraftStop: (stop: PlannerDraftStop) => void;
  clearDraftStops: () => void;
}

export const usePlannerStore = create<PlannerState>((set) => ({
  selectedTripId: undefined,
  draftStops: [],
  filters: {
    query: ""
  },
  viewport: {
    latitude: 21.0278,
    longitude: 105.8342,
    zoom: 11
  },
  setSelectedTripId: (selectedTripId) => set({ selectedTripId }),
  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
  setViewport: (viewport) => set({ viewport }),
  addDraftStop: (stop) => set((state) => ({ draftStops: [...state.draftStops, stop] })),
  clearDraftStops: () => set({ draftStops: [] })
}));

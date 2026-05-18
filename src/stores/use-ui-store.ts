"use client";

import { create } from "zustand";

type ModalName = "createTrip" | "deleteTrip" | "placeSearch" | null;

interface UiState {
  activeModal: ModalName;
  sidebarOpen: boolean;
  openModal: (modal: Exclude<ModalName, null>) => void;
  closeModal: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeModal: null,
  sidebarOpen: false,
  openModal: (modal) => set({ activeModal: modal }),
  closeModal: () => set({ activeModal: null }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen })
}));

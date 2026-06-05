"use client";

import { useMemo } from "react";

import type { CollaborativeNote } from "@/modules/notes/types/note.types";

export type VisibleStopNoteTarget = {
  itemId: string;
  noteCount: number | null;
};

export type StopNotePreviewState = {
  notes: CollaborativeNote[];
  noteCount: number | null;
  hasMoreNotes: boolean;
  isLoading: boolean;
};

type UseItineraryNotePreviewsOptions = {
  visibleStops: VisibleStopNoteTarget[];
};

export function useItineraryNotePreviews({ visibleStops }: UseItineraryNotePreviewsOptions) {
  const previewsByItem = useMemo(() => {
    const nextPreviews = new Map<string, StopNotePreviewState>();

    for (const stop of visibleStops) {
      nextPreviews.set(stop.itemId, {
        notes: [],
        noteCount: stop.noteCount,
        hasMoreNotes: stop.noteCount === null ? false : stop.noteCount > 0,
        isLoading: false
      });
    }

    return nextPreviews;
  }, [visibleStops]);

  return {
    previewsByItem,
    queryCount: 0,
    loadedPageCount: 0
  };
}

"use client";

import { useEffect, useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";

import { notesInfiniteQueryOptions } from "@/modules/notes/queries/note.queries";
import type { CollaborativeNote, ListNotesQuery } from "@/modules/notes/types/note.types";

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
  tripId: string;
  visibleStops: VisibleStopNoteTarget[];
  previewLimit?: number;
  maxPages?: number;
};

const notePreviewPageSize = 100;
const defaultPreviewLimit = 3;
const defaultMaxPreviewPages = 3;

export function useItineraryNotePreviews({
  tripId,
  visibleStops,
  previewLimit = defaultPreviewLimit,
  maxPages = defaultMaxPreviewPages
}: UseItineraryNotePreviewsOptions) {
  const filters = useMemo<ListNotesQuery>(
    () => ({
      tripId,
      targetEntityType: "ITINERARY_ITEM",
      limit: notePreviewPageSize
    }),
    [tripId]
  );
  const shouldLoadPreviews = visibleStops.length > 0;
  const notesQuery = useInfiniteQuery({
    ...notesInfiniteQueryOptions(filters),
    enabled: shouldLoadPreviews
  });
  const visibleStopByItem = useMemo(
    () => new Map(visibleStops.map((stop) => [stop.itemId, stop])),
    [visibleStops]
  );
  const groupedNotes = useMemo(() => {
    const notesByItem = new Map<string, CollaborativeNote[]>();
    const loadedCountByItem = new Map<string, number>();

    for (const stop of visibleStops) {
      notesByItem.set(stop.itemId, []);
      loadedCountByItem.set(stop.itemId, 0);
    }

    for (const note of notesQuery.data?.pages.flatMap((page) => page.items) ?? []) {
      if (
        note.deletedAt !== null ||
        note.targetEntityType !== "ITINERARY_ITEM" ||
        note.parentNoteId !== null ||
        !visibleStopByItem.has(note.targetEntityId)
      ) {
        continue;
      }

      const itemNotes = notesByItem.get(note.targetEntityId) ?? [];
      loadedCountByItem.set(
        note.targetEntityId,
        (loadedCountByItem.get(note.targetEntityId) ?? 0) + 1
      );

      if (itemNotes.length < previewLimit) {
        notesByItem.set(note.targetEntityId, [...itemNotes, note]);
      }
    }

    return { loadedCountByItem, notesByItem };
  }, [notesQuery.data, previewLimit, visibleStopByItem, visibleStops]);
  const needsMorePreviewData = useMemo(() => {
    if (!notesQuery.data) {
      return false;
    }

    return visibleStops.some((stop) => {
      if (stop.noteCount === null || stop.noteCount <= 0) {
        return false;
      }

      const loadedCount = groupedNotes.loadedCountByItem.get(stop.itemId) ?? 0;

      return loadedCount < Math.min(stop.noteCount, previewLimit);
    });
  }, [groupedNotes.loadedCountByItem, notesQuery.data, previewLimit, visibleStops]);
  const loadedPageCount = notesQuery.data?.pages.length ?? 0;
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = notesQuery;

  useEffect(() => {
    if (
      !shouldLoadPreviews ||
      !needsMorePreviewData ||
      !hasNextPage ||
      isFetchingNextPage ||
      loadedPageCount >= maxPages
    ) {
      return;
    }

    void fetchNextPage();
  }, [
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    loadedPageCount,
    maxPages,
    needsMorePreviewData,
    shouldLoadPreviews
  ]);

  const previewsByItem = useMemo(() => {
    const nextPreviews = new Map<string, StopNotePreviewState>();

    for (const stop of visibleStops) {
      const notes = groupedNotes.notesByItem.get(stop.itemId) ?? [];
      const loadedCount = groupedNotes.loadedCountByItem.get(stop.itemId) ?? 0;
      const knownMoreCount = stop.noteCount === null ? false : stop.noteCount > notes.length;

      nextPreviews.set(stop.itemId, {
        notes,
        noteCount: stop.noteCount,
        hasMoreNotes: knownMoreCount || loadedCount > notes.length,
        isLoading: notesQuery.isLoading
      });
    }

    return nextPreviews;
  }, [
    groupedNotes.loadedCountByItem,
    groupedNotes.notesByItem,
    notesQuery.isLoading,
    visibleStops
  ]);

  return {
    previewsByItem,
    queryCount: shouldLoadPreviews ? 1 : 0,
    loadedPageCount
  };
}

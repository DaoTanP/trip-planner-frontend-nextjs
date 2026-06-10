"use client";

import { useEffect, useState } from "react";
import { type InfiniteData, useQueryClient } from "@tanstack/react-query";

import { noteKeys } from "@/modules/notes/queries/note.queries";
import type { CollaborativeNote } from "@/modules/notes/types/note.types";
import type { CursorPage } from "@/modules/notes/types/note.types";

export type VisibleStopNoteTarget = {
  itemId: string;
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
};

type NotesInfiniteData = InfiniteData<CursorPage<CollaborativeNote>, string | undefined>;

export function useItineraryNotePreviews({
  tripId,
  visibleStops
}: UseItineraryNotePreviewsOptions) {
  const queryClient = useQueryClient();
  const [, setCacheVersion] = useState(0);

  useEffect(
    () =>
      queryClient.getQueryCache().subscribe((event) => {
        if (event.query.queryKey[0] === "notes") {
          setCacheVersion((current) => current + 1);
        }
      }),
    [queryClient]
  );

  const previewsByItem = new Map<string, StopNotePreviewState>();

  for (const stop of visibleStops) {
    const queryKey = noteKeys.target("ITINERARY_ITEM", stop.itemId, tripId);
    const queryState = queryClient.getQueryState<NotesInfiniteData>(queryKey);
    const data = queryClient.getQueryData<NotesInfiniteData>(queryKey);
    const notes =
      data?.pages
        .flatMap((page) => page.items)
        .filter((note) => note.parentNoteId === null && note.deletedAt === null) ?? [];
    const nextCursor = data?.pages.at(-1)?.pagination.nextCursor ?? null;
    const noteCount = data ? notes.length : null;

    previewsByItem.set(stop.itemId, {
      notes,
      noteCount,
      hasMoreNotes: nextCursor !== null,
      isLoading: queryState?.fetchStatus === "fetching"
    });
  }

  return {
    previewsByItem,
    queryCount: 0,
    loadedPageCount: 0
  };
}

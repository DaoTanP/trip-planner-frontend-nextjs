import { infiniteQueryOptions } from "@tanstack/react-query";

import { getNotes } from "../services/notes.service";
import type { ListNotesQuery } from "../types/note.types";

const normalizeNoteFilters = (filters: ListNotesQuery) => ({
  ...(filters.tripId ? { tripId: filters.tripId } : {}),
  ...(filters.targetEntityType ? { targetEntityType: filters.targetEntityType } : {}),
  ...(filters.targetEntityId ? { targetEntityId: filters.targetEntityId } : {}),
  ...(filters.parentNoteId ? { parentNoteId: filters.parentNoteId } : {}),
  ...(filters.limit ? { limit: filters.limit } : {})
});

export const noteKeys = {
  all: ["notes"] as const,
  lists: () => [...noteKeys.all, "list"] as const,
  list: (filters: ListNotesQuery) => [...noteKeys.lists(), normalizeNoteFilters(filters)] as const,
  target: (
    targetEntityType: NonNullable<ListNotesQuery["targetEntityType"]>,
    targetEntityId: string,
    tripId?: string,
    parentNoteId?: string
  ) => {
    const filters: ListNotesQuery = {
      targetEntityType,
      targetEntityId
    };

    if (tripId !== undefined) filters.tripId = tripId;
    if (parentNoteId !== undefined) filters.parentNoteId = parentNoteId;

    return noteKeys.list(filters);
  }
};

export function notesInfiniteQueryOptions(filters: ListNotesQuery) {
  return infiniteQueryOptions({
    queryKey: noteKeys.list(filters),
    queryFn: ({ signal, pageParam }) => {
      const nextFilters: ListNotesQuery = { ...filters };
      if (typeof pageParam === "string") nextFilters.cursor = pageParam;

      return getNotes(nextFilters, signal);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    staleTime: 15_000
  });
}

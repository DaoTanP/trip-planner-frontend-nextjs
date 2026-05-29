import { useMemo } from "react";

import type { ListNotesQuery, NoteTargetEntityType } from "../types/note.types";

type UseNoteFiltersInput = {
  tripId?: string | undefined;
  targetEntityType: NoteTargetEntityType;
  targetEntityId: string;
  parentNoteId?: string | undefined;
};

export function useNoteFilters({
  tripId,
  targetEntityType,
  targetEntityId,
  parentNoteId
}: UseNoteFiltersInput): ListNotesQuery {
  return useMemo(() => {
    const filters: ListNotesQuery = {
      targetEntityType,
      targetEntityId
    };

    if (tripId !== undefined) filters.tripId = tripId;
    if (parentNoteId !== undefined) filters.parentNoteId = parentNoteId;

    return filters;
  }, [parentNoteId, targetEntityId, targetEntityType, tripId]);
}

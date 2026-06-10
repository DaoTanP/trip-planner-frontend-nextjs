"use client";

import {
  type InfiniteData,
  type QueryClient,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";

import type { TripDetailDto } from "@/services/api/contracts";
import { syncMutationQueue } from "@/modules/sync/queue/mutation-queue";
import { runQueuedMutation } from "@/modules/sync/runtime/sync-runtime";
import { tripKeys } from "@/modules/trips/queries/trip.queries";

import { noteKeys } from "../queries/note.queries";
import { createNote, deleteNote, updateNote } from "../services/notes.service";
import type {
  CollaborativeNote,
  CreateNotePayload,
  CursorPage,
  DeleteNoteQuery,
  ListNotesQuery,
  UpdateNotePayload
} from "../types/note.types";

type NotesInfiniteData = InfiniteData<CursorPage<CollaborativeNote>, string | undefined>;

const defaultNotesPagination = {
  limit: 50,
  cursorVersion: 1,
  nextCursor: null,
  hasNextPage: false
} satisfies CursorPage<CollaborativeNote>["pagination"];

const singleNotePage = (note: CollaborativeNote): NotesInfiniteData => ({
  pages: [{ items: [note], pagination: defaultNotesPagination }],
  pageParams: [undefined]
});

const appendNote = (
  current: NotesInfiniteData | undefined,
  note: CollaborativeNote
): NotesInfiniteData =>
  current
    ? {
        ...current,
        pages: current.pages.map((page, index) =>
          index === current.pages.length - 1 ? { ...page, items: [...page.items, note] } : page
        )
      }
    : singleNotePage(note);

const replaceNote = (
  current: NotesInfiniteData | undefined,
  note: CollaborativeNote,
  fallbackId?: string
): NotesInfiniteData | undefined =>
  current
    ? {
        ...current,
        pages: current.pages.map((page) => ({
          ...page,
          items: page.items.map((candidate) =>
            candidate.id === note.id || candidate.id === fallbackId ? note : candidate
          )
        }))
      }
    : current;

const patchNote = (
  current: NotesInfiniteData | undefined,
  noteId: string,
  patch: (note: CollaborativeNote) => CollaborativeNote
): NotesInfiniteData | undefined =>
  current
    ? {
        ...current,
        pages: current.pages.map((page) => ({
          ...page,
          items: page.items.map((note) => (note.id === noteId ? patch(note) : note))
        }))
      }
    : current;

const patchTripRevision = (
  queryClient: QueryClient,
  tripId: string | null,
  revision: string,
  noteCountDelta = 0
) => {
  if (!tripId) return;

  queryClient.setQueryData<TripDetailDto>(tripKeys.detail(tripId), (current) =>
    current
      ? {
          ...current,
          revision,
          noteCount: Math.max(0, current.noteCount + noteCountDelta)
        }
      : current
  );
};

const getTripRevision = (queryClient: QueryClient, tripId: string | null) =>
  tripId ? queryClient.getQueryData<TripDetailDto>(tripKeys.detail(tripId))?.revision : undefined;

const getUsableTripRevision = (queryClient: QueryClient, tripId: string | null) => {
  if (!tripId) {
    return undefined;
  }

  const queryState = queryClient.getQueryState<TripDetailDto>(tripKeys.detail(tripId));
  const hasPendingTripMutation = syncMutationQueue
    .getSnapshot()
    .some((entry) => entry.tripId === tripId && entry.state !== "acknowledged");

  if (
    hasPendingTripMutation ||
    queryState?.isInvalidated ||
    queryState?.fetchStatus === "fetching"
  ) {
    return undefined;
  }

  return getTripRevision(queryClient, tripId);
};

const findCachedNote = (queryClient: QueryClient, noteId: string) => {
  const noteQueries = queryClient.getQueriesData<NotesInfiniteData>({
    queryKey: noteKeys.lists()
  });

  for (const [, data] of noteQueries) {
    const note = data?.pages
      .flatMap((page) => page.items)
      .find((candidate) => candidate.id === noteId);
    if (note) {
      return note;
    }
  }

  return null;
};

const resolveCreateTripId = (payload: CreateNotePayload, filters: ListNotesQuery) =>
  payload.tripId ??
  filters.tripId ??
  (payload.targetEntityType === "TRIP" ? payload.targetEntityId : null);

const withNoteMutationMeta = <
  TPayload extends { clientMutationId?: string; expectedRevision?: string }
>(
  payload: TPayload,
  queryClient: QueryClient,
  tripId: string | null
): TPayload & { clientMutationId: string } => {
  const nextPayload: TPayload & { clientMutationId: string } = {
    ...payload,
    clientMutationId: payload.clientMutationId ?? crypto.randomUUID()
  };
  const expectedRevision = payload.expectedRevision ?? getUsableTripRevision(queryClient, tripId);

  if (expectedRevision !== undefined) {
    nextPayload.expectedRevision = expectedRevision;
  }

  return nextPayload;
};

const createOptimisticNote = (
  payload: CreateNotePayload,
  clientMutationId: string
): CollaborativeNote => {
  const now = new Date().toISOString();

  return {
    id: `optimistic:${clientMutationId}`,
    tripId: payload.tripId ?? null,
    authorId: null,
    author: null,
    parentNoteId: payload.parentNoteId ?? null,
    targetEntityType: payload.targetEntityType,
    targetEntityId: payload.targetEntityId,
    body: payload.body,
    mentions: payload.mentions ?? null,
    attachments: payload.attachments ?? null,
    metadata: payload.metadata ?? null,
    version: 1,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    isPending: true
  };
};

export function useCreateNoteMutation(filters: ListNotesQuery) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateNotePayload) => {
      const tripId = resolveCreateTripId(payload, filters);
      const nextPayload = withNoteMutationMeta(payload, queryClient, tripId);

      if (!tripId) {
        return createNote(nextPayload);
      }

      return runQueuedMutation({
        tripId,
        clientMutationId: nextPayload.clientMutationId,
        entityType: "NOTE",
        operation: "ENTITY_CREATED",
        payload: nextPayload as Record<string, unknown>,
        mutationFn: () => createNote(nextPayload)
      });
    },
    onMutate: async (payload) => {
      const clientMutationId = payload.clientMutationId ?? crypto.randomUUID();
      payload.clientMutationId = clientMutationId;
      const optimisticNote = createOptimisticNote(
        { ...payload, clientMutationId },
        clientMutationId
      );

      await queryClient.cancelQueries({ queryKey: noteKeys.list(filters) });
      const previous = queryClient.getQueryData<NotesInfiniteData>(noteKeys.list(filters));

      queryClient.setQueryData<NotesInfiniteData>(noteKeys.list(filters), (current) =>
        appendNote(current, optimisticNote)
      );

      return { previous, optimisticId: optimisticNote.id };
    },
    onError: (_error, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(noteKeys.list(filters), context.previous);
      }
    },
    onSuccess: (result, _payload, context) => {
      queryClient.setQueryData<NotesInfiniteData>(noteKeys.list(filters), (current) =>
        replaceNote(current, result.note, context?.optimisticId)
      );
      patchTripRevision(queryClient, result.note.tripId, result.revision, 1);
    }
  });
}

export function useUpdateNoteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ noteId, payload }: { noteId: string; payload: UpdateNotePayload }) => {
      const tripId = findCachedNote(queryClient, noteId)?.tripId ?? null;
      const nextPayload = withNoteMutationMeta(payload, queryClient, tripId);

      if (!tripId) {
        return updateNote(noteId, nextPayload);
      }

      return runQueuedMutation({
        tripId,
        clientMutationId: nextPayload.clientMutationId,
        entityType: "NOTE",
        entityId: noteId,
        operation: "ENTITY_UPDATED",
        payload: nextPayload as Record<string, unknown>,
        mutationFn: () => updateNote(noteId, nextPayload)
      });
    },
    onMutate: async ({ noteId, payload }) => {
      payload.clientMutationId = payload.clientMutationId ?? crypto.randomUUID();
      await queryClient.cancelQueries({ queryKey: noteKeys.lists() });
      const previous = queryClient.getQueriesData<NotesInfiniteData>({
        queryKey: noteKeys.lists()
      });
      const now = new Date().toISOString();

      queryClient.setQueriesData<NotesInfiniteData>({ queryKey: noteKeys.lists() }, (current) =>
        patchNote(current, noteId, (note) => ({
          ...note,
          ...(payload.body !== undefined ? { body: payload.body } : {}),
          ...(payload.mentions !== undefined ? { mentions: payload.mentions } : {}),
          ...(payload.attachments !== undefined ? { attachments: payload.attachments } : {}),
          ...(payload.metadata !== undefined ? { metadata: payload.metadata } : {}),
          updatedAt: now,
          isPending: true
        }))
      );

      return { previous };
    },
    onError: (_error, _variables, context) => {
      context?.previous.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSuccess: (result) => {
      queryClient.setQueriesData<NotesInfiniteData>({ queryKey: noteKeys.lists() }, (current) =>
        replaceNote(current, result.note)
      );
      patchTripRevision(queryClient, result.note.tripId, result.revision);
    }
  });
}

export function useDeleteNoteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ noteId, params }: { noteId: string; params?: DeleteNoteQuery }) => {
      const tripId = findCachedNote(queryClient, noteId)?.tripId ?? null;
      const nextParams = withNoteMutationMeta(params ?? {}, queryClient, tripId);

      if (!tripId) {
        return deleteNote(noteId, nextParams);
      }

      return runQueuedMutation({
        tripId,
        clientMutationId: nextParams.clientMutationId,
        entityType: "NOTE",
        entityId: noteId,
        operation: "ENTITY_DELETED",
        payload: nextParams as Record<string, unknown>,
        mutationFn: () => deleteNote(noteId, nextParams)
      });
    },
    onMutate: async ({ noteId, params }) => {
      if (params) {
        params.clientMutationId = params.clientMutationId ?? crypto.randomUUID();
      }
      await queryClient.cancelQueries({ queryKey: noteKeys.lists() });
      const previous = queryClient.getQueriesData<NotesInfiniteData>({
        queryKey: noteKeys.lists()
      });
      const now = new Date().toISOString();

      queryClient.setQueriesData<NotesInfiniteData>({ queryKey: noteKeys.lists() }, (current) =>
        patchNote(current, noteId, (note) => ({
          ...note,
          deletedAt: now,
          updatedAt: now,
          isPending: true
        }))
      );

      return { previous };
    },
    onError: (_error, _variables, context) => {
      context?.previous.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSuccess: (result) => {
      queryClient.setQueriesData<NotesInfiniteData>({ queryKey: noteKeys.lists() }, (current) =>
        replaceNote(current, result.note)
      );
      patchTripRevision(queryClient, result.note.tripId, result.revision, -1);
    }
  });
}

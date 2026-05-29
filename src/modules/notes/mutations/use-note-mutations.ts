"use client";

import {
  type InfiniteData,
  type QueryClient,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";

import type { TripDetailDto } from "@/services/api/contracts";
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
    mutationFn: (payload: CreateNotePayload) =>
      createNote({
        ...payload,
        clientMutationId: payload.clientMutationId ?? crypto.randomUUID()
      }),
    onMutate: async (payload) => {
      const clientMutationId = payload.clientMutationId ?? crypto.randomUUID();
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
    mutationFn: ({ noteId, payload }: { noteId: string; payload: UpdateNotePayload }) =>
      updateNote(noteId, {
        ...payload,
        clientMutationId: payload.clientMutationId ?? crypto.randomUUID()
      }),
    onMutate: async ({ noteId, payload }) => {
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
    mutationFn: ({ noteId, params }: { noteId: string; params?: DeleteNoteQuery }) =>
      deleteNote(noteId, {
        ...params,
        clientMutationId: params?.clientMutationId ?? crypto.randomUUID()
      }),
    onMutate: async ({ noteId }) => {
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

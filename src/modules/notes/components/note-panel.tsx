"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { Check, MessageSquareReply, NotebookPen, Pencil, Plus, Trash2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

import { useNoteFilters } from "../hooks/use-note-filters";
import {
  useCreateNoteMutation,
  useDeleteNoteMutation,
  useUpdateNoteMutation
} from "../mutations/use-note-mutations";
import { notesInfiniteQueryOptions } from "../queries/note.queries";
import type {
  CollaborativeNote,
  CreateNotePayload,
  ListNotesQuery,
  NoteTargetEntityType
} from "../types/note.types";

type NotePanelProps = {
  tripId?: string | undefined;
  targetEntityType: NoteTargetEntityType;
  targetEntityId: string;
  parentNoteId?: string | undefined;
  title?: string | undefined;
  compact?: boolean | undefined;
};

function NoteComposer({
  filters,
  buttonLabel,
  placeholder,
  onCreated
}: {
  filters: ListNotesQuery;
  buttonLabel: string;
  placeholder: string;
  onCreated?: (() => void) | undefined;
}) {
  const createNote = useCreateNoteMutation(filters);
  const [body, setBody] = useState("");

  return (
    <div className="grid gap-3">
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder={placeholder}
        className="min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={body.trim().length === 0 || createNote.isPending}
        onClick={() => {
          const clientMutationId = crypto.randomUUID();
          if (!filters.targetEntityType || !filters.targetEntityId) {
            return;
          }

          const payload: CreateNotePayload = {
            targetEntityType: filters.targetEntityType,
            targetEntityId: filters.targetEntityId,
            body: body.trim(),
            clientMutationId
          };

          if (filters.tripId !== undefined) payload.tripId = filters.tripId;
          if (filters.parentNoteId !== undefined) payload.parentNoteId = filters.parentNoteId;

          createNote.mutate(payload, {
            onSuccess: () => {
              setBody("");
              onCreated?.();
            }
          });
        }}
      >
        <Plus aria-hidden="true" />
        {buttonLabel}
      </Button>
    </div>
  );
}

function NoteItem({ note, filters }: { note: CollaborativeNote; filters: ListNotesQuery }) {
  const t = useTranslations("trip.editor.notes");
  const locale = useLocale();
  const updateNote = useUpdateNoteMutation();
  const deleteNote = useDeleteNoteMutation();
  const [isEditing, setIsEditing] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [draft, setDraft] = useState(note.body);
  const isDeleted = note.deletedAt !== null;
  const isEdited = !isDeleted && note.updatedAt !== note.createdAt;
  const displayName = note.author?.name ?? t("unknownAuthor");
  const timestamp = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(note.updatedAt));

  return (
    <article className="rounded-md bg-muted p-3 text-sm">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{displayName}</p>
          <p className="text-xs text-muted-foreground">
            {timestamp}
            {isEdited ? ` ${t("edited")}` : ""}
            {note.isPending ? ` ${t("pending")}` : ""}
          </p>
        </div>

        {!isDeleted && !note.isPending ? (
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label={t("reply")}
              onClick={() => setIsReplying((current) => !current)}
            >
              <MessageSquareReply className="size-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label={t("edit")}
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="size-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label={t("delete")}
              onClick={() =>
                deleteNote.mutate({
                  noteId: note.id,
                  params: { clientMutationId: crypto.randomUUID() }
                })
              }
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </Button>
          </div>
        ) : null}
      </div>

      {isDeleted ? (
        <p className="text-muted-foreground">{t("deleted")}</p>
      ) : isEditing ? (
        <div className="grid gap-2">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="min-h-20 rounded-md border border-input bg-background px-3 py-2 shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2"
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              disabled={draft.trim().length === 0 || updateNote.isPending}
              onClick={() =>
                updateNote.mutate(
                  {
                    noteId: note.id,
                    payload: {
                      body: draft.trim(),
                      expectedVersion: note.version,
                      clientMutationId: crypto.randomUUID()
                    }
                  },
                  { onSuccess: () => setIsEditing(false) }
                )
              }
            >
              <Check aria-hidden="true" />
              {t("save")}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
              <X aria-hidden="true" />
              {t("cancel")}
            </Button>
          </div>
        </div>
      ) : (
        <p className="whitespace-pre-wrap text-muted-foreground">{note.body}</p>
      )}

      {isReplying && !isDeleted ? (
        <div className="mt-3 border-l pl-3">
          <NotePanel
            tripId={filters.tripId}
            targetEntityType={filters.targetEntityType ?? note.targetEntityType}
            targetEntityId={filters.targetEntityId ?? note.targetEntityId}
            parentNoteId={note.id}
            compact
          />
        </div>
      ) : null}
    </article>
  );
}

export function NotePanel(props: NotePanelProps) {
  const t = useTranslations("trip.editor.notes");
  const filters = useNoteFilters(props);
  const notesQuery = useInfiniteQuery(notesInfiniteQueryOptions(filters));
  const notes = useMemo(
    () => notesQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [notesQuery.data]
  );

  const content = (
    <>
      <NoteComposer
        filters={filters}
        buttonLabel={props.parentNoteId ? t("reply") : t("add")}
        placeholder={props.parentNoteId ? t("replyPlaceholder") : t("placeholder")}
      />

      {notes.length > 0 ? (
        <div className="mt-4 grid gap-2">
          {notes.map((note) => (
            <NoteItem key={note.id} note={note} filters={filters} />
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">{t("empty")}</p>
      )}

      {notesQuery.hasNextPage ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-3"
          disabled={notesQuery.isFetchingNextPage}
          onClick={() => void notesQuery.fetchNextPage()}
        >
          {notesQuery.isFetchingNextPage ? t("loadingMore") : t("loadMore")}
        </Button>
      ) : null}
    </>
  );

  if (props.compact) {
    return <div>{content}</div>;
  }

  return (
    <section className="rounded-md border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <NotebookPen className="size-4" aria-hidden="true" />
          {props.title ?? t("title")}
        </h2>
        <span className="text-xs text-muted-foreground">{notes.length}</span>
      </div>
      {content}
    </section>
  );
}

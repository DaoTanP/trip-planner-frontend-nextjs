"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Check, MessageSquareReply, NotebookPen, Pencil, Plus, Trash2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getNoteThreadPresenceId,
  useEntityPresenceEntries,
  usePresenceSource,
  useUniquePresenceUsers
} from "@/modules/collaboration/hooks/use-presence";
import type { PresenceEntry } from "@/modules/collaboration/types/presence.types";
import { useSession } from "@/modules/auth/hooks/use-session";
import {
  tripCollaboratorsQueryOptions,
  tripDetailQueryOptions
} from "@/modules/trips/queries/trip.queries";
import { collaborationColorClassNames } from "@/theme";

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
  permissionContext?: NotePermissionContext | undefined;
};

type NotePermissionContext = {
  currentUserId?: string | undefined;
  currentUserRole?: string | undefined;
  tripOwnerId?: string | undefined;
  collaboratorRole?: string | undefined;
};

function getNotePermissions(note: CollaborativeNote, context: NotePermissionContext) {
  const isMutable = note.deletedAt === null && !note.isPending;
  const isAuthor = context.currentUserId !== undefined && note.authorId === context.currentUserId;
  const canModerate =
    context.currentUserRole === "ADMIN" ||
    (context.currentUserId !== undefined && context.tripOwnerId === context.currentUserId) ||
    context.collaboratorRole === "OWNER";
  const canManage = isMutable && (isAuthor || canModerate);

  return {
    canReply: isMutable,
    canEdit: canManage,
    canDelete: canManage
  };
}

function NoteComposer({
  filters,
  buttonLabel,
  placeholder,
  compact = false,
  onComposingChange,
  onCreated
}: {
  filters: ListNotesQuery;
  buttonLabel: string;
  placeholder: string;
  compact?: boolean | undefined;
  onComposingChange?: ((isComposing: boolean) => void) | undefined;
  onCreated?: (() => void) | undefined;
}) {
  const createNote = useCreateNoteMutation(filters);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState("");

  useEffect(() => {
    onComposingChange?.(body.trim().length > 0);
  }, [body, onComposingChange]);

  useEffect(() => {
    if (!compact || !textareaRef.current) {
      return;
    }

    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
  }, [body, compact]);

  useEffect(() => () => onComposingChange?.(false), [onComposingChange]);

  return (
    <div className={cn("grid", compact ? "gap-2" : "gap-3")}>
      <textarea
        ref={textareaRef}
        value={body}
        rows={compact ? 1 : undefined}
        onChange={(event) => setBody(event.target.value)}
        placeholder={placeholder}
        className={cn(
          "rounded-md border border-input bg-background text-sm shadow-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
          compact
            ? "min-h-9 resize-none overflow-hidden px-2.5 py-1.5 leading-5"
            : "min-h-20 px-3 py-2"
        )}
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className={compact ? "h-7 w-fit px-2 text-xs" : undefined}
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
              onComposingChange?.(false);
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

function NoteItem({
  note,
  filters,
  permissionContext,
  compact = false
}: {
  note: CollaborativeNote;
  filters: ListNotesQuery;
  permissionContext: NotePermissionContext;
  compact?: boolean | undefined;
}) {
  const t = useTranslations("trip.editor.notes");
  const locale = useLocale();
  const updateNote = useUpdateNoteMutation();
  const deleteNote = useDeleteNoteMutation();
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [draft, setDraft] = useState(note.body);
  const isDeleted = note.deletedAt !== null;
  const isEdited = !isDeleted && note.updatedAt !== note.createdAt;
  const permissions = getNotePermissions(note, permissionContext);
  const hasActions = permissions.canReply || permissions.canEdit || permissions.canDelete;
  const displayName = note.author?.name ?? t("unknownAuthor");
  const timestamp = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(note.updatedAt));
  usePresenceSource({
    tripId: filters.tripId ?? "__note_without_trip__",
    entityType: "NOTE",
    entityId: note.id,
    state: "EDITING",
    priority: 4,
    enabled: filters.tripId !== undefined && isEditing
  });

  useEffect(() => {
    if (!compact || !isEditing || !editTextareaRef.current) {
      return;
    }

    editTextareaRef.current.style.height = "auto";
    editTextareaRef.current.style.height = `${editTextareaRef.current.scrollHeight}px`;
  }, [compact, draft, isEditing]);

  return (
    <article className={cn("rounded-md bg-muted text-sm", compact ? "p-2" : "p-3")}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{displayName}</p>
          <p className="text-xs text-muted-foreground">
            {timestamp}
            {isEdited ? ` ${t("edited")}` : ""}
            {note.isPending ? ` ${t("pending")}` : ""}
          </p>
        </div>

        {hasActions ? (
          <div className="flex shrink-0 items-center gap-1">
            {permissions.canReply ? (
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
            ) : null}
            {permissions.canEdit ? (
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
            ) : null}
            {permissions.canDelete ? (
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
            ) : null}
          </div>
        ) : null}
      </div>

      {isDeleted ? (
        <p className="text-muted-foreground">{t("deleted")}</p>
      ) : isEditing && permissions.canEdit ? (
        <div className="grid gap-2">
          <textarea
            ref={editTextareaRef}
            value={draft}
            rows={compact ? 1 : undefined}
            onChange={(event) => setDraft(event.target.value)}
            className={cn(
              "rounded-md border border-input bg-background shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2",
              compact
                ? "min-h-9 resize-none overflow-hidden px-2.5 py-1.5 leading-5"
                : "min-h-20 px-3 py-2"
            )}
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

      {isReplying && permissions.canReply ? (
        <div className="mt-3 border-l pl-3">
          <NotePanel
            tripId={filters.tripId}
            targetEntityType={filters.targetEntityType ?? note.targetEntityType}
            targetEntityId={filters.targetEntityId ?? note.targetEntityId}
            parentNoteId={note.id}
            compact
            permissionContext={permissionContext}
          />
        </div>
      ) : null}
    </article>
  );
}

export function NotePanel(props: NotePanelProps) {
  const t = useTranslations("trip.editor.notes");
  const filters = useNoteFilters(props);
  const tripId = filters.tripId;
  const presenceTripId = tripId ?? "__note_panel_without_trip__";
  const threadPresenceId = useMemo(
    () =>
      getNoteThreadPresenceId({
        targetEntityType: filters.targetEntityType ?? props.targetEntityType,
        targetEntityId: filters.targetEntityId ?? props.targetEntityId,
        parentNoteId: filters.parentNoteId
      }),
    [
      filters.parentNoteId,
      filters.targetEntityId,
      filters.targetEntityType,
      props.targetEntityId,
      props.targetEntityType
    ]
  );
  const sessionQuery = useSession();
  const [isComposing, setIsComposing] = useState(false);
  const tripQuery = useQuery({
    ...tripDetailQueryOptions(tripId ?? "__note_panel_without_trip__"),
    enabled: tripId !== undefined && props.permissionContext === undefined
  });
  const collaboratorsQuery = useQuery({
    ...tripCollaboratorsQueryOptions(tripId ?? "__note_panel_without_trip__"),
    enabled: tripId !== undefined && props.permissionContext === undefined
  });
  const notesQuery = useInfiniteQuery(notesInfiniteQueryOptions(filters));
  const notes = useMemo(
    () => notesQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [notesQuery.data]
  );
  const currentUserId = props.permissionContext?.currentUserId ?? sessionQuery.data?.user.id;
  const currentUserRole = props.permissionContext?.currentUserRole ?? sessionQuery.data?.user.role;
  const collaboratorRole = useMemo(() => {
    if (props.permissionContext?.collaboratorRole !== undefined) {
      return props.permissionContext.collaboratorRole;
    }
    if (!currentUserId) {
      return undefined;
    }

    return collaboratorsQuery.data?.find((collaborator) => collaborator.user?.id === currentUserId)
      ?.role;
  }, [collaboratorsQuery.data, currentUserId, props.permissionContext?.collaboratorRole]);
  const permissionContext = useMemo<NotePermissionContext>(
    () =>
      props.permissionContext ?? {
        currentUserId,
        currentUserRole,
        tripOwnerId: tripQuery.data?.owner.id,
        collaboratorRole
      },
    [
      collaboratorRole,
      currentUserId,
      currentUserRole,
      props.permissionContext,
      tripQuery.data?.owner.id
    ]
  );
  const threadPresenceEntries = useEntityPresenceEntries({
    tripId: presenceTripId,
    entityType: "NOTE",
    entityId: threadPresenceId,
    excludeUserId: currentUserId
  });
  const activeThreadPresence = useUniquePresenceUsers(threadPresenceEntries);
  usePresenceSource({
    tripId: presenceTripId,
    entityType: "NOTE",
    entityId: threadPresenceId,
    state: isComposing ? "REPLYING" : "VIEWING",
    priority: isComposing ? 4 : 3,
    enabled: tripId !== undefined
  });

  const content = (
    <>
      {activeThreadPresence.length > 0 ? (
        <NoteThreadPresenceIndicator entries={activeThreadPresence} />
      ) : null}
      <NoteComposer
        filters={filters}
        buttonLabel={props.parentNoteId ? t("reply") : t("add")}
        placeholder={props.parentNoteId ? t("replyPlaceholder") : t("placeholder")}
        compact={props.compact}
        onComposingChange={setIsComposing}
      />

      {notesQuery.isLoading ? (
        <p className={cn("text-sm text-muted-foreground", props.compact ? "mt-2" : "mt-4")}>
          {t("loading")}
        </p>
      ) : null}

      {notesQuery.isError ? (
        <div
          className={cn(
            "grid gap-2 rounded-md bg-muted p-3 text-sm text-muted-foreground",
            props.compact ? "mt-2" : "mt-4"
          )}
        >
          <span>{t("error")}</span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-fit"
            onClick={() => void notesQuery.refetch()}
          >
            {t("retry")}
          </Button>
        </div>
      ) : null}

      {!notesQuery.isLoading && !notesQuery.isError && notes.length > 0 ? (
        <div className={cn("grid gap-2", props.compact ? "mt-2" : "mt-4")}>
          {notes.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              filters={filters}
              permissionContext={permissionContext}
              compact={props.compact}
            />
          ))}
        </div>
      ) : null}

      {!notesQuery.isLoading && !notesQuery.isError && notes.length === 0 ? (
        <p className={cn("text-sm text-muted-foreground", props.compact ? "mt-2" : "mt-4")}>
          {t("empty")}
        </p>
      ) : null}

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
        <h2 className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <NotebookPen className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{props.title ?? t("title")}</span>
        </h2>
        <span className="text-xs text-muted-foreground">{notes.length}</span>
      </div>
      {content}
    </section>
  );
}

function NoteThreadPresenceIndicator({ entries }: { entries: PresenceEntry[] }) {
  const t = useTranslations("trip.editor.notes");
  const primaryEntry = entries[0];

  if (!primaryEntry) {
    return null;
  }

  const remainingCount = Math.max(0, entries.length - 1);
  const primaryLabel =
    primaryEntry.state === "REPLYING"
      ? t("presence.replying", { name: primaryEntry.userName })
      : t("presence.viewing", { name: primaryEntry.userName });

  return (
    <div
      className={cn(
        "mb-3 inline-flex max-w-full items-center gap-1 rounded-md px-2 py-1 text-xs",
        collaborationColorClassNames.presencePill
      )}
    >
      <span
        className={cn("size-1.5 shrink-0 rounded-full", collaborationColorClassNames.presenceDot)}
        aria-hidden="true"
      />
      <span className="truncate">
        {remainingCount > 0
          ? `${primaryLabel} · ${t("presence.more", { count: remainingCount })}`
          : primaryLabel}
      </span>
    </div>
  );
}

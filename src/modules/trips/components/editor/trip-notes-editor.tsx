"use client";

import { NotebookPen, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import { useCreateTripNoteMutation } from "../../mutations/use-trip-editor-mutations";
import type { TripNote } from "../../types/trip.types";

interface TripNotesEditorProps {
  tripId: string;
  notes: TripNote[];
}

export function TripNotesEditor({ tripId, notes }: TripNotesEditorProps) {
  const t = useTranslations("trip.editor.notes");
  const createNote = useCreateTripNoteMutation(tripId);
  const [body, setBody] = useState("");

  return (
    <section className="rounded-md border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <NotebookPen className="size-4" aria-hidden="true" />
          {t("title")}
        </h2>
        <span className="text-xs text-muted-foreground">{notes.length}</span>
      </div>

      <div className="grid gap-3">
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={t("placeholder")}
          className="min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={body.trim().length === 0 || createNote.isPending}
          onClick={() => {
            createNote.mutate(
              { body: body.trim(), clientMutationId: crypto.randomUUID(), order: 0 },
              {
                onSuccess: () => setBody("")
              }
            );
          }}
        >
          <Plus aria-hidden="true" />
          {t("add")}
        </Button>
      </div>

      {notes.length > 0 ? (
        <div className="mt-4 grid gap-2">
          {notes.slice(0, 3).map((note) => (
            <article key={note.id} className="rounded-md bg-muted p-3 text-sm">
              {note.title ? <h3 className="mb-1 font-medium">{note.title}</h3> : null}
              <p className="line-clamp-3 text-muted-foreground">{note.body}</p>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

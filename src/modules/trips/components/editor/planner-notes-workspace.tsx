"use client";

import { useTranslations } from "next-intl";

import { NotePanel } from "@/modules/notes/components/note-panel";
import type { ItineraryItem } from "@/modules/itinerary/types/itinerary.types";

type PlannerNotesWorkspaceProps = {
  tripId: string;
  selectedItem?: ItineraryItem | undefined;
};

export function PlannerNotesWorkspace({ tripId, selectedItem }: PlannerNotesWorkspaceProps) {
  const t = useTranslations("trip.editor.notes");

  return (
    <section className="grid gap-3" aria-label={t("workspaceTitle")}>
      {selectedItem ? (
        <NotePanel
          tripId={tripId}
          targetEntityType="ITINERARY_ITEM"
          targetEntityId={selectedItem.id}
          title={t("itemTitle", { title: selectedItem.title })}
        />
      ) : null}
      <NotePanel
        tripId={tripId}
        targetEntityType="TRIP"
        targetEntityId={tripId}
        title={t("tripTitle")}
      />
    </section>
  );
}

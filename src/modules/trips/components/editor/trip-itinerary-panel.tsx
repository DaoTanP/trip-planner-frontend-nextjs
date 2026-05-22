"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CalendarPlus } from "lucide-react";
import { useTranslations } from "next-intl";

import { useReorderTripDaysMutation } from "../../mutations/use-trip-editor-mutations";
import type { TripDetail } from "../../types/trip.types";
import { reorderDays } from "../../utils/trip-editor.utils";
import { ItineraryDaySection } from "./itinerary-day-section";

interface TripItineraryPanelProps {
  trip: TripDetail;
}

export function TripItineraryPanel({ trip }: TripItineraryPanelProps) {
  const t = useTranslations("trip.editor.itinerary");
  const reorderDaysMutation = useReorderTripDaysMutation(trip.id);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDayDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const optimisticDays = reorderDays(trip.days, String(active.id), String(over.id));

    reorderDaysMutation.mutate({
      optimisticDays,
      payload: {
        clientMutationId: crypto.randomUUID(),
        dayIds: optimisticDays.map((day) => day.id)
      }
    });
  }

  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{t("title")}</h2>
        <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
          <CalendarPlus className="size-3" aria-hidden="true" />
          {t("days", { count: trip.days.length })}
        </span>
      </div>

      {trip.days.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDayDragEnd}
        >
          <SortableContext
            items={trip.days.map((day) => day.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid gap-4">
              {trip.days.map((day, index) => (
                <ItineraryDaySection
                  key={day.id}
                  tripId={trip.id}
                  day={day}
                  days={trip.days}
                  dayNumber={index + 1}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="rounded-md border border-dashed bg-card p-6 text-sm text-muted-foreground">
          {t("empty")}
        </div>
      )}
    </section>
  );
}

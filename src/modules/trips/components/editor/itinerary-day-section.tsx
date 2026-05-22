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
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, GripVertical, Plus } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  useCreateItineraryItemMutation,
  useReorderItineraryItemsMutation
} from "@/modules/itinerary/mutations/use-itinerary-mutations";

import type { TripDay } from "../../types/trip.types";
import { reorderItemsWithinDay } from "../../utils/trip-editor.utils";
import { ItineraryItemCard } from "./itinerary-item-card";

interface ItineraryDaySectionProps {
  tripId: string;
  day: TripDay;
  days: TripDay[];
  dayNumber: number;
}

export function ItineraryDaySection({ tripId, day, days, dayNumber }: ItineraryDaySectionProps) {
  const t = useTranslations("trip.editor.day");
  const format = useFormatter();
  const [isExpanded, setExpanded] = useState(true);
  const [newItemTitle, setNewItemTitle] = useState("");
  const createItem = useCreateItineraryItemMutation(tripId);
  const reorderItems = useReorderItineraryItemsMutation(tripId);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: day.id,
    data: {
      type: "trip-day"
    }
  });

  function handleItemDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const optimisticDays = reorderItemsWithinDay(days, day.id, String(active.id), String(over.id));
    const optimisticDay = optimisticDays.find((nextDay) => nextDay.id === day.id);

    if (!optimisticDay) {
      return;
    }

    reorderItems.mutate({
      optimisticDays,
      payload: {
        clientMutationId: crypto.randomUUID(),
        updates: optimisticDay.items.map((item) => ({
          itemId: item.id,
          dayId: day.id,
          order: item.order
        }))
      }
    });
  }

  return (
    <motion.section
      ref={setNodeRef}
      layout
      style={{
        transform: CSS.Transform.toString(transform),
        transition
      }}
      className={cn(
        "rounded-md border bg-card shadow-sm",
        isDragging && "relative z-20 opacity-80"
      )}
    >
      <header className="flex items-center gap-3 border-b p-3">
        <button
          type="button"
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2"
          aria-label={t("drag")}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={() => setExpanded((value) => !value)}
        >
          <ChevronDown
            className={cn("size-4 shrink-0 transition-transform", !isExpanded && "-rotate-90")}
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">
              {day.title || t("fallbackTitle", { number: dayNumber })}
            </span>
            <span className="block text-xs text-muted-foreground">
              {format.dateTime(new Date(day.date), "tripDate")}
            </span>
          </span>
        </button>
        <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
          {t("itemCount", { count: day.items.length })}
        </span>
      </header>

      <AnimatePresence initial={false}>
        {isExpanded ? (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid gap-3 p-3">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleItemDragEnd}
              >
                <SortableContext
                  items={day.items.map((item) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="grid gap-3">
                    {day.items.map((item) => (
                      <ItineraryItemCard
                        key={`${item.id}:${item.version}:${item.title}:${item.description ?? ""}`}
                        tripId={tripId}
                        item={item}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {day.items.length === 0 ? (
                <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
                  {t("empty")}
                </div>
              ) : null}

              <form
                className="grid gap-2 sm:grid-cols-[1fr_auto]"
                onSubmit={(event) => {
                  event.preventDefault();
                  const title = newItemTitle.trim();

                  if (!title) {
                    return;
                  }

                  createItem.mutate(
                    {
                      dayId: day.id,
                      payload: {
                        title,
                        order: day.items.length * 1024 + 1024
                      }
                    },
                    {
                      onSuccess: () => setNewItemTitle("")
                    }
                  );
                }}
              >
                <Input
                  value={newItemTitle}
                  onChange={(event) => setNewItemTitle(event.target.value)}
                  placeholder={t("addPlaceholder")}
                />
                <Button type="submit" variant="secondary" disabled={createItem.isPending}>
                  <Plus aria-hidden="true" />
                  {t("add")}
                </Button>
              </form>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.section>
  );
}

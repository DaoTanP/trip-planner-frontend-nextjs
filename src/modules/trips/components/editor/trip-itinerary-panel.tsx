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
import { ListOrdered, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useCreateItineraryItemMutation,
  useReorderItineraryItemsMutation
} from "@/modules/itinerary/mutations/use-itinerary-mutations";
import type { ItineraryItem } from "@/modules/itinerary/types/itinerary.types";
import type { PlaceDto } from "@/services/api/contracts";

import { buildItineraryReorderIntent, getPlaceMap } from "../../utils/trip-editor.utils";
import { ItineraryItemCard } from "./itinerary-item-card";

interface TripItineraryPanelProps {
  tripId: string;
  items: ItineraryItem[];
  places: PlaceDto[];
}

export function TripItineraryPanel({ tripId, items, places }: TripItineraryPanelProps) {
  const t = useTranslations("trip.editor.itinerary");
  const createItem = useCreateItineraryItemMutation(tripId);
  const reorderItems = useReorderItineraryItemsMutation(tripId);
  const [newItemTitle, setNewItemTitle] = useState("");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const orderedItems = useMemo(
    () => [...items].sort((left, right) => left.sortOrder - right.sortOrder),
    [items]
  );
  const placeMap = useMemo(() => getPlaceMap(places), [places]);

  function handleItemDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const reorderIntent = buildItineraryReorderIntent(
      orderedItems,
      String(active.id),
      String(over.id),
      crypto.randomUUID()
    );

    if (!reorderIntent) {
      return;
    }

    reorderItems.mutate({
      optimisticItems: reorderIntent.optimisticItems,
      payload: reorderIntent.payload
    });
  }

  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{t("title")}</h2>
        <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
          <ListOrdered className="size-3" aria-hidden="true" />
          {t("items", { count: orderedItems.length })}
        </span>
      </div>

      <form
        className="grid gap-2 rounded-md border bg-card p-3 shadow-sm sm:grid-cols-[1fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          const title = newItemTitle.trim();

          if (!title) {
            return;
          }

          createItem.mutate(
            {
              title,
              clientMutationId: crypto.randomUUID()
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

      {orderedItems.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleItemDragEnd}
        >
          <SortableContext
            items={orderedItems.map((item) => item.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid gap-3">
              {orderedItems.map((item) => (
                <ItineraryItemCard
                  key={`${item.id}:${item.version}:${item.title}:${item.description ?? ""}`}
                  tripId={tripId}
                  item={item}
                  place={item.placeId ? placeMap.get(item.placeId) : undefined}
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

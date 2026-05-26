"use client";

import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { Clock, GripVertical, MapPin, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useDeleteItineraryItemMutation,
  useUpdateItineraryItemMutation
} from "@/modules/itinerary/mutations/use-itinerary-mutations";
import type { PlaceDto } from "@/services/api/contracts";
import { usePlannerStore } from "@/stores/use-planner-store";

import type { ItineraryItem } from "@/modules/itinerary/types/itinerary.types";
import { getItemMarkerId } from "../../utils/trip-editor.utils";

interface ItineraryItemCardProps {
  tripId: string;
  item: ItineraryItem;
  place?: PlaceDto | undefined;
}

export function ItineraryItemCard({ tripId, item, place }: ItineraryItemCardProps) {
  const t = useTranslations("trip.editor.item");
  const selectedItemId = usePlannerStore((state) => state.selectedItemId);
  const selectItem = usePlannerStore((state) => state.selectItem);
  const setHoveredItemId = usePlannerStore((state) => state.setHoveredItemId);
  const updateItem = useUpdateItineraryItemMutation(tripId);
  const deleteItem = useDeleteItineraryItemMutation(tripId);
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description ?? "");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: {
      type: "itinerary-item"
    }
  });

  const isSelected = selectedItemId === item.id;

  return (
    <article
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition
      }}
      className={cn(
        "rounded-md border bg-background p-3 shadow-sm transition-colors",
        isSelected && "border-primary ring-2 ring-primary/20",
        isDragging && "relative z-20 opacity-80"
      )}
      onMouseEnter={() => setHoveredItemId(item.id)}
      onMouseLeave={() => setHoveredItemId(undefined)}
      onClick={() => selectItem(item.id, item.placeId ?? undefined)}
    >
      <div className="grid grid-cols-[auto_1fr_auto] gap-3">
        <button
          type="button"
          className="mt-1 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2"
          aria-label={t("drag")}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" aria-hidden="true" />
        </button>

        <div className="min-w-0 space-y-2">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={() => {
              const nextTitle = title.trim();
              if (nextTitle && nextTitle !== item.title) {
                updateItem.mutate({ itemId: item.id, payload: { title: nextTitle } });
              }
            }}
            className="w-full rounded-sm bg-transparent text-sm font-semibold outline-none focus-visible:bg-muted"
            aria-label={t("titleLabel")}
          />
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            onBlur={() => {
              const nextDescription = description.trim();
              if (nextDescription !== (item.description ?? "")) {
                updateItem.mutate({
                  itemId: item.id,
                  payload: { description: nextDescription || null }
                });
              }
            }}
            placeholder={t("descriptionPlaceholder")}
            className="min-h-12 w-full resize-y rounded-sm bg-transparent text-xs text-muted-foreground outline-none focus-visible:bg-muted"
            aria-label={t("descriptionLabel")}
          />
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {place ? (
              <span className="inline-flex min-w-0 items-center gap-1">
                <MapPin className="size-3" aria-hidden="true" />
                <span className="truncate">{place.name}</span>
              </span>
            ) : null}
            {item.startTime ? (
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3" aria-hidden="true" />
                {new Date(item.startTime).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </span>
            ) : null}
            {item.durationMinutes ? (
              <span>{t("duration", { minutes: item.durationMinutes })}</span>
            ) : null}
          </div>
        </div>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label={t("delete")}
          disabled={deleteItem.isPending}
          onClick={(event) => {
            event.stopPropagation();
            deleteItem.mutate(item.id);
            if (selectedItemId === item.id) {
              selectItem(undefined, undefined);
            }
          }}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>

      {place ? <span className="sr-only">{getItemMarkerId(item)}</span> : null}
    </article>
  );
}

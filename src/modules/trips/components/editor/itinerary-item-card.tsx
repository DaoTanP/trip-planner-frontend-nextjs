"use client";

import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import {
  BedDouble,
  CalendarCheck,
  CheckSquare,
  Clock,
  GripVertical,
  MapPin,
  MessageSquare,
  Navigation,
  NotebookPen,
  Route,
  Sparkles,
  Trash2,
  Utensils
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useDeleteItineraryItemMutation,
  useUpdateItineraryItemMutation
} from "@/modules/itinerary/mutations/use-itinerary-mutations";
import type {
  ItineraryItem,
  UpdateItineraryItemPayload
} from "@/modules/itinerary/types/itinerary.types";
import type { PlaceDto } from "@/services/api/contracts";
import { usePlannerStore } from "@/stores/use-planner-store";

import {
  getItemCoordinates,
  getItemMapId,
  getItemMetadataList,
  getItemMetadataNumber,
  getItemMetadataString,
  type ItemSyncState,
  type RouteSummaryByItem
} from "../../utils/planner-workspace.utils";

interface ItineraryItemCardProps {
  tripId: string;
  item: ItineraryItem;
  place?: PlaceDto | undefined;
  routeSummary?:
    | (RouteSummaryByItem extends Map<string, infer TRoute> ? TRoute : never)
    | undefined;
  syncState?: ItemSyncState | undefined;
}

const typeIcons = {
  ACTIVITY: CalendarCheck,
  PLACE: MapPin,
  LODGING: BedDouble,
  TRANSPORT: Navigation,
  FOOD: Utensils,
  NOTE: NotebookPen,
  TASK: CheckSquare,
  CUSTOM: Sparkles
} satisfies Record<ItineraryItem["type"], typeof Sparkles>;

const typeClasses = {
  ACTIVITY: "border-l-primary",
  PLACE: "border-l-accent",
  LODGING: "border-l-emerald-600",
  TRANSPORT: "border-l-sky-600",
  FOOD: "border-l-amber-600",
  NOTE: "border-l-violet-600",
  TASK: "border-l-rose-600",
  CUSTOM: "border-l-muted-foreground"
} satisfies Record<ItineraryItem["type"], string>;

export function ItineraryItemCard({
  tripId,
  item,
  place,
  routeSummary,
  syncState
}: ItineraryItemCardProps) {
  const t = useTranslations("trip.editor.item");
  const locale = useLocale();
  const selectedItemId = usePlannerStore((state) => state.selectedItemId);
  const activeRouteItemId = usePlannerStore((state) => state.activeRouteItemId);
  const selectItem = usePlannerStore((state) => state.selectItem);
  const setHoveredItemId = usePlannerStore((state) => state.setHoveredItemId);
  const setActiveRouteItemId = usePlannerStore((state) => state.setActiveRouteItemId);
  const updateItem = useUpdateItineraryItemMutation(tripId);
  const deleteItem = useDeleteItineraryItemMutation(tripId);
  const [draft, setDraft] = useState(() => ({
    version: item.version,
    title: item.title,
    description: item.description ?? ""
  }));
  const isDraftCurrent = draft.version === item.version;
  const title = isDraftCurrent ? draft.title : item.title;
  const description = isDraftCurrent ? draft.description : (item.description ?? "");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: {
      type: "itinerary-item"
    }
  });

  const isSelected = selectedItemId === item.id;
  const isRouteActive = activeRouteItemId === item.id;
  const TypeIcon = typeIcons[item.type];
  const coordinates = getItemCoordinates(place);
  const markerId = getItemMapId(item);
  const tags = getItemMetadataList(item, "tags");
  const reminder = getItemMetadataString(item, "reminder");
  const bookingState = getItemMetadataString(item, "bookingState");
  const noteCount = getItemMetadataNumber(item, "noteCount") ?? 0;
  const unresolvedComments = getItemMetadataNumber(item, "unresolvedComments") ?? 0;
  const timeLabel = useMemo(() => formatTimeRange(item, locale), [item, locale]);
  const updatedAt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date(item.updatedAt)),
    [item.updatedAt, locale]
  );

  function patchItem(payload: UpdateItineraryItemPayload) {
    updateItem.mutate({ itemId: item.id, payload });
  }

  return (
    <article
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition
      }}
      className={cn(
        "group rounded-md border border-l-4 bg-background p-2.5 shadow-sm transition-colors",
        typeClasses[item.type],
        isSelected && "border-primary ring-2 ring-primary/20",
        isRouteActive && "bg-secondary/60",
        syncState === "conflicted" && "border-destructive ring-2 ring-destructive/20",
        isDragging && "relative z-20 opacity-80"
      )}
      onMouseEnter={() => {
        setHoveredItemId(item.id);
        if (routeSummary) {
          setActiveRouteItemId(item.id);
        }
      }}
      onMouseLeave={() => {
        setHoveredItemId(undefined);
        setActiveRouteItemId(undefined);
      }}
      onClick={() => selectItem(item.id, item.placeId ?? undefined)}
    >
      <div className="grid grid-cols-[auto_1fr_auto] gap-2">
        <button
          type="button"
          className="mt-1 flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2"
          aria-label={t("drag")}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" aria-hidden="true" />
        </button>

        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5">
              <TypeIcon className="size-3" aria-hidden="true" />
              {t(`types.${item.type}`)}
            </span>
            <select
              value={item.status}
              aria-label={t("statusLabel")}
              className="h-6 rounded-md border bg-background px-1 text-xs"
              onClick={(event) => event.stopPropagation()}
              onChange={(event) =>
                patchItem({ status: event.target.value as ItineraryItem["status"] })
              }
            >
              {(["PLANNED", "BOOKED", "COMPLETED", "CANCELLED"] as ItineraryItem["status"][]).map(
                (status) => (
                  <option key={status} value={status}>
                    {t(`statuses.${status}`)}
                  </option>
                )
              )}
            </select>
            {syncState ? (
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5",
                  syncState === "conflicted"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-secondary text-secondary-foreground"
                )}
              >
                {t(`sync.${syncState}`)}
              </span>
            ) : null}
          </div>

          <input
            value={title}
            onChange={(event) =>
              setDraft({
                version: item.version,
                title: event.target.value,
                description
              })
            }
            onBlur={() => {
              const nextTitle = title.trim();
              if (nextTitle && nextTitle !== item.title) {
                patchItem({ title: nextTitle, expectedVersion: item.version });
              }
            }}
            onClick={(event) => event.stopPropagation()}
            className="mt-1 w-full rounded-sm bg-transparent text-sm font-semibold outline-none focus-visible:bg-muted"
            aria-label={t("titleLabel")}
          />
          <textarea
            value={description}
            onChange={(event) =>
              setDraft({
                version: item.version,
                title,
                description: event.target.value
              })
            }
            onBlur={() => {
              const nextDescription = description.trim();
              if (nextDescription !== (item.description ?? "")) {
                patchItem({
                  description: nextDescription || null,
                  expectedVersion: item.version
                });
              }
            }}
            onClick={(event) => event.stopPropagation()}
            placeholder={t("descriptionPlaceholder")}
            className="mt-0.5 min-h-8 w-full resize-y rounded-sm bg-transparent text-xs text-muted-foreground outline-none focus-visible:bg-muted"
            aria-label={t("descriptionLabel")}
          />

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {timeLabel ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5">
                <Clock className="size-3" aria-hidden="true" />
                {timeLabel}
              </span>
            ) : null}
            {item.isFlexibleTime ? (
              <span className="rounded-md bg-muted px-1.5 py-0.5">{t("flexible")}</span>
            ) : null}
            {item.isAllDay ? (
              <span className="rounded-md bg-muted px-1.5 py-0.5">{t("allDay")}</span>
            ) : null}
            {item.durationMinutes ? (
              <span className="rounded-md bg-muted px-1.5 py-0.5">
                {t("duration", { minutes: item.durationMinutes })}
              </span>
            ) : null}
            <span className="rounded-md bg-muted px-1.5 py-0.5">{item.timezone}</span>
          </div>

          <div className="mt-1.5 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
            {place ? (
              <span className="inline-flex min-w-0 items-center gap-1">
                <MapPin className="size-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{place.name}</span>
              </span>
            ) : null}
            {coordinates ? <span className="truncate">{coordinates}</span> : null}
            {routeSummary ? (
              <span
                className="inline-flex min-w-0 items-center gap-1"
                onMouseEnter={() => setActiveRouteItemId(item.id)}
              >
                <Route className="size-3 shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {t("routeSummary", {
                    mode: routeSummary.travelMode,
                    distance: formatDistance(routeSummary.distanceMeters, locale),
                    duration: formatRouteDuration(routeSummary.durationSeconds, t)
                  })}
                </span>
              </span>
            ) : null}
            {markerId ? <span className="sr-only">{markerId}</span> : null}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {tags.map((tag) => (
              <span key={tag} className="rounded-md border px-1.5 py-0.5">
                {tag}
              </span>
            ))}
            {bookingState ? (
              <span className="rounded-md border px-1.5 py-0.5">{bookingState}</span>
            ) : null}
            {reminder ? <span className="rounded-md border px-1.5 py-0.5">{reminder}</span> : null}
            {noteCount > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5">
                <MessageSquare className="size-3" aria-hidden="true" />
                {t("notes", { count: noteCount })}
              </span>
            ) : null}
            {unresolvedComments > 0 ? (
              <span className="rounded-md border px-1.5 py-0.5">
                {t("unresolved", { count: unresolvedComments })}
              </span>
            ) : null}
            <span className="ml-auto truncate">{t("editedAt", { value: updatedAt })}</span>
          </div>
        </div>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8 opacity-100 md:opacity-0 md:group-hover:opacity-100"
          aria-label={t("delete")}
          disabled={deleteItem.isPending}
          onClick={(event) => {
            event.stopPropagation();
            deleteItem.mutate({
              itemId: item.id,
              params: { clientMutationId: crypto.randomUUID() }
            });
            if (selectedItemId === item.id) {
              selectItem(undefined, undefined);
            }
          }}
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </article>
  );
}

function formatTimeRange(item: ItineraryItem, locale: string) {
  if (!item.startTime && !item.endTime) {
    return null;
  }

  const formatter = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: item.timezone
  });
  const start = item.startTime ? formatter.format(new Date(item.startTime)) : null;
  const end = item.endTime ? formatter.format(new Date(item.endTime)) : null;

  return start && end && start !== end ? `${start} - ${end}` : (start ?? end);
}

function formatDistance(meters: number | null, locale: string) {
  if (meters === null) {
    return "-";
  }

  const kilometers = meters / 1000;

  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: kilometers >= 10 ? 0 : 1
  }).format(kilometers);
}

function formatRouteDuration(seconds: number | null, t: ReturnType<typeof useTranslations>) {
  if (seconds === null) {
    return "-";
  }

  return t("routeDuration", { minutes: Math.max(1, Math.round(seconds / 60)) });
}

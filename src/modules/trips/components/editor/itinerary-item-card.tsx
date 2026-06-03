"use client";

import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import {
  BedDouble,
  CalendarCheck,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  GripVertical,
  MapPin,
  MessageSquare,
  Navigation,
  NotebookPen,
  Route,
  Sparkles,
  Trash2,
  X,
  Utensils
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useEntityPresenceEntries,
  usePresenceSource,
  useUniquePresenceUsers
} from "@/modules/collaboration/hooks/use-presence";
import type { PresenceEntry } from "@/modules/collaboration/types/presence.types";
import {
  useDeleteItineraryItemMutation,
  useUpdateItineraryItemMutation
} from "@/modules/itinerary/mutations/use-itinerary-mutations";
import type {
  ItineraryItem,
  UpdateItineraryItemPayload
} from "@/modules/itinerary/types/itinerary.types";
import { NotePanel } from "@/modules/notes/components/note-panel";
import type { CollaborativeNote } from "@/modules/notes/types/note.types";
import type { PlaceDto } from "@/services/api/contracts";
import { usePlannerStore } from "@/stores/use-planner-store";

import type { StopNotePreviewState } from "../../hooks/use-itinerary-note-previews";
import {
  getItemMetadataList,
  getItemMetadataString,
  type ItemSyncState,
  type RouteSummaryByItem
} from "../../utils/planner-workspace.utils";
import { PlaceSearchBox } from "./place-search-box";

interface ItineraryItemCardProps {
  tripId: string;
  item: ItineraryItem;
  place?: PlaceDto | undefined;
  currentUserId?: string | undefined;
  routeSummary?:
    | (RouteSummaryByItem extends Map<string, infer TRoute> ? TRoute : never)
    | undefined;
  syncState?: ItemSyncState | undefined;
  sequence: number;
  isRouteFocused?: boolean | undefined;
  notePreview?: StopNotePreviewState | undefined;
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

export function ItineraryItemCard({
  tripId,
  item,
  place,
  currentUserId,
  routeSummary,
  syncState,
  sequence,
  isRouteFocused = false,
  notePreview
}: ItineraryItemCardProps) {
  const t = useTranslations("trip.editor.item");
  const locale = useLocale();
  const selectedItemId = usePlannerStore((state) => state.selectedItemId);
  const hoveredItemId = usePlannerStore((state) => state.hoveredItemId);
  const selectItem = usePlannerStore((state) => state.selectItem);
  const setHoveredItemId = usePlannerStore((state) => state.setHoveredItemId);
  const updateItem = useUpdateItineraryItemMutation(tripId);
  const deleteItem = useDeleteItineraryItemMutation(tripId);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAssigningPlace, setIsAssigningPlace] = useState(false);
  const [isTitleFocused, setIsTitleFocused] = useState(false);
  const [draft, setDraft] = useState(() => ({
    version: item.version,
    title: item.title
  }));
  const title = draft.version === item.version ? draft.title : item.title;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: {
      type: "itinerary-item"
    }
  });

  const isSelected = selectedItemId === item.id;
  const isHovered = hoveredItemId === item.id;
  const TypeIcon = typeIcons[item.type];
  const tags = getItemMetadataList(item, "tags");
  const reminder = getItemMetadataString(item, "reminder");
  const bookingState = getItemMetadataString(item, "bookingState");
  const scheduleLabel = useMemo(() => formatSchedule(item, locale, t), [item, locale, t]);
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
  const placeName = place?.name ?? title;
  const placeAddress = place?.formattedAddress ?? place?.address;
  const planningLine = place && title.trim() && title.trim() !== place.name ? title.trim() : null;
  const statusLabel = t(`statuses.${item.status}`);
  const presenceEntries = useEntityPresenceEntries({
    tripId,
    entityType: "ITINERARY_ITEM",
    entityId: item.id,
    excludeUserId: currentUserId
  });
  const activePresence = useUniquePresenceUsers(presenceEntries);
  usePresenceSource({
    tripId,
    entityType: "ITINERARY_ITEM",
    entityId: item.id,
    state: "EDITING",
    priority: 2,
    enabled: isTitleFocused || isAssigningPlace
  });

  function patchItem(payload: UpdateItineraryItemPayload) {
    updateItem.mutate({ itemId: item.id, payload });
  }

  function handleTitleBlur() {
    setIsTitleFocused(false);
    const nextTitle = title.trim();
    if (nextTitle && nextTitle !== item.title) {
      patchItem({ title: nextTitle, expectedVersion: item.version });
    }
  }

  async function handlePlaceSelected(nextPlace: PlaceDto) {
    await updateItem.mutateAsync({
      itemId: item.id,
      payload: {
        placeId: nextPlace.id,
        routeSegmentId: null,
        expectedVersion: item.version
      }
    });
    setIsAssigningPlace(false);
    selectItem(item.id, nextPlace.id);
  }

  function handleRemovePlace() {
    patchItem({
      placeId: null,
      routeSegmentId: null,
      expectedVersion: item.version
    });
    setIsAssigningPlace(false);
    selectItem(item.id, undefined);
  }

  return (
    <article
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition
      }}
      className={cn(
        "group rounded-md border bg-card p-3 shadow-sm transition-colors",
        isSelected && "border-primary ring-2 ring-primary/20",
        isHovered && !isSelected && "border-accent ring-1 ring-accent/30",
        isRouteFocused && !isSelected && "bg-accent/10",
        syncState === "conflicted" && "border-destructive ring-2 ring-destructive/20",
        isDragging && "relative z-20 opacity-80"
      )}
      onMouseEnter={() => {
        setHoveredItemId(item.id);
      }}
      onMouseLeave={() => setHoveredItemId(undefined)}
      onClick={() => selectItem(item.id, item.placeId ?? undefined)}
    >
      <div className="grid grid-cols-[2.25rem_1fr_auto] gap-2">
        <div className="grid justify-items-center gap-1">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {sequence}
          </span>
          <button
            type="button"
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2"
            aria-label={t("drag")}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span>{scheduleLabel}</span>
            {syncState === "conflicted" ? (
              <span
                className={cn("rounded-md px-1.5 py-0.5", "bg-destructive/10 text-destructive")}
              >
                {t(`sync.${syncState}`)}
              </span>
            ) : null}
          </div>

          {place ? (
            <div className="mt-1 min-w-0">
              <h3 className="truncate text-lg font-semibold leading-tight">{placeName}</h3>
            </div>
          ) : (
            <div className="mt-1 min-w-0">
              <input
                value={title}
                onChange={(event) =>
                  setDraft({
                    version: item.version,
                    title: event.target.value
                  })
                }
                onBlur={handleTitleBlur}
                onFocus={() => setIsTitleFocused(true)}
                onClick={(event) => event.stopPropagation()}
                className="w-full rounded-sm bg-transparent text-lg font-semibold leading-tight outline-none focus-visible:bg-muted"
                aria-label={t("titleLabel")}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-1 h-7 px-1.5 text-xs text-muted-foreground"
                onClick={(event) => {
                  event.stopPropagation();
                  setIsAssigningPlace((current) => !current);
                }}
              >
                <MapPin className="size-3.5" aria-hidden="true" />
                {t("attachPlace")}
              </Button>
            </div>
          )}

          {isAssigningPlace ? (
            <div className="mt-3" onClick={(event) => event.stopPropagation()}>
              <PlaceSearchBox
                title={place ? t("changePlace") : t("attachPlace")}
                placeholder={t("placeSearchPlaceholder")}
                className="border-dashed shadow-none"
                actionLabel={(candidate) =>
                  place
                    ? t("changePlaceTo", { name: candidate.name })
                    : t("attachPlaceTo", { name: candidate.name })
                }
                onClose={() => setIsAssigningPlace(false)}
                onPlaceSelected={handlePlaceSelected}
              />
            </div>
          ) : null}

          <StopNotesPreview
            tripId={tripId}
            item={item}
            notePreview={notePreview}
            planningLine={planningLine}
            isExpanded={isExpanded}
            onExpand={() => setIsExpanded(true)}
          />

          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <TypeIcon className="size-3" aria-hidden="true" />
              {t(`types.${item.type}`)}
            </span>
            <span>{statusLabel}</span>
            {item.durationMinutes ? (
              <span>{t("duration", { minutes: item.durationMinutes })}</span>
            ) : null}
            {item.cost !== null ? (
              <span>{formatMoney(item.cost, item.currency, locale)}</span>
            ) : null}
            {activePresence.length > 0 ? <StopPresenceIndicator entries={activePresence} /> : null}
          </div>

          {isExpanded ? (
            <div
              className="mt-3 grid gap-3 border-t pt-3 text-xs text-muted-foreground"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex flex-wrap items-center gap-2">
                {placeAddress ? <span className="min-w-0 truncate">{placeAddress}</span> : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-1.5 text-xs"
                  onClick={() => setIsAssigningPlace((current) => !current)}
                >
                  <MapPin className="size-3.5" aria-hidden="true" />
                  {place ? t("changePlace") : t("attachPlace")}
                </Button>
                {place ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-1.5 text-xs text-destructive"
                    disabled={updateItem.isPending}
                    onClick={handleRemovePlace}
                  >
                    <X className="size-3.5" aria-hidden="true" />
                    {t("removePlace")}
                  </Button>
                ) : null}
              </div>

              {routeSummary ? (
                <span className="inline-flex min-w-0 items-center gap-1">
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

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={item.status}
                  aria-label={t("statusLabel")}
                  className="h-7 rounded-md border bg-background px-2 text-xs"
                  disabled={updateItem.isPending}
                  onChange={(event) =>
                    patchItem({
                      status: event.target.value as ItineraryItem["status"],
                      expectedVersion: item.version
                    })
                  }
                >
                  {(
                    ["PLANNED", "BOOKED", "COMPLETED", "CANCELLED"] as ItineraryItem["status"][]
                  ).map((status) => (
                    <option key={status} value={status}>
                      {t(`statuses.${status}`)}
                    </option>
                  ))}
                </select>
                {item.isAllDay ? <span>{t("allDay")}</span> : null}
                {item.isFlexibleTime ? <span>{t("flexible")}</span> : null}
                {tags.map((tag) => (
                  <span key={tag} className="rounded-md border px-1.5 py-0.5">
                    {tag}
                  </span>
                ))}
                {bookingState ? (
                  <span className="rounded-md border px-1.5 py-0.5">{bookingState}</span>
                ) : null}
                {reminder ? (
                  <span className="rounded-md border px-1.5 py-0.5">{reminder}</span>
                ) : null}
                {syncState && syncState !== "conflicted" ? (
                  <span>{t(`sync.${syncState}`)}</span>
                ) : null}
                <span className="truncate">{t("editedAt", { value: updatedAt })}</span>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col items-end gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8"
            aria-label={isExpanded ? t("collapse") : t("expand")}
            onClick={(event) => {
              event.stopPropagation();
              setIsExpanded((current) => !current);
            }}
          >
            {isExpanded ? (
              <ChevronUp className="size-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="size-4" aria-hidden="true" />
            )}
          </Button>
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
      </div>
    </article>
  );
}

function StopNotesPreview({
  tripId,
  item,
  notePreview,
  planningLine,
  isExpanded,
  onExpand
}: {
  tripId: string;
  item: ItineraryItem;
  notePreview?: StopNotePreviewState | undefined;
  planningLine: string | null;
  isExpanded: boolean;
  onExpand: () => void;
}) {
  if (isExpanded) {
    return (
      <div className="mt-3 border-t pt-3" onClick={(event) => event.stopPropagation()}>
        <NotePanel
          tripId={tripId}
          targetEntityType="ITINERARY_ITEM"
          targetEntityId={item.id}
          compact
        />
      </div>
    );
  }

  const previewCapacity = planningLine ? 2 : 3;
  const notes = notePreview?.notes ?? [];
  const visibleNotes = notes.slice(0, previewCapacity);
  const noteCount = notePreview?.noteCount ?? null;
  const hiddenCount = noteCount === null ? null : Math.max(0, noteCount - visibleNotes.length);
  const hasMoreNotes =
    notePreview?.hasMoreNotes === true ||
    notes.length > visibleNotes.length ||
    (hiddenCount ?? 0) > 0;

  if (!planningLine && visibleNotes.length === 0) {
    return hasMoreNotes ? (
      <div className="mt-2">
        <MoreNotesButton hiddenCount={hiddenCount} onExpand={onExpand} />
      </div>
    ) : null;
  }

  return (
    <div className="mt-2 grid gap-1.5">
      <ul className="grid gap-1 text-sm text-foreground">
        {planningLine ? <li className="min-w-0 truncate">- {planningLine}</li> : null}
        {visibleNotes.map((note) => (
          <NotePreviewLine key={note.id} note={note} />
        ))}
      </ul>
      {hasMoreNotes ? <MoreNotesButton hiddenCount={hiddenCount} onExpand={onExpand} /> : null}
    </div>
  );
}

function StopPresenceIndicator({ entries }: { entries: PresenceEntry[] }) {
  const t = useTranslations("trip.editor.item");
  const primaryEntry = entries[0];

  if (!primaryEntry) {
    return null;
  }

  const remainingCount = Math.max(0, entries.length - 1);
  const primaryLabel =
    primaryEntry.state === "EDITING"
      ? t("presence.editing", { name: primaryEntry.userName })
      : t("presence.viewing", { name: primaryEntry.userName });

  return (
    <span className="inline-flex min-w-0 items-center gap-1 rounded-md bg-accent/10 px-1.5 py-0.5 text-accent-foreground">
      <span className="size-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
      <span className="truncate">
        {remainingCount > 0
          ? `${primaryLabel} · ${t("presence.more", { count: remainingCount })}`
          : primaryLabel}
      </span>
    </span>
  );
}

function MoreNotesButton({
  hiddenCount,
  onExpand
}: {
  hiddenCount: number | null;
  onExpand: () => void;
}) {
  const t = useTranslations("trip.editor.item");

  return (
    <button
      type="button"
      className="inline-flex w-fit items-center gap-1 rounded-md px-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2"
      onClick={(event) => {
        event.stopPropagation();
        onExpand();
      }}
    >
      <MessageSquare className="size-3" aria-hidden="true" />
      {hiddenCount !== null && hiddenCount > 0
        ? t("moreNotes", { count: hiddenCount })
        : t("moreNotesUnknown")}
    </button>
  );
}

function NotePreviewLine({ note }: { note: CollaborativeNote }) {
  return <li className="line-clamp-2 min-w-0">- {note.body}</li>;
}

function formatSchedule(
  item: ItineraryItem,
  locale: string,
  t: ReturnType<typeof useTranslations>
) {
  if (!item.startTime && !item.endTime) {
    return item.isFlexibleTime ? t("flexible") : t("unscheduled");
  }

  const timezone = item.timezone;
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    timeZone: timezone
  });
  const timeFormatter = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone
  });
  const start = item.startTime ? new Date(item.startTime) : null;
  const end = item.endTime ? new Date(item.endTime) : null;
  const startLabel = start
    ? `${dateFormatter.format(start)} \u00b7 ${timeFormatter.format(start)}`
    : null;
  const endLabel = end ? timeFormatter.format(end) : null;

  return startLabel && endLabel && startLabel !== endLabel
    ? `${startLabel} - ${endLabel}`
    : (startLabel ?? (end ? `${dateFormatter.format(end)} \u00b7 ${endLabel}` : t("unscheduled")));
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

function formatMoney(amount: number, currency: string | null, locale: string) {
  if (!currency) {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(amount);
  }

  return new Intl.NumberFormat(locale, {
    currency,
    maximumFractionDigits: 0,
    style: "currency"
  }).format(amount);
}

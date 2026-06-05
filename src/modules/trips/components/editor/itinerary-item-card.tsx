"use client";

import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import {
  BedDouble,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  GripVertical,
  MapPin,
  MessageSquare,
  Navigation,
  Route,
  ShoppingBag,
  Sparkles,
  Trash2,
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
  itineraryItemTypes,
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

type ItineraryItemType = ItineraryItem["types"][number];

const typeIcons = {
  ACTIVITY: CalendarCheck,
  LODGING: BedDouble,
  FOOD: Utensils,
  SHOPPING: ShoppingBag,
  TRANSPORTATION: Navigation,
  OTHER: Sparkles
} satisfies Record<ItineraryItemType, typeof Sparkles>;

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
  const [isSummaryFocused, setIsSummaryFocused] = useState(false);
  const [draft, setDraft] = useState(() => ({
    version: item.version,
    summary: item.summary ?? ""
  }));
  const summary = draft.version === item.version ? draft.summary : (item.summary ?? "");
  const firstType = item.types[0] ?? "OTHER";
  const TypeIcon = typeIcons[firstType];
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: {
      type: "itinerary-item"
    }
  });

  const isSelected = selectedItemId === item.id;
  const isHovered = hoveredItemId === item.id;
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
  const placeName = place?.name ?? t("unknownPlace");
  const placeAddress = place?.formattedAddress ?? place?.address;
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
    enabled: isSummaryFocused || isAssigningPlace
  });

  function patchItem(payload: UpdateItineraryItemPayload) {
    updateItem.mutate({ itemId: item.id, payload });
  }

  function handleSummaryBlur() {
    setIsSummaryFocused(false);
    const nextSummary = summary.trim();
    const currentSummary = item.summary ?? "";

    if (nextSummary !== currentSummary) {
      patchItem({
        summary: nextSummary || null,
        expectedVersion: item.version
      });
    }
  }

  async function handlePlaceSelected(nextPlace: PlaceDto) {
    await updateItem.mutateAsync({
      itemId: item.id,
      payload: {
        placeId: nextPlace.id,
        expectedVersion: item.version
      }
    });
    setIsAssigningPlace(false);
    selectItem(item.id, nextPlace.id);
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
      onMouseEnter={() => setHoveredItemId(item.id)}
      onMouseLeave={() => setHoveredItemId(undefined)}
      onClick={() => selectItem(item.id, item.placeId)}
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

          <div className="mt-1 min-w-0">
            <h3 className="truncate text-lg font-semibold leading-tight">{placeName}</h3>
            {placeAddress ? (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{placeAddress}</p>
            ) : null}
          </div>

          {isAssigningPlace ? (
            <div className="mt-3" onClick={(event) => event.stopPropagation()}>
              <PlaceSearchBox
                title={t("changePlace")}
                tripId={tripId}
                placeholder={t("placeSearchPlaceholder")}
                className="border-dashed shadow-none"
                actionLabel={(candidate) => t("changePlaceTo", { name: candidate.name })}
                onClose={() => setIsAssigningPlace(false)}
                onPlaceSelected={handlePlaceSelected}
              />
            </div>
          ) : null}

          <StopNotesPreview
            tripId={tripId}
            item={item}
            placeId={place?.id}
            notePreview={notePreview}
            planningLine={item.summary}
            isExpanded={isExpanded}
            onExpand={() => setIsExpanded(true)}
          />

          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <TypeIcon className="size-3" aria-hidden="true" />
              {item.types.map((type) => t(`types.${type}`)).join(" / ")}
            </span>
            <span>{statusLabel}</span>
            {item.durationMinutes ? (
              <span>{t("duration", { minutes: item.durationMinutes })}</span>
            ) : null}
            {activePresence.length > 0 ? <StopPresenceIndicator entries={activePresence} /> : null}
          </div>

          {isExpanded ? (
            <div
              className="mt-3 grid gap-3 border-t pt-3 text-xs text-muted-foreground"
              onClick={(event) => event.stopPropagation()}
            >
              <label className="grid gap-1">
                <span className="font-medium text-foreground">{t("summaryLabel")}</span>
                <textarea
                  value={summary}
                  rows={3}
                  className="min-h-20 rounded-md border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder={t("summaryPlaceholder")}
                  onChange={(event) =>
                    setDraft({
                      version: item.version,
                      summary: event.target.value
                    })
                  }
                  onFocus={() => setIsSummaryFocused(true)}
                  onBlur={handleSummaryBlur}
                />
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-1.5 text-xs"
                  onClick={() => setIsAssigningPlace((current) => !current)}
                >
                  <MapPin className="size-3.5" aria-hidden="true" />
                  {t("changePlace")}
                </Button>
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
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={firstType}
                  aria-label={t("typeLabel")}
                  className="h-7 rounded-md border bg-background px-2 text-xs"
                  disabled={updateItem.isPending}
                  onChange={(event) =>
                    patchItem({
                      types: [event.target.value as ItineraryItemType],
                      expectedVersion: item.version
                    })
                  }
                >
                  {itineraryItemTypes.map((type) => (
                    <option key={type} value={type}>
                      {t(`types.${type}`)}
                    </option>
                  ))}
                </select>
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
  placeId,
  notePreview,
  planningLine,
  isExpanded,
  onExpand
}: {
  tripId: string;
  item: ItineraryItem;
  placeId?: string | undefined;
  notePreview?: StopNotePreviewState | undefined;
  planningLine: string | null;
  isExpanded: boolean;
  onExpand: () => void;
}) {
  const t = useTranslations("trip.editor.item");

  if (isExpanded) {
    return (
      <div className="mt-3 grid gap-4 border-t pt-3" onClick={(event) => event.stopPropagation()}>
        <section className="grid gap-2">
          <p className="text-xs font-medium text-muted-foreground">{t("stopNotes")}</p>
          <NotePanel
            tripId={tripId}
            targetEntityType="ITINERARY_ITEM"
            targetEntityId={item.id}
            compact
          />
        </section>
        {placeId ? (
          <section className="grid gap-2">
            <p className="text-xs font-medium text-muted-foreground">{t("placeNotes")}</p>
            <NotePanel tripId={tripId} targetEntityType="PLACE" targetEntityId={placeId} compact />
          </section>
        ) : null}
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
        {planningLine ? <li className="line-clamp-2 min-w-0">{planningLine}</li> : null}
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
          ? `${primaryLabel} / ${t("presence.more", { count: remainingCount })}`
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
  return <li className="line-clamp-2 min-w-0">{note.body}</li>;
}

function formatSchedule(
  item: ItineraryItem,
  locale: string,
  t: ReturnType<typeof useTranslations>
) {
  if (!item.startsAt) {
    return t("unscheduled");
  }

  const timezone = item.timezone;
  const start = new Date(item.startsAt);
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
  const startLabel = `${dateFormatter.format(start)} / ${timeFormatter.format(start)}`;

  if (item.durationMinutes === null) {
    return startLabel;
  }

  const end = new Date(start.getTime() + item.durationMinutes * 60_000);
  const endLabel = timeFormatter.format(end);

  return `${startLabel} - ${endLabel}`;
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

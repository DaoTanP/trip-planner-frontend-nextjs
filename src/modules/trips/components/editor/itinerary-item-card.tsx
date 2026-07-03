"use client";

import type { DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core";
import {
  BedDouble,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  Circle,
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
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PresenceIndicator } from "@/modules/collaboration/components/presence-indicator";
import {
  useEntityPresenceEntries,
  usePresenceSource,
  useUniquePresenceUsers
} from "@/modules/collaboration/hooks/use-presence";
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
import {
  getTravelModeConfig,
  getItineraryItemTypeCategoryColor,
  statusColorClassNames,
  syncColorClassNames,
  syncStateBadgeClassNames
} from "@/theme";

import type { StopNotePreviewState } from "../../hooks/use-itinerary-note-previews";
import {
  getItemMetadataList,
  getItemMetadataString,
  itineraryItemTypes,
  type ItemSyncState,
  type RouteSummaryByItem
} from "../../utils/planner-workspace.utils";
import { DurationMetadataEditor, ScheduleMetadataEditor } from "./itinerary-item-metadata-editors";
import { PlaceSearchBox } from "./place-search-box";

interface ItineraryItemCardProps {
  tripId: string;
  item: ItineraryItem;
  place?: PlaceDto | undefined;
  defaultTimezone?: string | null | undefined;
  currentUserId?: string | undefined;
  routeSummary?:
    | (RouteSummaryByItem extends Map<string, infer TRoute> ? TRoute : never)
    | undefined;
  syncState?: ItemSyncState | undefined;
  isRouteFocused?: boolean | undefined;
  isExpanded?: boolean | undefined;
  onExpandedChange?: ((isExpanded: boolean) => void) | undefined;
  notePreview?: StopNotePreviewState | undefined;
  isReorderEnabled?: boolean | undefined;
  isDragPreview?: boolean | undefined;
  dragHandleProps: {
    attributes: DraggableAttributes;
    listeners: DraggableSyntheticListeners;
  };
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

const summaryCharacterLimit = 150;

export function ItineraryItemCard({
  tripId,
  item,
  place,
  defaultTimezone,
  currentUserId,
  routeSummary,
  syncState,
  isRouteFocused = false,
  isExpanded: controlledIsExpanded,
  onExpandedChange,
  notePreview,
  isReorderEnabled = false,
  isDragPreview = false,
  dragHandleProps
}: ItineraryItemCardProps) {
  const t = useTranslations("trip.editor.item");
  const locale = useLocale();
  const selectedItemId = usePlannerStore((state) => state.selectedItemId);
  const hoveredItemId = usePlannerStore((state) => state.hoveredItemId);
  const selectItem = usePlannerStore((state) => state.selectItem);
  const setHoveredItemId = usePlannerStore((state) => state.setHoveredItemId);
  const updateItem = useUpdateItineraryItemMutation(tripId);
  const deleteItem = useDeleteItineraryItemMutation(tripId);
  const summaryTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [internalIsExpanded, setInternalIsExpanded] = useState(false);
  const [isAssigningPlace, setIsAssigningPlace] = useState(false);
  const [isSummaryFocused, setIsSummaryFocused] = useState(false);
  const [draft, setDraft] = useState(() => ({
    version: item.version,
    summary: item.summary ?? ""
  }));
  const summary = draft.version === item.version ? draft.summary : (item.summary ?? "");
  const firstType = item.types[0] ?? "OTHER";
  const TypeIcon = typeIcons[firstType];
  const typeColor = getItineraryItemTypeCategoryColor(firstType);
  const isExpanded = controlledIsExpanded ?? internalIsExpanded;
  const isSelected = selectedItemId === item.id;
  const isHovered = hoveredItemId === item.id;
  const tags = getItemMetadataList(item, "tags");
  const reminder = getItemMetadataString(item, "reminder");
  const bookingState = getItemMetadataString(item, "bookingState");
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
  const scheduleParts = useMemo(
    () => formatStopScheduleParts(item.startsAt, item.timezone, defaultTimezone, locale, t),
    [defaultTimezone, item.startsAt, item.timezone, locale, t]
  );
  const durationLabel = useMemo(
    () => formatItemDuration(item.durationMinutes, t),
    [item.durationMinutes, t]
  );
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

  useEffect(() => {
    const textarea = summaryTextareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [summary]);

  function patchItem(payload: UpdateItineraryItemPayload) {
    updateItem.mutate({ itemId: item.id, payload });
  }

  async function commitItemUpdate(payload: UpdateItineraryItemPayload) {
    await updateItem.mutateAsync({ itemId: item.id, payload });
  }

  function setExpanded(nextValue: boolean | ((current: boolean) => boolean)) {
    const nextIsExpanded = typeof nextValue === "function" ? nextValue(isExpanded) : nextValue;

    setInternalIsExpanded(nextIsExpanded);
    onExpandedChange?.(nextIsExpanded);
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
      data-itinerary-item-card={item.id}
      className={cn(
        "group w-full rounded-md border border-border/70 bg-card px-3 py-2 transition-[background-color,border-color,box-shadow]",
        isSelected && "border-accent/40 bg-accent-subtle shadow-[inset_2px_0_0_var(--accent)]",
        isHovered && !isSelected && "bg-muted/30",
        isRouteFocused && !isSelected && "bg-trip-state-focused/10",
        syncState === "conflicted" && "bg-destructive/10 shadow-[inset_3px_0_0_var(--destructive)]",
        isDragPreview && "border-border shadow-md"
      )}
      onMouseEnter={() => setHoveredItemId(item.id)}
      onMouseLeave={() => setHoveredItemId(undefined)}
      onClick={() => selectItem(item.id, item.placeId)}
    >
      <div className="grid min-h-10 grid-cols-[3.1rem_minmax(0,1fr)_auto] items-center gap-2.5 sm:grid-cols-[minmax(3.25rem,4rem)_minmax(0,1fr)_auto_auto] sm:gap-3">
        <div className="min-w-0 text-right tabular-nums">
          <span className="block truncate text-[0.6875rem] leading-4 text-muted-foreground">
            {scheduleParts.date}
          </span>
          <span className="block truncate text-xs font-medium leading-4 text-foreground">
            {scheduleParts.time}
          </span>
        </div>

        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="min-w-0 truncate text-sm font-semibold leading-5">{placeName}</h3>
            <span
              className={cn(
                "hidden shrink-0 items-center gap-1 rounded-sm px-2 py-0.5 text-[0.6875rem] font-medium tracking-normal sm:inline-flex",
                typeColor.badgeClassName
              )}
              title={t(`types.${firstType}`)}
            >
              <TypeIcon className="size-3" aria-hidden="true" />
              {t(`types.${firstType}`)}
            </span>
          </div>
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[0.6875rem] leading-4 text-muted-foreground sm:hidden">
            <span
              className={cn(
                "inline-flex min-w-0 items-center gap-1 rounded-sm px-1.5 py-0.5 font-medium",
                typeColor.badgeClassName
              )}
            >
              <TypeIcon className="size-3 shrink-0" aria-hidden="true" />
              <span className="min-w-0 truncate">{t(`types.${firstType}`)}</span>
            </span>
            <span aria-hidden="true">{"\u00b7"}</span>
            <span className="shrink-0">{durationLabel}</span>
            {item.status !== "PLANNED" ? (
              <>
                <span aria-hidden="true">{"\u00b7"}</span>
                <span
                  className={cn(
                    "inline-flex min-w-0 items-center gap-1 rounded-sm border px-1.5 py-0.5 font-medium",
                    statusColorClassNames.itineraryItem[item.status]
                  )}
                >
                  <Circle className="size-3 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 truncate">{statusLabel}</span>
                </span>
              </>
            ) : null}
          </div>
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          <span className="max-w-24 truncate text-xs text-muted-foreground">{durationLabel}</span>
          {item.status !== "PLANNED" ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-xs font-medium",
                statusColorClassNames.itineraryItem[item.status]
              )}
            >
              <Circle className="size-3 shrink-0" aria-hidden="true" />
              {statusLabel}
            </span>
          ) : null}
          {syncState === "conflicted" ? (
            <span
              className={cn(
                "shrink-0 rounded-md px-1.5 py-0.5 text-xs",
                syncColorClassNames.conflictBadge
              )}
            >
              {t(`sync.${syncState}`)}
            </span>
          ) : null}
          {activePresence.length > 0 ? <PresenceIndicator entries={activePresence} /> : null}
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7"
            aria-label={isExpanded ? t("collapse") : t("expand")}
            onClick={(event) => {
              event.stopPropagation();
              setExpanded((current) => !current);
            }}
          >
            {isExpanded ? (
              <ChevronUp className="size-3.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="size-3.5" aria-hidden="true" />
            )}
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className={cn(
              "size-7 touch-none text-muted-foreground transition-[opacity,color]",
              isReorderEnabled && isDragPreview
                ? "cursor-grabbing opacity-100 md:opacity-100"
                : isReorderEnabled
                  ? "cursor-grab opacity-100 active:cursor-grabbing md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
                  : "cursor-not-allowed opacity-0"
            )}
            aria-label={t("drag")}
            disabled={!isReorderEnabled}
            onClick={(event) => event.stopPropagation()}
            {...dragHandleProps.attributes}
            {...dragHandleProps.listeners}
          >
            <GripVertical className="size-3.5" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="hidden size-7 opacity-100 md:inline-flex md:opacity-0 md:group-hover:opacity-100"
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
            <Trash2 className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {isExpanded ? (
        <div
          className="mt-2 grid gap-3 border-t border-border/70 pt-3 text-xs text-muted-foreground"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="grid gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t("summaryLabel")}</label>
            <textarea
              ref={summaryTextareaRef}
              value={summary}
              rows={1}
              maxLength={summaryCharacterLimit}
              className="block min-h-9 w-full resize-none overflow-hidden rounded-sm border border-transparent bg-background/70 px-2.5 py-1.5 text-sm leading-5 text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-border focus-visible:outline-2"
              placeholder={t("summaryPlaceholder")}
              onChange={(event) =>
                setDraft({
                  version: item.version,
                  summary: event.target.value.slice(0, summaryCharacterLimit)
                })
              }
              onFocus={() => setIsSummaryFocused(true)}
              onBlur={handleSummaryBlur}
            />
          </div>

          {placeAddress ? (
            <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{placeAddress}</span>
            </p>
          ) : null}

          {isAssigningPlace ? (
            <PlaceSearchBox
              title={t("changePlace")}
              tripId={tripId}
              placeholder={t("placeSearchPlaceholder")}
              className="border-dashed bg-background/70 shadow-none"
              actionLabel={(candidate) => t("changePlaceTo", { name: candidate.name })}
              onClose={() => setIsAssigningPlace(false)}
              onPlaceSelected={handlePlaceSelected}
            />
          ) : null}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border/70 pt-2">
            <ScheduleMetadataEditor
              startsAt={item.startsAt}
              timezone={item.timezone}
              defaultTimezone={defaultTimezone}
              disabled={updateItem.isPending}
              onCommit={({ startsAt, timezone }) =>
                commitItemUpdate({
                  startsAt,
                  timezone,
                  expectedVersion: item.version
                })
              }
            />
            <DurationMetadataEditor
              durationMinutes={item.durationMinutes}
              disabled={updateItem.isPending}
              onCommit={(durationMinutes) =>
                commitItemUpdate({
                  durationMinutes,
                  expectedVersion: item.version
                })
              }
            />
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 font-medium",
                statusColorClassNames.itineraryItem[item.status]
              )}
            >
              <Circle className="size-3 shrink-0" aria-hidden="true" />
              {statusLabel}
            </span>
            {syncState && syncState !== "conflicted" ? (
              <span
                className={cn(
                  "rounded-sm border px-2 py-0.5 font-medium",
                  syncStateBadgeClassNames[syncState]
                )}
              >
                {t(`sync.${syncState}`)}
              </span>
            ) : null}
            <span className="truncate">{t("editedAt", { value: updatedAt })}</span>
          </div>

          <StopNotesPreview
            tripId={tripId}
            item={item}
            notePreview={notePreview}
            isExpanded
            onExpand={() => setExpanded(true)}
          />

          <div className="flex flex-wrap items-center gap-2 border-t border-border/70 pt-2">
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
                    mode: t(getTravelModeConfig(routeSummary.travelMode).labelKey),
                    distance: formatDistance(routeSummary.distanceMeters, locale),
                    duration: formatRouteDuration(routeSummary.durationSeconds, t)
                  })}
                </span>
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <TypeIcon className="size-3" aria-hidden="true" />
              {item.types.map((type) => t(`types.${type}`)).join(" / ")}
            </span>
            <select
              value={firstType}
              aria-label={t("typeLabel")}
              className="h-7 rounded-sm border bg-background px-2 text-xs"
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
              className="h-7 rounded-sm border bg-background px-2 text-xs"
              disabled={updateItem.isPending}
              onChange={(event) =>
                patchItem({
                  status: event.target.value as ItineraryItem["status"],
                  expectedVersion: item.version
                })
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
            {tags.map((tag) => (
              <span key={tag} className="rounded-sm border px-2 py-0.5">
                {tag}
              </span>
            ))}
            {bookingState ? (
              <span className="rounded-sm border px-2 py-0.5">{bookingState}</span>
            ) : null}
            {reminder ? <span className="rounded-sm border px-2 py-0.5">{reminder}</span> : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-1.5 text-xs"
              disabled={deleteItem.isPending}
              onClick={() => {
                deleteItem.mutate({
                  itemId: item.id,
                  params: { clientMutationId: crypto.randomUUID() }
                });
                if (selectedItemId === item.id) {
                  selectItem(undefined, undefined);
                }
              }}
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              {t("delete")}
            </Button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function StopNotesPreview({
  tripId,
  item,
  notePreview,
  isExpanded,
  onExpand
}: {
  tripId: string;
  item: ItineraryItem;
  notePreview?: StopNotePreviewState | undefined;
  isExpanded: boolean;
  onExpand: () => void;
}) {
  const t = useTranslations("trip.editor.item");

  if (isExpanded) {
    return (
      <div
        className="grid gap-3 border-t border-border/70 pt-2"
        onClick={(event) => event.stopPropagation()}
      >
        <section className="grid gap-2">
          <p className="text-xs font-medium text-muted-foreground">{t("stopNotes")}</p>
          <NotePanel
            tripId={tripId}
            targetEntityType="ITINERARY_ITEM"
            targetEntityId={item.id}
            compact
          />
        </section>
      </div>
    );
  }

  const previewCapacity = 3;
  const notes = notePreview?.notes ?? [];
  const visibleNotes = notes.slice(0, previewCapacity);
  const noteCount = notePreview?.noteCount ?? null;
  const hiddenCount = noteCount === null ? null : Math.max(0, noteCount - visibleNotes.length);
  const hasMoreNotes =
    notePreview?.hasMoreNotes === true ||
    notes.length > visibleNotes.length ||
    (hiddenCount ?? 0) > 0;

  if (visibleNotes.length === 0) {
    return hasMoreNotes ? (
      <div className="mt-2">
        <MoreNotesButton hiddenCount={hiddenCount} onExpand={onExpand} />
      </div>
    ) : null;
  }

  return (
    <div className="mt-2 grid gap-1.5">
      <ul className="grid gap-1 text-sm text-foreground">
        {visibleNotes.map((note) => (
          <NotePreviewLine key={note.id} note={note} />
        ))}
      </ul>
      {hasMoreNotes ? <MoreNotesButton hiddenCount={hiddenCount} onExpand={onExpand} /> : null}
    </div>
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

function formatStopScheduleParts(
  startsAt: string | null,
  timezone: string | null | undefined,
  defaultTimezone: string | null | undefined,
  locale: string,
  t: ReturnType<typeof useTranslations>
) {
  if (!startsAt) {
    const unscheduled = t("unscheduled");

    return {
      date: unscheduled,
      time: "--:--",
      full: unscheduled
    };
  }

  const date = new Date(startsAt);
  const timeZone = getDisplayTimeZone(timezone, defaultTimezone);

  if (Number.isNaN(date.getTime())) {
    const unscheduled = t("unscheduled");

    return {
      date: unscheduled,
      time: "--:--",
      full: unscheduled
    };
  }

  const dateLabel = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone
  }).format(date);
  const timeLabel = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone
  }).format(date);

  return {
    date: dateLabel,
    time: timeLabel,
    full: `${dateLabel} ${timeLabel}`
  };
}

function getDisplayTimeZone(
  timezone: string | null | undefined,
  defaultTimezone: string | null | undefined
) {
  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const candidate = timezone ?? defaultTimezone ?? browserTimezone;

  return candidate && isValidTimeZone(candidate) ? candidate : "UTC";
}

function isValidTimeZone(timezone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function formatItemDuration(minutes: number | null, t: ReturnType<typeof useTranslations>) {
  if (minutes === null) {
    return t("durationFlexible");
  }

  const totalMinutes = Math.max(0, Math.round(minutes));
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor((totalMinutes % 1_440) / 60);
  const remainingMinutes = totalMinutes % 60;
  const parts = [
    days > 0 ? t("durationParts.day", { count: days }) : null,
    hours > 0 ? t("durationParts.hour", { count: hours }) : null,
    remainingMinutes > 0 || (days === 0 && hours === 0)
      ? t("durationParts.minute", { count: remainingMinutes })
      : null
  ];

  return parts.filter((part): part is string => part !== null).join(" ");
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

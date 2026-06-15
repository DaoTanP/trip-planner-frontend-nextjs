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
import {
  collaborationColorClassNames,
  getTravelModeConfig,
  getItineraryItemTypeCategoryColor,
  statusColorClassNames,
  syncColorClassNames,
  syncStateBadgeClassNames,
  tripStateColorClassNames
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
      className={cn(
        "group w-full rounded-md border bg-card p-3 shadow-sm transition-colors",
        isSelected && tripStateColorClassNames.selectedFrame,
        isHovered && !isSelected && tripStateColorClassNames.hoverFrame,
        isRouteFocused && !isSelected && tripStateColorClassNames.focusedSurface,
        syncState === "conflicted" && syncColorClassNames.conflictFrame
      )}
      onMouseEnter={() => setHoveredItemId(item.id)}
      onMouseLeave={() => setHoveredItemId(undefined)}
      onClick={() => selectItem(item.id, item.placeId)}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <h3 className="min-w-0 truncate text-base font-semibold leading-tight">
                  {placeName}
                </h3>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-normal",
                    typeColor.badgeClassName
                  )}
                  title={t(`types.${firstType}`)}
                >
                  {firstType}
                </span>
              </div>
            </div>
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
          </div>

          <div className="mt-2" onClick={(event) => event.stopPropagation()}>
            <textarea
              ref={summaryTextareaRef}
              value={summary}
              rows={1}
              maxLength={summaryCharacterLimit}
              className="block min-h-8 w-full resize-none overflow-hidden rounded-md border-0 bg-transparent py-1.5 text-sm leading-5 text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-0 focus:bg-muted/40"
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
            <p className="mt-1 truncate text-xs text-muted-foreground">{placeAddress}</p>
          ) : null}

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
            isExpanded={isExpanded}
            onExpand={() => setExpanded(true)}
          />

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
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
                "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5",
                statusColorClassNames.itineraryItem[item.status]
              )}
            >
              <Circle className="size-3 shrink-0" aria-hidden="true" />
              {statusLabel}
            </span>
            {notePreview?.noteCount !== null && notePreview?.noteCount !== undefined ? (
              <span className="inline-flex items-center gap-1">
                <MessageSquare className="size-3.5 shrink-0" aria-hidden="true" />
                {notePreview.noteCount}
              </span>
            ) : null}
            {activePresence.length > 0 ? <StopPresenceIndicator entries={activePresence} /> : null}
          </div>

          {isExpanded ? (
            <div
              className="mt-3 grid gap-3 border-t pt-3 text-xs text-muted-foreground"
              onClick={(event) => event.stopPropagation()}
            >
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
                        mode: t(getTravelModeConfig(routeSummary.travelMode).labelKey),
                        distance: formatDistance(routeSummary.distanceMeters, locale),
                        duration: formatRouteDuration(routeSummary.durationSeconds, t)
                      })}
                    </span>
                  </span>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <TypeIcon className="size-3" aria-hidden="true" />
                  {item.types.map((type) => t(`types.${type}`)).join(" / ")}
                </span>
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
                  <span
                    className={cn(
                      "rounded-md border px-1.5 py-0.5",
                      syncStateBadgeClassNames[syncState]
                    )}
                  >
                    {t(`sync.${syncState}`)}
                  </span>
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
              setExpanded((current) => !current);
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
            aria-label={t("drag")}
            {...dragHandleProps.attributes}
            {...dragHandleProps.listeners}
          >
            <GripVertical className="size-4" aria-hidden="true" />
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
  isExpanded,
  onExpand
}: {
  tripId: string;
  item: ItineraryItem;
  placeId?: string | undefined;
  notePreview?: StopNotePreviewState | undefined;
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
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-1 rounded-md px-1.5 py-0.5",
        collaborationColorClassNames.presencePill
      )}
    >
      <span
        className={cn("size-1.5 shrink-0 rounded-full", collaborationColorClassNames.presenceDot)}
        aria-hidden="true"
      />
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

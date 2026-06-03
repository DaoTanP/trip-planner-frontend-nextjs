"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { ArrowDown, Filter, MapPin, Plus, Search, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  useCreateItineraryItemMutation,
  useReorderItineraryItemsMutation
} from "@/modules/itinerary/mutations/use-itinerary-mutations";
import type { ItineraryItem } from "@/modules/itinerary/types/itinerary.types";
import type { PlaceDto } from "@/services/api/contracts";
import { usePlannerStore } from "@/stores/use-planner-store";

import {
  useItineraryNotePreviews,
  type StopNotePreviewState
} from "../../hooks/use-itinerary-note-previews";
import { useVirtualWindow } from "../../hooks/use-virtual-window";
import {
  filterTimelineItems,
  getItemMetadataNumber,
  itineraryItemStatuses,
  itineraryItemTypes,
  sortTimelineItems,
  type ItemSyncState,
  type RouteSummaryByItem
} from "../../utils/planner-workspace.utils";
import {
  buildItineraryReorderIntent,
  getPlaceMap,
  orderStride
} from "../../utils/trip-editor.utils";
import { ItineraryItemCard } from "./itinerary-item-card";
import { PlaceSearchBox } from "./place-search-box";

interface TripItineraryPanelProps {
  tripId: string;
  tripTimezone: string;
  items: ItineraryItem[];
  places: PlaceDto[];
  currentUserId?: string | undefined;
  routeSummaryByItem: RouteSummaryByItem;
  focusedRouteItemIds: string[];
  syncStateByItem: Map<string, ItemSyncState>;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
}

type InsertionAnchor = "start" | string;

const timelineEstimateSize = 250;

export function TripItineraryPanel({
  tripId,
  items,
  places,
  currentUserId,
  routeSummaryByItem,
  focusedRouteItemIds,
  syncStateByItem,
  hasNextPage = false,
  isFetchingNextPage = false,
  onLoadMore
}: TripItineraryPanelProps) {
  const locale = useLocale();
  const t = useTranslations("trip.editor.itinerary");
  const itemT = useTranslations("trip.editor.item");
  const createItem = useCreateItineraryItemMutation(tripId);
  const reorderItems = useReorderItineraryItemsMutation(tripId);
  const filters = usePlannerStore((state) => state.filters);
  const isFilterBarOpen = usePlannerStore((state) => state.isFilterBarOpen);
  const selectedItemId = usePlannerStore((state) => state.selectedItemId);
  const selectedRouteSegmentId = usePlannerStore((state) => state.selectedRouteSegmentId);
  const hoveredRouteSegmentId = usePlannerStore((state) => state.hoveredRouteSegmentId);
  const selectRouteSegment = usePlannerStore((state) => state.selectRouteSegment);
  const setHoveredRouteSegmentId = usePlannerStore((state) => state.setHoveredRouteSegmentId);
  const setFilters = usePlannerStore((state) => state.setFilters);
  const clearFilters = usePlannerStore((state) => state.clearFilters);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemType, setNewItemType] = useState<ItineraryItem["type"]>("PLACE");
  const [activeInsertion, setActiveInsertion] = useState<InsertionAnchor | null>(null);
  const [activePlaceInsertion, setActivePlaceInsertion] = useState<InsertionAnchor | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const orderedItems = useMemo(() => sortTimelineItems(items), [items]);
  const visibleItems = useMemo(
    () => filterTimelineItems(items, places, filters),
    [filters, items, places]
  );
  const placeMap = useMemo(() => getPlaceMap(places), [places]);
  const itemIds = useMemo(() => visibleItems.map((item) => item.id), [visibleItems]);
  const sequenceByItem = useMemo(
    () => new Map(orderedItems.map((item, index) => [item.id, index + 1])),
    [orderedItems]
  );
  const orderedIndexByItem = useMemo(
    () => new Map(orderedItems.map((item, index) => [item.id, index])),
    [orderedItems]
  );
  const focusedRouteItemIdSet = useMemo(() => new Set(focusedRouteItemIds), [focusedRouteItemIds]);
  const virtualWindow = useVirtualWindow({
    itemCount: visibleItems.length,
    estimateSize: timelineEstimateSize,
    overscan: 10,
    enabled: visibleItems.length > 140
  });
  const { containerRef, isVirtualized, totalSize, virtualItems } = virtualWindow;
  const visibleStopsForNotePreview = useMemo(() => {
    const previewItems = isVirtualized
      ? virtualItems
          .map((virtualItem) => visibleItems[virtualItem.index])
          .filter((item): item is ItineraryItem => item !== undefined)
      : visibleItems;

    return previewItems.map((item) => ({
      itemId: item.id,
      noteCount: getItemMetadataNumber(item, "noteCount")
    }));
  }, [isVirtualized, virtualItems, visibleItems]);
  const { previewsByItem: notePreviewsByItem } = useItineraryNotePreviews({
    tripId,
    visibleStops: visibleStopsForNotePreview,
    previewLimit: 4
  });
  const selectedRowIndex = useMemo(
    () => (selectedItemId ? visibleItems.findIndex((item) => item.id === selectedItemId) : -1),
    [selectedItemId, visibleItems]
  );
  const hasActiveFilters =
    filters.query.trim().length > 0 || filters.type !== "ALL" || filters.status !== "ALL";

  useEffect(() => {
    if (!selectedItemId || selectedRowIndex < 0) {
      return;
    }

    const timelineItemId = `timeline-item-${selectedItemId}`;

    if (isVirtualized && containerRef.current) {
      containerRef.current.scrollTo({
        top: Math.max(0, selectedRowIndex * timelineEstimateSize - timelineEstimateSize),
        behavior: "auto"
      });
    }

    const frame = window.requestAnimationFrame(() => {
      document.getElementById(timelineItemId)?.scrollIntoView({
        block: "nearest",
        behavior: "smooth"
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [containerRef, isVirtualized, selectedItemId, selectedRowIndex]);

  function handleItemDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleItemDragOver(event: DragOverEvent) {
    setOverId(event.over ? String(event.over.id) : null);
  }

  function handleItemDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);

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

  function handleSubmit(anchor: InsertionAnchor) {
    const title = newItemTitle.trim();

    if (!title) {
      return;
    }

    const afterItemId = anchor === "start" ? undefined : anchor;

    createItem.mutate(
      {
        title,
        type: newItemType,
        clientMutationId: crypto.randomUUID(),
        sortOrder: getInsertionSortOrder(orderedItems, afterItemId)
      },
      {
        onSuccess: () => {
          setNewItemTitle("");
          setActiveInsertion(null);
        }
      }
    );
  }

  async function handleSubmitPlace(anchor: InsertionAnchor, place: PlaceDto) {
    const afterItemId = anchor === "start" ? undefined : anchor;

    await createItem.mutateAsync({
      placeId: place.id,
      title: place.name,
      type: "PLACE",
      clientMutationId: crypto.randomUUID(),
      sortOrder: getInsertionSortOrder(orderedItems, afterItemId)
    });
    setActiveInsertion(null);
    setActivePlaceInsertion(null);
  }

  function handleInsertionChange(anchor: InsertionAnchor | null) {
    setActiveInsertion(anchor);
    setActivePlaceInsertion(null);
  }

  const renderStop = (item: ItineraryItem) => {
    const routeSummary = routeSummaryByItem.get(item.id);
    const itemIndex = orderedIndexByItem.get(item.id) ?? 0;
    const shouldShowRouteSegment = itemIndex > 0 && Boolean(routeSummary);
    const isRouteSegmentSelected =
      routeSummary !== undefined && selectedRouteSegmentId === routeSummary.id;
    const isRouteSegmentHovered =
      routeSummary !== undefined && hoveredRouteSegmentId === routeSummary.id;
    const insertionAnchor = item.id;

    return (
      <TimelineStopRow
        key={item.id}
        tripId={tripId}
        item={item}
        place={item.placeId ? placeMap.get(item.placeId) : undefined}
        currentUserId={currentUserId}
        routeSummary={routeSummary}
        showRouteSegment={shouldShowRouteSegment}
        isRouteSegmentSelected={isRouteSegmentSelected}
        isRouteSegmentHovered={isRouteSegmentHovered}
        isRouteFocused={focusedRouteItemIdSet.has(item.id)}
        sequence={sequenceByItem.get(item.id) ?? itemIndex + 1}
        syncState={syncStateByItem.get(item.id)}
        notePreview={notePreviewsByItem.get(item.id)}
        activeId={activeId}
        overId={overId}
        locale={locale}
        activeInsertion={activeInsertion}
        activePlaceInsertion={activePlaceInsertion}
        newItemTitle={newItemTitle}
        newItemType={newItemType}
        isCreatingItem={createItem.isPending}
        onInsertionChange={handleInsertionChange}
        onPlaceInsertionChange={setActivePlaceInsertion}
        onRouteSegmentSelect={selectRouteSegment}
        onRouteSegmentHover={setHoveredRouteSegmentId}
        onNewItemTitleChange={setNewItemTitle}
        onNewItemTypeChange={setNewItemType}
        onSubmitInsertion={() => handleSubmit(insertionAnchor)}
        onSubmitPlaceInsertion={(place) => handleSubmitPlace(insertionAnchor, place)}
        t={t}
        itemT={itemT}
      />
    );
  };

  return (
    <section className="grid gap-2">
      {isFilterBarOpen || hasActiveFilters ? (
        <div className="grid gap-2 rounded-md border bg-card p-2 shadow-sm">
          <div className="grid gap-2 xl:grid-cols-[minmax(10rem,1fr)_auto_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filters.query}
                onChange={(event) => setFilters({ query: event.target.value })}
                placeholder={t("searchPlaceholder")}
                className="h-9 pl-8"
              />
            </div>
            <select
              value={filters.type}
              aria-label={t("typeFilter")}
              className="h-9 rounded-md border bg-background px-2 text-sm"
              onChange={(event) => setFilters({ type: event.target.value })}
            >
              <option value="ALL">{t("allTypes")}</option>
              {itineraryItemTypes.map((type) => (
                <option key={type} value={type}>
                  {itemT(`types.${type}`)}
                </option>
              ))}
            </select>
            <select
              value={filters.status}
              aria-label={t("statusFilter")}
              className="h-9 rounded-md border bg-background px-2 text-sm"
              onChange={(event) => setFilters({ status: event.target.value })}
            >
              <option value="ALL">{t("allStatuses")}</option>
              {itineraryItemStatuses.map((status) => (
                <option key={status} value={status}>
                  {itemT(`statuses.${status}`)}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!hasActiveFilters}
              onClick={clearFilters}
            >
              <X aria-hidden="true" />
              {t("clear")}
            </Button>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Filter className="size-4" aria-hidden="true" />
            {t("visibleItems", { visible: visibleItems.length, total: orderedItems.length })}
          </div>
        </div>
      ) : null}

      {visibleItems.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleItemDragStart}
          onDragOver={handleItemDragOver}
          onDragEnd={handleItemDragEnd}
          onDragCancel={() => {
            setActiveId(null);
            setOverId(null);
          }}
        >
          <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
            {isVirtualized ? (
              <div ref={containerRef} className="max-h-[76dvh] overflow-y-auto pr-1">
                <div className="relative" style={{ height: totalSize }}>
                  {virtualItems.map((virtualItem) => {
                    const item = visibleItems[virtualItem.index];

                    if (!item) {
                      return null;
                    }

                    return (
                      <div
                        key={item.id}
                        className="absolute left-0 right-0 pb-2"
                        style={{
                          height: virtualItem.size,
                          transform: `translateY(${virtualItem.start}px)`
                        }}
                      >
                        {renderStop(item)}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="grid gap-1">{visibleItems.map((item) => renderStop(item))}</div>
            )}
          </SortableContext>
        </DndContext>
      ) : (
        <div className="grid gap-3 rounded-md border border-dashed bg-card p-4 text-sm text-muted-foreground">
          <p>{hasActiveFilters ? t("filteredEmpty") : t("empty")}</p>
          {!hasActiveFilters ? (
            <InlineAddStop
              anchor="start"
              activeInsertion={activeInsertion}
              activePlaceInsertion={activePlaceInsertion}
              newItemTitle={newItemTitle}
              newItemType={newItemType}
              isPending={createItem.isPending}
              onInsertionChange={handleInsertionChange}
              onPlaceInsertionChange={setActivePlaceInsertion}
              onNewItemTitleChange={setNewItemTitle}
              onNewItemTypeChange={setNewItemType}
              onSubmit={() => handleSubmit("start")}
              onSubmitPlace={(place) => handleSubmitPlace("start", place)}
              t={t}
              itemT={itemT}
            />
          ) : null}
        </div>
      )}

      {hasNextPage ? (
        <Button
          type="button"
          variant="outline"
          disabled={isFetchingNextPage}
          onClick={() => onLoadMore?.()}
        >
          {isFetchingNextPage ? t("loadingMore") : t("loadMore")}
        </Button>
      ) : null}
    </section>
  );
}

function TimelineStopRow({
  tripId,
  item,
  place,
  currentUserId,
  routeSummary,
  showRouteSegment,
  isRouteSegmentSelected,
  isRouteSegmentHovered,
  isRouteFocused,
  sequence,
  syncState,
  notePreview,
  activeId,
  overId,
  locale,
  activeInsertion,
  activePlaceInsertion,
  newItemTitle,
  newItemType,
  isCreatingItem,
  onInsertionChange,
  onPlaceInsertionChange,
  onRouteSegmentSelect,
  onRouteSegmentHover,
  onNewItemTitleChange,
  onNewItemTypeChange,
  onSubmitInsertion,
  onSubmitPlaceInsertion,
  t,
  itemT
}: {
  tripId: string;
  item: ItineraryItem;
  place?: PlaceDto | undefined;
  currentUserId?: string | undefined;
  routeSummary?:
    | (RouteSummaryByItem extends Map<string, infer TRoute> ? TRoute : never)
    | undefined;
  showRouteSegment: boolean;
  isRouteSegmentSelected: boolean;
  isRouteSegmentHovered: boolean;
  isRouteFocused: boolean;
  sequence: number;
  syncState?: ItemSyncState | undefined;
  notePreview?: StopNotePreviewState | undefined;
  activeId: string | null;
  overId: string | null;
  locale: string;
  activeInsertion: InsertionAnchor | null;
  activePlaceInsertion: InsertionAnchor | null;
  newItemTitle: string;
  newItemType: ItineraryItem["type"];
  isCreatingItem: boolean;
  onInsertionChange: (anchor: InsertionAnchor | null) => void;
  onPlaceInsertionChange: (anchor: InsertionAnchor | null) => void;
  onRouteSegmentSelect: (routeSegmentId?: string) => void;
  onRouteSegmentHover: (routeSegmentId?: string) => void;
  onNewItemTitleChange: (title: string) => void;
  onNewItemTypeChange: (type: ItineraryItem["type"]) => void;
  onSubmitInsertion: () => void;
  onSubmitPlaceInsertion: (place: PlaceDto) => Promise<void>;
  t: ReturnType<typeof useTranslations>;
  itemT: ReturnType<typeof useTranslations>;
}) {
  return (
    <div
      id={`timeline-item-${item.id}`}
      className={cn(
        "scroll-mt-24",
        overId === item.id && activeId !== item.id && "border-t-2 border-primary pt-2"
      )}
    >
      {showRouteSegment && routeSummary ? (
        <RouteSegmentSeparator
          routeSummary={routeSummary}
          locale={locale}
          isSelected={isRouteSegmentSelected}
          isHovered={isRouteSegmentHovered}
          onSelect={onRouteSegmentSelect}
          onHover={onRouteSegmentHover}
          t={t}
          itemT={itemT}
        />
      ) : null}

      <ItineraryItemCard
        tripId={tripId}
        item={item}
        place={place}
        currentUserId={currentUserId}
        routeSummary={routeSummary}
        syncState={syncState}
        sequence={sequence}
        isRouteFocused={isRouteFocused}
        notePreview={notePreview}
      />

      <InlineAddStop
        anchor={item.id}
        activeInsertion={activeInsertion}
        activePlaceInsertion={activePlaceInsertion}
        newItemTitle={newItemTitle}
        newItemType={newItemType}
        isPending={isCreatingItem}
        onInsertionChange={onInsertionChange}
        onPlaceInsertionChange={onPlaceInsertionChange}
        onNewItemTitleChange={onNewItemTitleChange}
        onNewItemTypeChange={onNewItemTypeChange}
        onSubmit={onSubmitInsertion}
        onSubmitPlace={onSubmitPlaceInsertion}
        t={t}
        itemT={itemT}
      />
    </div>
  );
}

function RouteSegmentSeparator({
  routeSummary,
  locale,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  t,
  itemT
}: {
  routeSummary: RouteSummaryByItem extends Map<string, infer TRoute> ? TRoute : never;
  locale: string;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: (routeSegmentId?: string) => void;
  onHover: (routeSegmentId?: string) => void;
  t: ReturnType<typeof useTranslations>;
  itemT: ReturnType<typeof useTranslations>;
}) {
  const distance =
    routeSummary.distanceMeters === null
      ? null
      : t("routeDistanceKilometers", {
          value: formatDistance(routeSummary.distanceMeters, locale)
        });
  const duration =
    routeSummary.durationSeconds === null
      ? null
      : itemT("routeDuration", {
          minutes: Math.max(1, Math.round(routeSummary.durationSeconds / 60))
        });
  const details = [duration, distance].filter(Boolean);
  const isFocused = isSelected || isHovered;

  return (
    <button
      type="button"
      className={cn(
        "grid w-full grid-cols-[2.25rem_1fr] items-center gap-2 rounded-md py-1 text-left text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-2",
        isFocused && "bg-accent/10 text-foreground ring-1 ring-accent/30"
      )}
      aria-pressed={isSelected}
      onClick={() => onSelect(isSelected ? undefined : routeSummary.id)}
      onMouseEnter={() => onHover(routeSummary.id)}
      onMouseLeave={() => onHover(undefined)}
    >
      <span className="flex justify-center">
        <ArrowDown className="size-4" aria-hidden="true" />
      </span>
      <span className="grid min-w-0 gap-0.5">
        <span className="truncate">{routeSummary.travelMode}</span>
        {details.length > 0 ? (
          <span className="truncate text-[0.7rem] text-muted-foreground">
            {details.join(" · ")}
          </span>
        ) : null}
      </span>
    </button>
  );
}

function InlineAddStop({
  anchor,
  activeInsertion,
  activePlaceInsertion,
  newItemTitle,
  newItemType,
  isPending,
  onInsertionChange,
  onPlaceInsertionChange,
  onNewItemTitleChange,
  onNewItemTypeChange,
  onSubmit,
  onSubmitPlace,
  t,
  itemT
}: {
  anchor: InsertionAnchor;
  activeInsertion: InsertionAnchor | null;
  activePlaceInsertion: InsertionAnchor | null;
  newItemTitle: string;
  newItemType: ItineraryItem["type"];
  isPending: boolean;
  onInsertionChange: (anchor: InsertionAnchor | null) => void;
  onPlaceInsertionChange: (anchor: InsertionAnchor | null) => void;
  onNewItemTitleChange: (title: string) => void;
  onNewItemTypeChange: (type: ItineraryItem["type"]) => void;
  onSubmit: () => void;
  onSubmitPlace: (place: PlaceDto) => Promise<void>;
  t: ReturnType<typeof useTranslations>;
  itemT: ReturnType<typeof useTranslations>;
}) {
  const isActive = activeInsertion === anchor;
  const isPlaceSearchActive = activePlaceInsertion === anchor;

  if (!isActive) {
    return (
      <button
        type="button"
        className="ml-11 flex h-8 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2"
        onClick={() => onInsertionChange(anchor)}
      >
        <Plus className="size-3.5" aria-hidden="true" />
        {t("inlineAdd")}
      </button>
    );
  }

  return (
    <div className="ml-11 grid gap-2 rounded-md border border-dashed bg-background p-2">
      <form
        className="grid gap-2 sm:grid-cols-[auto_1fr_auto_auto_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <select
          value={newItemType}
          aria-label={t("newItemType")}
          className="h-9 rounded-md border bg-background px-2 text-sm"
          onChange={(event) => onNewItemTypeChange(event.target.value as ItineraryItem["type"])}
        >
          {itineraryItemTypes.map((type) => (
            <option key={type} value={type}>
              {itemT(`types.${type}`)}
            </option>
          ))}
        </select>
        <Input
          value={newItemTitle}
          onChange={(event) => onNewItemTitleChange(event.target.value)}
          placeholder={t("addPlaceholder")}
          className="h-9"
        />
        <Button type="submit" variant="secondary" size="sm" disabled={isPending}>
          <Plus aria-hidden="true" />
          {t("add")}
        </Button>
        <Button
          type="button"
          variant={isPlaceSearchActive ? "secondary" : "outline"}
          size="sm"
          onClick={() => onPlaceInsertionChange(isPlaceSearchActive ? null : anchor)}
        >
          <MapPin aria-hidden="true" />
          {t("searchPlace")}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => onInsertionChange(null)}>
          <X aria-hidden="true" />
          {t("cancel")}
        </Button>
      </form>

      {isPlaceSearchActive ? (
        <PlaceSearchBox
          title={t("placeSearchTitle")}
          placeholder={t("placeSearchPlaceholder")}
          className="border-0 bg-transparent p-0 shadow-none"
          actionLabel={(place) => t("addPlaceHere", { name: place.name })}
          onClose={() => onPlaceInsertionChange(null)}
          onPlaceSelected={onSubmitPlace}
        />
      ) : null}
    </div>
  );
}

function getInsertionSortOrder(items: ItineraryItem[], afterItemId?: string) {
  const previousIndex = afterItemId
    ? Math.max(
        -1,
        items.findIndex((item) => item.id === afterItemId)
      )
    : -1;
  const previousItem = previousIndex >= 0 ? items[previousIndex] : undefined;
  const nextItem = items[previousIndex + 1];
  const lowerSortOrder = previousItem?.sortOrder ?? 0;
  const upperSortOrder = nextItem?.sortOrder ?? lowerSortOrder + orderStride * 2;

  return upperSortOrder - lowerSortOrder > 1
    ? lowerSortOrder + Math.floor((upperSortOrder - lowerSortOrder) / 2)
    : (previousIndex + 2) * orderStride;
}

function formatDistance(meters: number, locale: string) {
  const kilometers = meters / 1000;

  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: kilometers >= 10 ? 0 : 1
  }).format(kilometers);
}

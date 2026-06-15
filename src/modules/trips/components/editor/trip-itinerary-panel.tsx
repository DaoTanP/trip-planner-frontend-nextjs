"use client";

import {
  closestCenter,
  DragOverlay,
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
import { Filter, Plus, Search, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useCreateItineraryItemMutation,
  useReorderItineraryItemsMutation
} from "@/modules/itinerary/mutations/use-itinerary-mutations";
import type { ItineraryItem } from "@/modules/itinerary/types/itinerary.types";
import { mapTravelModes, type MapTravelMode } from "@/modules/map/types/map.types";
import type { PlaceDto } from "@/services/api/contracts";
import { usePlannerStore } from "@/stores/use-planner-store";
import { getTravelModeConfig } from "@/theme";

import {
  useItineraryNotePreviews,
  type StopNotePreviewState
} from "../../hooks/use-itinerary-note-previews";
import { useVirtualWindow } from "../../hooks/use-virtual-window";
import {
  filterStopSequence,
  itineraryItemStatuses,
  itineraryItemTypes,
  sortStopSequence,
  type ItemSyncState,
  type RouteSummaryByItem
} from "../../utils/planner-workspace.utils";
import { getDefaultItineraryItemTimezone } from "../../utils/timezone.utils";
import { buildItineraryReorderIntent, getPlaceMap } from "../../utils/trip-editor.utils";
import { ItineraryItemCard } from "./itinerary-item-card";
import { PlaceSearchBox } from "./place-search-box";
import type { StopRouteSegment, StopRouteTravelModeOption } from "./stop-sequence-rail";
import {
  StopSequenceItem,
  StopSequenceItemPreview,
  type StopSequenceDragHandleProps
} from "./stop-sequence-item";

interface TripItineraryPanelProps {
  tripId: string;
  tripTimezone?: string | null | undefined;
  items: ItineraryItem[];
  places: PlaceDto[];
  currentUserId?: string | undefined;
  routeSummaryByItem: RouteSummaryByItem;
  onRouteTravelModeChange: (routeLegId: string, travelMode: MapTravelMode) => void;
  onRouteSectionOpenChange: (routeLegId: string, isOpen: boolean) => void;
  onRoutePopoverOpenChange: (routeLegId: string, isOpen: boolean) => void;
  focusedRouteItemIds: string[];
  syncStateByItem: Map<string, ItemSyncState>;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
}

type InsertionAnchor = "start" | string;
type RouteSummary = RouteSummaryByItem extends Map<string, infer TRoute> ? TRoute : never;
type DragPreviewSize = { width: number; height: number };

const stopSequenceEstimateSize = 250;
const inertDragHandleProps: StopSequenceDragHandleProps = {
  attributes: {
    role: "button",
    tabIndex: -1,
    "aria-disabled": true,
    "aria-pressed": undefined,
    "aria-roledescription": "sortable",
    "aria-describedby": ""
  },
  listeners: undefined
};

export function TripItineraryPanel({
  tripId,
  tripTimezone,
  items,
  places,
  currentUserId,
  routeSummaryByItem,
  onRouteTravelModeChange,
  onRouteSectionOpenChange,
  onRoutePopoverOpenChange,
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
  const hoveredItemId = usePlannerStore((state) => state.hoveredItemId);
  const selectedRouteLegId = usePlannerStore((state) => state.selectedRouteLegId);
  const hoveredRouteLegId = usePlannerStore((state) => state.hoveredRouteLegId);
  const selectRouteLeg = usePlannerStore((state) => state.selectRouteLeg);
  const setHoveredRouteLegId = usePlannerStore((state) => state.setHoveredRouteLegId);
  const setFilters = usePlannerStore((state) => state.setFilters);
  const clearFilters = usePlannerStore((state) => state.clearFilters);
  const [newItemType, setNewItemType] = useState<ItineraryItem["types"][number]>("ACTIVITY");
  const [activeInsertion, setActiveInsertion] = useState<InsertionAnchor | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [dragPreviewSize, setDragPreviewSize] = useState<DragPreviewSize | null>(null);
  const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(() => new Set());
  const defaultItemTimezone = useMemo(
    () => getDefaultItineraryItemTimezone(tripTimezone),
    [tripTimezone]
  );
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const orderedItems = useMemo(() => sortStopSequence(items), [items]);
  const visibleItems = useMemo(
    () => filterStopSequence(items, places, filters),
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
  const routeTravelModeOptions = useMemo<StopRouteTravelModeOption[]>(
    () =>
      mapTravelModes.map((mode) => ({
        value: mode,
        label: t(getTravelModeConfig(mode).labelKey),
        description: t(`routeModeDescriptions.${mode}`)
      })),
    [t]
  );
  const virtualWindow = useVirtualWindow({
    itemCount: visibleItems.length,
    estimateSize: stopSequenceEstimateSize,
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

    return previewItems.map((item) => ({ itemId: item.id }));
  }, [isVirtualized, virtualItems, visibleItems]);
  const { previewsByItem: notePreviewsByItem } = useItineraryNotePreviews({
    tripId,
    visibleStops: visibleStopsForNotePreview
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

    const stopSequenceItemId = `stop-sequence-item-${selectedItemId}`;

    if (isVirtualized && containerRef.current) {
      containerRef.current.scrollTo({
        top: Math.max(0, selectedRowIndex * stopSequenceEstimateSize - stopSequenceEstimateSize),
        behavior: "auto"
      });
    }

    const frame = window.requestAnimationFrame(() => {
      document.getElementById(stopSequenceItemId)?.scrollIntoView({
        block: "nearest",
        behavior: "smooth"
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [containerRef, isVirtualized, selectedItemId, selectedRowIndex]);

  function resetDragState() {
    setActiveId(null);
    setOverId(null);
    setDragPreviewSize(null);
  }

  function handleItemDragStart(event: DragStartEvent) {
    const itemId = String(event.active.id);
    const activeElement = document.getElementById(`stop-sequence-item-${itemId}`);
    const rect = activeElement?.getBoundingClientRect() ?? event.active.rect.current.initial;

    setActiveId(itemId);
    setDragPreviewSize(rect ? { height: rect.height, width: rect.width } : null);
  }

  function handleItemDragOver(event: DragOverEvent) {
    setOverId(event.over ? String(event.over.id) : null);
  }

  function handleItemDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    resetDragState();

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

  async function handleSubmitPlace(anchor: InsertionAnchor, place: PlaceDto) {
    const payload = {
      placeId: place.id,
      types: [newItemType],
      timezone: defaultItemTimezone,
      clientMutationId: crypto.randomUUID()
    } satisfies Parameters<typeof createItem.mutateAsync>[0];
    const beforeItemId = anchor === "start" ? orderedItems[0]?.id : undefined;
    const afterItemId = anchor === "start" ? undefined : anchor;

    await createItem.mutateAsync({
      ...payload,
      ...(beforeItemId ? { beforeItemId } : {}),
      ...(afterItemId ? { afterItemId } : {})
    });
    setActiveInsertion(null);
  }

  function handleInsertionChange(anchor: InsertionAnchor | null) {
    setActiveInsertion(anchor);
  }

  function handleExpandedChange(itemId: string, isExpanded: boolean) {
    setExpandedItemIds((current) => {
      const next = new Set(current);

      if (isExpanded) {
        next.add(itemId);
      } else {
        next.delete(itemId);
      }

      return next;
    });

    const routeSummary = routeSummaryByItem.get(itemId);

    if (routeSummary) {
      onRouteSectionOpenChange(routeSummary.id, isExpanded);
    }
  }

  const renderStop = (item: ItineraryItem, visibleIndex: number) => {
    const routeSummary = routeSummaryByItem.get(item.id);
    const itemIndex = orderedIndexByItem.get(item.id) ?? 0;
    const shouldShowRouteLeg = visibleIndex > 0 && itemIndex > 0 && Boolean(routeSummary);
    const isRouteLegSelected = routeSummary !== undefined && selectedRouteLegId === routeSummary.id;
    const isRouteLegHovered = routeSummary !== undefined && hoveredRouteLegId === routeSummary.id;
    const insertionAnchor = item.id;

    return (
      <StopSequenceRow
        key={item.id}
        tripId={tripId}
        item={item}
        place={item.placeId ? placeMap.get(item.placeId) : undefined}
        defaultTimezone={defaultItemTimezone}
        currentUserId={currentUserId}
        routeSummary={routeSummary}
        routeTravelModeOptions={routeTravelModeOptions}
        showRouteLeg={shouldShowRouteLeg}
        isRouteLegSelected={isRouteLegSelected}
        isRouteLegHovered={isRouteLegHovered}
        isRouteFocused={focusedRouteItemIdSet.has(item.id)}
        isFirst={visibleIndex === 0}
        isLast={visibleIndex === visibleItems.length - 1}
        isSelected={selectedItemId === item.id}
        isHovered={hoveredItemId === item.id}
        isExpanded={expandedItemIds.has(item.id)}
        sequence={sequenceByItem.get(item.id) ?? itemIndex + 1}
        syncState={syncStateByItem.get(item.id)}
        notePreview={notePreviewsByItem.get(item.id)}
        activeId={activeId}
        overId={overId}
        locale={locale}
        activeInsertion={activeInsertion}
        newItemType={newItemType}
        onInsertionChange={handleInsertionChange}
        onRouteLegSelect={selectRouteLeg}
        onRouteLegHover={setHoveredRouteLegId}
        onRouteTravelModeChange={onRouteTravelModeChange}
        onRoutePopoverOpenChange={onRoutePopoverOpenChange}
        onExpandedChange={(isExpanded) => handleExpandedChange(item.id, isExpanded)}
        onNewItemTypeChange={setNewItemType}
        onSubmitPlaceInsertion={(place) => handleSubmitPlace(insertionAnchor, place)}
        t={t}
        itemT={itemT}
      />
    );
  };

  const renderDragOverlay = () => {
    if (!activeId || !dragPreviewSize) {
      return null;
    }

    const visibleIndex = visibleItems.findIndex((item) => item.id === activeId);
    const item = visibleItems[visibleIndex];

    if (!item) {
      return null;
    }

    const routeSummary = routeSummaryByItem.get(item.id);
    const itemIndex = orderedIndexByItem.get(item.id) ?? 0;
    const shouldShowRouteLeg = visibleIndex > 0 && itemIndex > 0 && Boolean(routeSummary);
    const isRouteLegSelected = routeSummary !== undefined && selectedRouteLegId === routeSummary.id;
    const isRouteLegHovered = routeSummary !== undefined && hoveredRouteLegId === routeSummary.id;

    return (
      <StopSequenceRowPreview
        width={dragPreviewSize.width}
        height={dragPreviewSize.height}
        tripId={tripId}
        item={item}
        place={item.placeId ? placeMap.get(item.placeId) : undefined}
        defaultTimezone={defaultItemTimezone}
        currentUserId={currentUserId}
        routeSummary={routeSummary}
        routeTravelModeOptions={routeTravelModeOptions}
        showRouteLeg={shouldShowRouteLeg}
        isRouteLegSelected={isRouteLegSelected}
        isRouteLegHovered={isRouteLegHovered}
        isRouteFocused={focusedRouteItemIdSet.has(item.id)}
        isFirst={visibleIndex === 0}
        isLast={visibleIndex === visibleItems.length - 1}
        isSelected={selectedItemId === item.id}
        isHovered={hoveredItemId === item.id}
        isExpanded={expandedItemIds.has(item.id)}
        sequence={sequenceByItem.get(item.id) ?? itemIndex + 1}
        syncState={syncStateByItem.get(item.id)}
        notePreview={notePreviewsByItem.get(item.id)}
        locale={locale}
        onRouteLegSelect={selectRouteLeg}
        onRouteLegHover={setHoveredRouteLegId}
        onRouteTravelModeChange={onRouteTravelModeChange}
        onRoutePopoverOpenChange={onRoutePopoverOpenChange}
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
          onDragCancel={resetDragState}
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
                        className="absolute left-0 right-0"
                        style={{
                          height: virtualItem.size,
                          transform: `translateY(${virtualItem.start}px)`
                        }}
                      >
                        {renderStop(item, virtualItem.index)}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="grid">
                {visibleItems.map((item, index) => renderStop(item, index))}
              </div>
            )}
          </SortableContext>
          <DragOverlay adjustScale={false} dropAnimation={null} zIndex={60}>
            {renderDragOverlay()}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="grid gap-3 rounded-md border border-dashed bg-card p-4 text-sm text-muted-foreground">
          <p>{hasActiveFilters ? t("filteredEmpty") : t("empty")}</p>
          {!hasActiveFilters ? (
            <InlineAddStop
              tripId={tripId}
              anchor="start"
              activeInsertion={activeInsertion}
              newItemType={newItemType}
              onInsertionChange={handleInsertionChange}
              onNewItemTypeChange={setNewItemType}
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

function StopSequenceRow({
  tripId,
  item,
  place,
  defaultTimezone,
  currentUserId,
  routeSummary,
  routeTravelModeOptions,
  showRouteLeg,
  isRouteLegSelected,
  isRouteLegHovered,
  isRouteFocused,
  isFirst,
  isLast,
  isSelected,
  isHovered,
  isExpanded,
  sequence,
  syncState,
  notePreview,
  activeId,
  overId,
  locale,
  activeInsertion,
  newItemType,
  onInsertionChange,
  onRouteLegSelect,
  onRouteLegHover,
  onRouteTravelModeChange,
  onRoutePopoverOpenChange,
  onExpandedChange,
  onNewItemTypeChange,
  onSubmitPlaceInsertion,
  t,
  itemT
}: {
  tripId: string;
  item: ItineraryItem;
  place?: PlaceDto | undefined;
  defaultTimezone?: string | null | undefined;
  currentUserId?: string | undefined;
  routeSummary?:
    | (RouteSummaryByItem extends Map<string, infer TRoute> ? TRoute : never)
    | undefined;
  routeTravelModeOptions: StopRouteTravelModeOption[];
  showRouteLeg: boolean;
  isRouteLegSelected: boolean;
  isRouteLegHovered: boolean;
  isRouteFocused: boolean;
  isFirst: boolean;
  isLast: boolean;
  isSelected: boolean;
  isHovered: boolean;
  isExpanded: boolean;
  sequence: number;
  syncState?: ItemSyncState | undefined;
  notePreview?: StopNotePreviewState | undefined;
  activeId: string | null;
  overId: string | null;
  locale: string;
  activeInsertion: InsertionAnchor | null;
  newItemType: ItineraryItem["types"][number];
  onInsertionChange: (anchor: InsertionAnchor | null) => void;
  onRouteLegSelect: (routeLegId?: string) => void;
  onRouteLegHover: (routeLegId?: string) => void;
  onRouteTravelModeChange: (routeLegId: string, travelMode: MapTravelMode) => void;
  onRoutePopoverOpenChange: (routeLegId: string, isOpen: boolean) => void;
  onExpandedChange: (isExpanded: boolean) => void;
  onNewItemTypeChange: (type: ItineraryItem["types"][number]) => void;
  onSubmitPlaceInsertion: (place: PlaceDto) => Promise<void>;
  t: ReturnType<typeof useTranslations>;
  itemT: ReturnType<typeof useTranslations>;
}) {
  const insertionSlot = (
    <InlineAddStop
      tripId={tripId}
      anchor={item.id}
      activeInsertion={activeInsertion}
      newItemType={newItemType}
      onInsertionChange={onInsertionChange}
      onNewItemTypeChange={onNewItemTypeChange}
      onSubmitPlace={onSubmitPlaceInsertion}
      t={t}
      itemT={itemT}
    />
  );
  const routeSegment =
    showRouteLeg && routeSummary
      ? ({
          id: routeSummary.id,
          travelMode: routeSummary.travelMode,
          travelModeLabel: formatTravelModeLabel(routeSummary.travelMode, t),
          travelModeSelectLabel: t("travelModeLabel"),
          routeModePickerTitle: t("routeModePickerTitle"),
          travelModeOptions: routeTravelModeOptions,
          metrics: formatRouteMetrics(routeSummary, locale, t, itemT),
          routeSelectLabel: formatRouteSegmentAriaLabel(routeSummary, locale, t, itemT),
          isSelected: isRouteLegSelected,
          isHovered: isRouteLegHovered,
          onSelectRoute: () => onRouteLegSelect(routeSummary.id),
          onTravelModePopoverOpenChange: (isOpen) =>
            onRoutePopoverOpenChange(routeSummary.id, isOpen),
          onHover: (nextIsHovered) => onRouteLegHover(nextIsHovered ? routeSummary.id : undefined),
          onTravelModeChange: (travelMode) => onRouteTravelModeChange(routeSummary.id, travelMode)
        } satisfies StopRouteSegment)
      : undefined;

  return (
    <div className="grid">
      <StopSequenceItem
        itemId={item.id}
        sequence={sequence}
        label={t("stopLabel", { stop: sequence })}
        isFirst={isFirst}
        isLast={isLast}
        isSelected={isSelected}
        isActive={isHovered || isRouteFocused}
        isOver={overId === item.id && activeId !== item.id}
        routeSegment={routeSegment}
        insertionSlot={insertionSlot}
      >
        {(dragHandleProps) => (
          <ItineraryItemCard
            tripId={tripId}
            item={item}
            place={place}
            defaultTimezone={defaultTimezone}
            currentUserId={currentUserId}
            routeSummary={routeSummary}
            syncState={syncState}
            isRouteFocused={isRouteFocused}
            isExpanded={isExpanded}
            onExpandedChange={onExpandedChange}
            notePreview={notePreview}
            dragHandleProps={dragHandleProps}
          />
        )}
      </StopSequenceItem>
    </div>
  );
}

function StopSequenceRowPreview({
  width,
  height,
  tripId,
  item,
  place,
  defaultTimezone,
  currentUserId,
  routeSummary,
  routeTravelModeOptions,
  showRouteLeg,
  isRouteLegSelected,
  isRouteLegHovered,
  isRouteFocused,
  isFirst,
  isLast,
  isSelected,
  isHovered,
  isExpanded,
  sequence,
  syncState,
  notePreview,
  locale,
  onRouteLegSelect,
  onRouteLegHover,
  onRouteTravelModeChange,
  onRoutePopoverOpenChange,
  t,
  itemT
}: {
  width: number;
  height: number;
  tripId: string;
  item: ItineraryItem;
  place?: PlaceDto | undefined;
  defaultTimezone?: string | null | undefined;
  currentUserId?: string | undefined;
  routeSummary?:
    | (RouteSummaryByItem extends Map<string, infer TRoute> ? TRoute : never)
    | undefined;
  routeTravelModeOptions: StopRouteTravelModeOption[];
  showRouteLeg: boolean;
  isRouteLegSelected: boolean;
  isRouteLegHovered: boolean;
  isRouteFocused: boolean;
  isFirst: boolean;
  isLast: boolean;
  isSelected: boolean;
  isHovered: boolean;
  isExpanded: boolean;
  sequence: number;
  syncState?: ItemSyncState | undefined;
  notePreview?: StopNotePreviewState | undefined;
  locale: string;
  onRouteLegSelect: (routeLegId?: string) => void;
  onRouteLegHover: (routeLegId?: string) => void;
  onRouteTravelModeChange: (routeLegId: string, travelMode: MapTravelMode) => void;
  onRoutePopoverOpenChange: (routeLegId: string, isOpen: boolean) => void;
  t: ReturnType<typeof useTranslations>;
  itemT: ReturnType<typeof useTranslations>;
}) {
  const routeSegment =
    showRouteLeg && routeSummary
      ? ({
          id: routeSummary.id,
          travelMode: routeSummary.travelMode,
          travelModeLabel: formatTravelModeLabel(routeSummary.travelMode, t),
          travelModeSelectLabel: t("travelModeLabel"),
          routeModePickerTitle: t("routeModePickerTitle"),
          travelModeOptions: routeTravelModeOptions,
          metrics: formatRouteMetrics(routeSummary, locale, t, itemT),
          routeSelectLabel: formatRouteSegmentAriaLabel(routeSummary, locale, t, itemT),
          isSelected: isRouteLegSelected,
          isHovered: isRouteLegHovered,
          onSelectRoute: () => onRouteLegSelect(routeSummary.id),
          onTravelModePopoverOpenChange: (isOpen) =>
            onRoutePopoverOpenChange(routeSummary.id, isOpen),
          onHover: (nextIsHovered) => onRouteLegHover(nextIsHovered ? routeSummary.id : undefined),
          onTravelModeChange: (travelMode) => onRouteTravelModeChange(routeSummary.id, travelMode)
        } satisfies StopRouteSegment)
      : undefined;

  return (
    <StopSequenceItemPreview
      width={width}
      height={height}
      sequence={sequence}
      label={t("stopLabel", { stop: sequence })}
      isFirst={isFirst}
      isLast={isLast}
      isSelected={isSelected}
      isActive={isHovered || isRouteFocused}
      routeSegment={routeSegment}
    >
      <ItineraryItemCard
        tripId={tripId}
        item={item}
        place={place}
        defaultTimezone={defaultTimezone}
        currentUserId={currentUserId}
        routeSummary={routeSummary}
        syncState={syncState}
        isRouteFocused={isRouteFocused}
        isExpanded={isExpanded}
        notePreview={notePreview}
        dragHandleProps={inertDragHandleProps}
      />
    </StopSequenceItemPreview>
  );
}

function formatRouteMetrics(
  routeSummary: RouteSummary,
  locale: string,
  t: ReturnType<typeof useTranslations>,
  itemT: ReturnType<typeof useTranslations>
) {
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
  return [duration, distance].filter((detail): detail is string => Boolean(detail));
}

function formatRouteMetricsLabel(
  routeSummary: RouteSummary,
  locale: string,
  t: ReturnType<typeof useTranslations>,
  itemT: ReturnType<typeof useTranslations>
) {
  const metrics = formatRouteMetrics(routeSummary, locale, t, itemT);

  return metrics.length > 0
    ? metrics.join(" \u00b7 ")
    : formatTravelModeLabel(routeSummary.travelMode, t);
}

function formatRouteSegmentAriaLabel(
  routeSummary: RouteSummary,
  locale: string,
  t: ReturnType<typeof useTranslations>,
  itemT: ReturnType<typeof useTranslations>
) {
  return t("routeSegmentAriaLabel", {
    mode: formatTravelModeLabel(routeSummary.travelMode, t),
    metrics: formatRouteMetricsLabel(routeSummary, locale, t, itemT)
  });
}

function formatTravelModeLabel(travelMode: MapTravelMode, t: ReturnType<typeof useTranslations>) {
  return t(getTravelModeConfig(travelMode).labelKey);
}

function InlineAddStop({
  tripId,
  anchor,
  activeInsertion,
  newItemType,
  onInsertionChange,
  onNewItemTypeChange,
  onSubmitPlace,
  t,
  itemT
}: {
  tripId: string;
  anchor: InsertionAnchor;
  activeInsertion: InsertionAnchor | null;
  newItemType: ItineraryItem["types"][number];
  onInsertionChange: (anchor: InsertionAnchor | null) => void;
  onNewItemTypeChange: (type: ItineraryItem["types"][number]) => void;
  onSubmitPlace: (place: PlaceDto) => Promise<void>;
  t: ReturnType<typeof useTranslations>;
  itemT: ReturnType<typeof useTranslations>;
}) {
  const isActive = activeInsertion === anchor;

  if (!isActive) {
    return (
      <button
        type="button"
        className="flex h-8 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2"
        onClick={() => onInsertionChange(anchor)}
      >
        <Plus className="size-3.5" aria-hidden="true" />
        {t("inlineAdd")}
      </button>
    );
  }

  return (
    <div className="grid gap-2 rounded-md border border-dashed bg-background p-2">
      <div className="grid gap-2 sm:grid-cols-[auto_1fr_auto]">
        <select
          value={newItemType}
          aria-label={t("newItemType")}
          className="h-9 rounded-md border bg-background px-2 text-sm"
          onChange={(event) =>
            onNewItemTypeChange(event.target.value as ItineraryItem["types"][number])
          }
        >
          {itineraryItemTypes.map((type) => (
            <option key={type} value={type}>
              {itemT(`types.${type}`)}
            </option>
          ))}
        </select>
        <span className="flex min-h-9 items-center text-sm text-muted-foreground">
          {t("placeFirstHint")}
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={() => onInsertionChange(null)}>
          <X aria-hidden="true" />
          {t("cancel")}
        </Button>
      </div>

      <PlaceSearchBox
        title={t("placeSearchTitle")}
        tripId={tripId}
        placeholder={t("placeSearchPlaceholder")}
        className="border-0 bg-transparent p-0 shadow-none"
        actionLabel={(place) => t("addPlaceHere", { name: place.name })}
        onClose={() => onInsertionChange(null)}
        onPlaceSelected={onSubmitPlace}
      />
    </div>
  );
}

function formatDistance(meters: number, locale: string) {
  const kilometers = meters / 1000;

  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: kilometers >= 10 ? 0 : 1
  }).format(kilometers);
}

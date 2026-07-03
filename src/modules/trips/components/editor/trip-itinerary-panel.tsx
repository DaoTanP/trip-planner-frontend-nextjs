"use client";

import {
  closestCenter,
  DragOverlay,
  DndContext,
  KeyboardSensor,
  MeasuringStrategy,
  MouseSensor,
  TouchSensor,
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
import {
  AlertTriangle,
  CornerDownRight,
  GripVertical,
  Minus,
  Plus,
  RefreshCw,
  Search,
  X
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject
} from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { usePresenceSource } from "@/modules/collaboration/hooks/use-presence";
import {
  useCreateItineraryItemMutation,
  useReorderItineraryItemsMutation
} from "@/modules/itinerary/mutations/use-itinerary-mutations";
import type { ItineraryItem } from "@/modules/itinerary/types/itinerary.types";
import { mapTravelModes, type MapTravelMode } from "@/modules/map/types/map.types";
import type { PlaceDto } from "@/services/api/contracts";
import { usePlannerStore } from "@/stores/use-planner-store";
import { getTravelModeConfig, semanticColorClassNames } from "@/theme";

import {
  useItineraryNotePreviews,
  type StopNotePreviewState
} from "../../hooks/use-itinerary-note-previews";
import { useVirtualWindow } from "../../hooks/use-virtual-window";
import {
  filterStopSequence,
  getScheduleOverlapIssues,
  itineraryItemStatuses,
  itineraryItemTypes,
  sortStopSequence,
  type ItemSyncState,
  type RouteSummaryByItem,
  type ScheduleOverlapIssue
} from "../../utils/planner-workspace.utils";
import { getDefaultItineraryItemTimezone } from "../../utils/timezone.utils";
import { buildItineraryReorderIntent, getPlaceMap } from "../../utils/trip-editor.utils";
import { ItineraryItemCard } from "./itinerary-item-card";
import { PlaceSearchBox } from "./place-search-box";
import type { StopRouteSegment, StopRouteTravelModeOption } from "./stop-sequence-rail";
import {
  StopSequenceItem,
  type StopSequenceDropIndicatorPosition,
  type StopSequenceDragHandleProps,
  type StopSequenceInsertionSlotPlacement
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
type DragPreviewSize = {
  width: number;
  height: number;
  cardWidth: number;
  cardOffsetX: number;
  cardOffsetY: number;
};
const dndMeasuring = {
  droppable: {
    strategy: MeasuringStrategy.Always
  }
};

const stopSequenceEstimateSize = 88;
const timelineMinimapThreshold = 12;
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
  const selectedItemId = usePlannerStore((state) => state.selectedItemId);
  const hoveredItemId = usePlannerStore((state) => state.hoveredItemId);
  const selectedRouteLegId = usePlannerStore((state) => state.selectedRouteLegId);
  const hoveredRouteLegId = usePlannerStore((state) => state.hoveredRouteLegId);
  const selectRouteLeg = usePlannerStore((state) => state.selectRouteLeg);
  const setHoveredRouteLegId = usePlannerStore((state) => state.setHoveredRouteLegId);
  const setFilters = usePlannerStore((state) => state.setFilters);
  const clearFilters = usePlannerStore((state) => state.clearFilters);
  const selectItem = usePlannerStore((state) => state.selectItem);
  const [newItemType, setNewItemType] = useState<ItineraryItem["types"][number]>("ACTIVITY");
  const [activeInsertion, setActiveInsertion] = useState<InsertionAnchor | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [dragPreviewSize, setDragPreviewSize] = useState<DragPreviewSize | null>(null);
  const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(() => new Set());
  const [jumpQuery, setJumpQuery] = useState("");
  const sectionRef = useRef<HTMLElement>(null);
  const stopListRef = useRef<HTMLDivElement>(null);
  const timelineRangeRef = useRef<HTMLSpanElement>(null);
  const jumpOptionsId = useId();
  const defaultItemTimezone = useMemo(
    () => getDefaultItineraryItemTimezone(tripTimezone),
    [tripTimezone]
  );
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  usePresenceSource({
    tripId,
    entityType: "ITINERARY",
    entityId: tripId,
    state: "EDITING",
    priority: 5,
    enabled: activeId !== null
  });
  const orderedItems = useMemo(() => sortStopSequence(items), [items]);
  const visibleItems = useMemo(
    () => filterStopSequence(items, places, filters),
    [filters, items, places]
  );
  const placeMap = useMemo(() => getPlaceMap(places), [places]);
  const itemIds = useMemo(() => visibleItems.map((item) => item.id), [visibleItems]);
  const visibleItemIdSet = useMemo(
    () => new Set(visibleItems.map((item) => item.id)),
    [visibleItems]
  );
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
    enabled: visibleItems.length > 140 && expandedItemIds.size === 0
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
  const isReorderEnabled = !hasActiveFilters;
  const hasExpandedStops = expandedItemIds.size > 0;
  const areAllVisibleStopsExpanded =
    visibleItems.length > 0 && visibleItems.every((item) => expandedItemIds.has(item.id));
  const shouldShowTimelineMinimap = visibleItems.length >= timelineMinimapThreshold;
  const timingIssues = useMemo(() => getScheduleOverlapIssues(orderedItems), [orderedItems]);
  const timingIssue = timingIssues[0] ?? null;
  const timingIssueBySecondItemId = useMemo(
    () => new Map(timingIssues.map((issue) => [issue.secondItem.id, issue])),
    [timingIssues]
  );
  const jumpOptions = useMemo(
    () =>
      orderedItems.map((item) => ({
        itemId: item.id,
        label: getStopJumpLabel(item, placeMap, sequenceByItem, t)
      })),
    [orderedItems, placeMap, sequenceByItem, t]
  );
  const activeDropIndicatorPosition = useMemo<StopSequenceDropIndicatorPosition | null>(() => {
    if (!activeId || !overId || activeId === overId) {
      return null;
    }

    const activeIndex = orderedIndexByItem.get(activeId);
    const overIndex = orderedIndexByItem.get(overId);

    if (activeIndex === undefined || overIndex === undefined) {
      return null;
    }

    return activeIndex < overIndex ? "after" : "before";
  }, [activeId, orderedIndexByItem, overId]);

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

  useEffect(() => {
    if (!shouldShowTimelineMinimap || visibleItems.length === 0) {
      return;
    }

    let frame: number | null = null;

    const updateVisibleRange = () => {
      if (frame !== null) {
        return;
      }

      frame = window.requestAnimationFrame(() => {
        frame = null;

        const scrollContainer = isVirtualized
          ? containerRef.current
          : getNearestScrollContainer(sectionRef.current);
        const containerRect = scrollContainer?.getBoundingClientRect();
        const viewportTop = containerRect?.top ?? 0;
        const viewportBottom = containerRect?.bottom ?? window.innerHeight;
        const rangeElement = timelineRangeRef.current;

        if (!rangeElement) {
          return;
        }

        const markerTrack = rangeElement.parentElement;
        const visibleRange = getVisibleStopIndexRange(visibleItems, viewportTop, viewportBottom);

        if (!markerTrack || !visibleRange) {
          rangeElement.hidden = true;
          return;
        }

        const firstMarker = getTimelineMarkerElement(markerTrack, visibleRange.startIndex);
        const lastMarker = getTimelineMarkerElement(markerTrack, visibleRange.endIndex);

        if (!firstMarker || !lastMarker) {
          rangeElement.hidden = true;
          return;
        }

        const top = `${firstMarker.offsetTop}px`;
        const bottom = `${
          markerTrack.offsetHeight - (lastMarker.offsetTop + lastMarker.offsetHeight)
        }px`;

        if (rangeElement.style.top !== top) {
          rangeElement.style.top = top;
        }
        if (rangeElement.style.bottom !== bottom) {
          rangeElement.style.bottom = bottom;
        }
        if (rangeElement.hidden) {
          rangeElement.hidden = false;
        }
      });
    };

    updateVisibleRange();

    const sectionElement = sectionRef.current;
    const scrollContainer = isVirtualized
      ? containerRef.current
      : getNearestScrollContainer(sectionElement);
    const resizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateVisibleRange);

    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", updateVisibleRange, { passive: true });
    } else {
      window.addEventListener("scroll", updateVisibleRange, { passive: true });
    }
    window.addEventListener("resize", updateVisibleRange);
    if (sectionElement) {
      resizeObserver?.observe(sectionElement);
    }
    if (stopListRef.current) {
      resizeObserver?.observe(stopListRef.current);
    }

    return () => {
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }

      if (scrollContainer) {
        scrollContainer.removeEventListener("scroll", updateVisibleRange);
      } else {
        window.removeEventListener("scroll", updateVisibleRange);
      }
      window.removeEventListener("resize", updateVisibleRange);
      resizeObserver?.disconnect();
    };
  }, [containerRef, expandedItemIds, isVirtualized, shouldShowTimelineMinimap, visibleItems]);

  function resetDragState() {
    setActiveId(null);
    setOverId(null);
    setDragPreviewSize(null);
  }

  function handleItemDragStart(event: DragStartEvent) {
    if (!isReorderEnabled) {
      return;
    }

    const itemId = String(event.active.id);
    const activeElement = document.getElementById(`stop-sequence-item-${itemId}`);
    const activeCardElement = document.querySelector<HTMLElement>(
      `[data-itinerary-item-card="${itemId}"]`
    );
    const activeRect = activeElement?.getBoundingClientRect() ?? event.active.rect.current.initial;
    const cardRect = activeCardElement?.getBoundingClientRect();

    setExpandedItemIds(new Set());
    setActiveId(itemId);
    setDragPreviewSize(
      activeRect
        ? {
            width: activeRect.width,
            height: activeRect.height,
            cardWidth: cardRect?.width ?? activeRect.width,
            cardOffsetX: cardRect ? cardRect.left - activeRect.left : 0,
            cardOffsetY: cardRect ? cardRect.top - activeRect.top : 0
          }
        : null
    );
  }

  function handleItemDragOver(event: DragOverEvent) {
    if (!isReorderEnabled) {
      return;
    }

    setOverId(event.over ? String(event.over.id) : null);
  }

  function handleItemDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    resetDragState();

    if (!isReorderEnabled) {
      return;
    }

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
    const { beforeItemId, afterItemId } = getInsertionTarget(anchor, orderedItems);

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

  function handleMobileAddStop() {
    const lastItemId = orderedItems[orderedItems.length - 1]?.id;
    const anchor = lastItemId ? getAfterInsertionAnchor(lastItemId) : "start";

    setActiveInsertion(anchor);

    if (!lastItemId) {
      return;
    }

    window.requestAnimationFrame(() => {
      document.getElementById(`stop-sequence-item-${lastItemId}`)?.scrollIntoView({
        block: "end",
        behavior: "smooth"
      });
    });
  }

  function handleJumpToStop(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const target = findJumpTarget(jumpQuery, orderedItems, placeMap, sequenceByItem);

    if (!target) {
      toast.error(t("jumpNotFound", { query: jumpQuery.trim() || "#" }));
      return;
    }

    if (hasActiveFilters && !visibleItemIdSet.has(target.id)) {
      clearFilters();
    }

    selectItem(target.id, target.placeId);
    setJumpQuery("");
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
  }

  function handleExpandVisibleStops() {
    setExpandedItemIds((current) => {
      const next = new Set(current);

      visibleItems.forEach((item) => next.add(item.id));

      return next;
    });
  }

  function handleCollapseAllStops() {
    setExpandedItemIds(new Set());
  }

  function handleReviewTimingIssue(issue: ScheduleOverlapIssue) {
    if (!visibleItemIdSet.has(issue.firstItem.id) || !visibleItemIdSet.has(issue.secondItem.id)) {
      clearFilters();
    }

    setExpandedItemIds((current) => {
      const next = new Set(current);

      next.add(issue.firstItem.id);
      next.add(issue.secondItem.id);

      return next;
    });
    selectItem(issue.secondItem.id, issue.secondItem.placeId);
  }

  const renderStop = (item: ItineraryItem, visibleIndex: number) => {
    const routeSummary = routeSummaryByItem.get(item.id);
    const itemIndex = orderedIndexByItem.get(item.id) ?? 0;
    const previousVisibleItem = visibleIndex > 0 ? visibleItems[visibleIndex - 1] : undefined;
    const previousVisibleItemIndex = previousVisibleItem
      ? orderedIndexByItem.get(previousVisibleItem.id)
      : undefined;
    const hiddenStopCount =
      previousVisibleItemIndex === undefined
        ? 0
        : Math.max(0, itemIndex - previousVisibleItemIndex - 1);
    const shouldShowRouteLeg =
      visibleIndex > 0 && itemIndex > 0 && (hiddenStopCount > 0 || Boolean(routeSummary));
    const isRouteLegSelected = routeSummary !== undefined && selectedRouteLegId === routeSummary.id;
    const isRouteLegHovered = routeSummary !== undefined && hoveredRouteLegId === routeSummary.id;
    const rowTimingIssue = timingIssueBySecondItemId.get(item.id);

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
        hiddenStopCount={hiddenStopCount}
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
        isReorderEnabled={isReorderEnabled}
        isRouteRecalculating={reorderItems.isPending}
        timingIssue={rowTimingIssue}
        dropIndicatorPosition={
          overId === item.id && activeId !== item.id ? activeDropIndicatorPosition : null
        }
        locale={locale}
        activeInsertion={activeInsertion}
        newItemType={newItemType}
        onInsertionChange={handleInsertionChange}
        onRouteLegSelect={selectRouteLeg}
        onRouteLegHover={setHoveredRouteLegId}
        onRouteTravelModeChange={onRouteTravelModeChange}
        onRoutePopoverOpenChange={onRoutePopoverOpenChange}
        onReviewTimingIssue={handleReviewTimingIssue}
        onExpandedChange={(isExpanded) => handleExpandedChange(item.id, isExpanded)}
        onNewItemTypeChange={setNewItemType}
        onSubmitPlaceInsertion={handleSubmitPlace}
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

    return (
      <div
        className="pointer-events-none relative"
        style={{
          width: dragPreviewSize.width,
          height: dragPreviewSize.height
        }}
        aria-hidden="true"
      >
        <div
          className="absolute"
          style={{
            left: dragPreviewSize.cardOffsetX,
            top: dragPreviewSize.cardOffsetY,
            width: dragPreviewSize.cardWidth
          }}
        >
          <ItineraryItemCard
            tripId={tripId}
            item={item}
            place={item.placeId ? placeMap.get(item.placeId) : undefined}
            defaultTimezone={defaultItemTimezone}
            currentUserId={currentUserId}
            routeSummary={undefined}
            syncState={syncStateByItem.get(item.id)}
            isRouteFocused={false}
            isExpanded={false}
            notePreview={undefined}
            isReorderEnabled
            isDragPreview
            dragHandleProps={inertDragHandleProps}
          />
        </div>
      </div>
    );
  };

  const dragOverlay = (
    <DragOverlay adjustScale={false} dropAnimation={null} zIndex={60}>
      {renderDragOverlay()}
    </DragOverlay>
  );
  const dragOverlayPortal =
    typeof document === "undefined" ? null : createPortal(dragOverlay, document.body);
  const reorderStatusMessage =
    activeId && overId && activeId !== overId
      ? t("reorderPreviewStatus", {
          moving: sequenceByItem.get(activeId) ?? "?",
          target: sequenceByItem.get(overId) ?? "?"
        })
      : reorderItems.isPending
        ? t("routeRecalculating")
        : "";

  return (
    <section ref={sectionRef} className="grid gap-3">
      <p className="sr-only" aria-live="polite">
        {reorderStatusMessage}
      </p>
      <div className="grid gap-2 border-b border-border/70 pb-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-[1_1_20rem]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.query}
              onChange={(event) => {
                setFilters({ query: event.target.value });
              }}
              placeholder={t("searchPlaceholder")}
              className="h-9 rounded-md border-border/70 bg-background pl-9 text-sm shadow-none"
            />
          </div>
          <form
            className="relative flex min-w-40 flex-[1_1_10rem] items-center sm:max-w-44"
            onSubmit={handleJumpToStop}
            role="search"
          >
            <CornerDownRight className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={jumpQuery}
              list={jumpOptions.length > 0 ? jumpOptionsId : undefined}
              disabled={orderedItems.length === 0}
              aria-label={t("jumpAriaLabel")}
              placeholder={t("jumpPlaceholder")}
              className="h-9 w-full rounded-md border-border/70 bg-background pl-9 pr-9 text-sm shadow-none"
              onChange={(event) => setJumpQuery(event.target.value)}
            />
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              className="absolute right-1 size-7 rounded-md"
              disabled={orderedItems.length === 0 || jumpQuery.trim().length === 0}
            >
              <CornerDownRight className="size-3.5" aria-hidden="true" />
              <span className="sr-only">{t("jumpSubmit")}</span>
            </Button>
            {jumpOptions.length > 0 ? (
              <datalist id={jumpOptionsId}>
                {jumpOptions.map((option) => (
                  <option key={option.itemId} value={option.label} />
                ))}
              </datalist>
            ) : null}
          </form>
          <select
            value={filters.type}
            aria-label={t("typeFilter")}
            className="h-9 min-w-36 flex-[1_1_9rem] rounded-md border border-border/70 bg-background px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 sm:max-w-40"
            onChange={(event) => {
              setFilters({ type: event.target.value });
            }}
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
            className="h-9 min-w-36 flex-[1_1_9rem] rounded-md border border-border/70 bg-background px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 sm:max-w-40"
            onChange={(event) => {
              setFilters({ status: event.target.value });
            }}
          >
            <option value="ALL">{t("allStatuses")}</option>
            {itineraryItemStatuses.map((status) => (
              <option key={status} value={status}>
                {itemT(`statuses.${status}`)}
              </option>
            ))}
          </select>
          {hasActiveFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 shrink-0 justify-start px-2 text-muted-foreground underline-offset-4 hover:underline"
              onClick={clearFilters}
            >
              <X aria-hidden="true" />
              {t("clear")}
            </Button>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            <span className="shrink-0">
              {t("visibleItems", { visible: visibleItems.length, total: orderedItems.length })}
            </span>
            {hasActiveFilters ? (
              <span className="inline-flex min-w-0 items-center gap-1">
                <GripVertical className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{t("reorderDisabledByFilters")}</span>
              </span>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <div
              className="hidden items-center overflow-hidden rounded-md border border-border/70 sm:flex"
              role="group"
              aria-label={t("densityLabel")}
            >
              <Button
                type="button"
                variant={!hasExpandedStops ? "secondary" : "ghost"}
                size="sm"
                className="h-7 rounded-none border-0 px-3 text-xs shadow-none"
                disabled={!hasExpandedStops}
                aria-pressed={!hasExpandedStops}
                onClick={handleCollapseAllStops}
              >
                {t("densityCompact")}
              </Button>
              <Button
                type="button"
                variant={areAllVisibleStopsExpanded ? "secondary" : "ghost"}
                size="sm"
                className="h-7 rounded-none border-0 px-3 text-xs shadow-none"
                disabled={visibleItems.length === 0 || areAllVisibleStopsExpanded}
                aria-pressed={areAllVisibleStopsExpanded}
                onClick={handleExpandVisibleStops}
              >
                {t("densityExpanded")}
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 rounded-md sm:hidden"
              disabled={!hasExpandedStops}
              aria-label={t("collapseAllStops")}
              title={t("collapseAllStops")}
              onClick={handleCollapseAllStops}
            >
              <Minus className="size-3.5" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 rounded-md sm:hidden"
              disabled={visibleItems.length === 0 || areAllVisibleStopsExpanded}
              aria-label={t("expandVisibleStops")}
              title={t("expandVisibleStops")}
              onClick={handleExpandVisibleStops}
            >
              <Plus className="size-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      {reorderItems.isPending ? (
        <div className="flex w-full items-center gap-2 rounded-md border border-dashed bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          <RefreshCw className="size-4 shrink-0 animate-spin" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">{t("routeRecalculating")}</span>
        </div>
      ) : null}

      {timingIssue ? (
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-warning/15 focus-visible:outline-2",
            semanticColorClassNames.warningSubtle
          )}
          onClick={() => handleReviewTimingIssue(timingIssue)}
        >
          <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">
            {t("timingOverlapIssue", {
              firstStop: timingIssue.firstSequence,
              secondStop: timingIssue.secondSequence
            })}
          </span>
          <span className="shrink-0 text-xs font-medium underline underline-offset-2">
            {t("reviewTiming")}
          </span>
        </button>
      ) : null}

      {visibleItems.length > 0 ? (
        <div
          className={cn(
            "grid gap-2",
            shouldShowTimelineMinimap && "md:grid-cols-[minmax(0,1fr)_1.5rem]"
          )}
        >
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            measuring={dndMeasuring}
            onDragStart={handleItemDragStart}
            onDragOver={handleItemDragOver}
            onDragEnd={handleItemDragEnd}
            onDragCancel={resetDragState}
          >
            <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
              {isVirtualized ? (
                <div ref={containerRef} className="max-h-[76dvh] overflow-y-auto pr-1">
                  <div ref={stopListRef} className="relative" style={{ height: totalSize }}>
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
                            top: virtualItem.start
                          }}
                        >
                          {renderStop(item, virtualItem.index)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div ref={stopListRef} className="grid">
                  {visibleItems.map((item, index) => renderStop(item, index))}
                </div>
              )}
            </SortableContext>
            {dragOverlayPortal}
          </DndContext>
          {shouldShowTimelineMinimap ? (
            <TimelineMinimap
              items={visibleItems}
              selectedItemId={selectedItemId}
              rangeRef={timelineRangeRef}
              placeMap={placeMap}
              sequenceByItem={sequenceByItem}
              onSelect={(item) => selectItem(item.id, item.placeId)}
              t={t}
            />
          ) : null}
        </div>
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

      {visibleItems.length > 0 && !hasActiveFilters && !activeInsertion ? (
        <div className="hidden justify-center md:flex">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-md bg-background px-4 text-accent shadow-none hover:bg-accent-subtle hover:text-accent"
            onClick={handleMobileAddStop}
          >
            <Plus className="size-4" aria-hidden="true" />
            <span>{t("inlineAddAnywhere")}</span>
          </Button>
        </div>
      ) : null}

      {visibleItems.length > 0 && !hasActiveFilters && !activeInsertion ? (
        <Button
          type="button"
          className="fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] right-3 z-40 h-11 rounded-md px-4 shadow-sm md:hidden"
          onClick={handleMobileAddStop}
        >
          <Plus className="size-4" aria-hidden="true" />
          <span>{t("inlineAdd")}</span>
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
  hiddenStopCount,
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
  isReorderEnabled,
  isRouteRecalculating,
  timingIssue,
  dropIndicatorPosition,
  locale,
  activeInsertion,
  newItemType,
  onInsertionChange,
  onRouteLegSelect,
  onRouteLegHover,
  onRouteTravelModeChange,
  onRoutePopoverOpenChange,
  onReviewTimingIssue,
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
  hiddenStopCount: number;
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
  isReorderEnabled: boolean;
  isRouteRecalculating: boolean;
  timingIssue?: ScheduleOverlapIssue | undefined;
  dropIndicatorPosition: StopSequenceDropIndicatorPosition | null;
  locale: string;
  activeInsertion: InsertionAnchor | null;
  newItemType: ItineraryItem["types"][number];
  onInsertionChange: (anchor: InsertionAnchor | null) => void;
  onRouteLegSelect: (routeLegId?: string) => void;
  onRouteLegHover: (routeLegId?: string) => void;
  onRouteTravelModeChange: (routeLegId: string, travelMode: MapTravelMode) => void;
  onRoutePopoverOpenChange: (routeLegId: string, isOpen: boolean) => void;
  onReviewTimingIssue: (issue: ScheduleOverlapIssue) => void;
  onExpandedChange: (isExpanded: boolean) => void;
  onNewItemTypeChange: (type: ItineraryItem["types"][number]) => void;
  onSubmitPlaceInsertion: (anchor: InsertionAnchor, place: PlaceDto) => Promise<void>;
  t: ReturnType<typeof useTranslations>;
  itemT: ReturnType<typeof useTranslations>;
}) {
  const beforeInsertionAnchor = getBeforeInsertionAnchor(item.id);
  const afterInsertionAnchor = getAfterInsertionAnchor(item.id);
  const isBeforeInsertionActive =
    activeInsertion === beforeInsertionAnchor || (isFirst && activeInsertion === "start");
  const isAfterInsertionActive = activeInsertion === afterInsertionAnchor;
  const activeInsertionSlotAnchor = isBeforeInsertionActive
    ? activeInsertion === "start"
      ? "start"
      : beforeInsertionAnchor
    : isAfterInsertionActive
      ? afterInsertionAnchor
      : null;
  const insertionSlotPlacement: StopSequenceInsertionSlotPlacement = isBeforeInsertionActive
    ? "before"
    : "after";
  const insertionSlot = activeInsertionSlotAnchor ? (
    <InlineAddStop
      tripId={tripId}
      anchor={activeInsertionSlotAnchor}
      activeInsertion={activeInsertion}
      newItemType={newItemType}
      showTrigger={false}
      onInsertionChange={onInsertionChange}
      onNewItemTypeChange={onNewItemTypeChange}
      onSubmitPlace={(place) => onSubmitPlaceInsertion(activeInsertionSlotAnchor, place)}
      t={t}
      itemT={itemT}
    />
  ) : null;
  const routeSegment =
    showRouteLeg && hiddenStopCount > 0
      ? ({
          kind: "gap",
          id: `hidden-gap:${item.id}`,
          metrics: [t("hiddenStopGap", { count: hiddenStopCount })],
          routeSelectLabel: t("hiddenStopGapLabel", { count: hiddenStopCount }),
          isSelected: false,
          isHovered: false
        } satisfies StopRouteSegment)
      : showRouteLeg && routeSummary
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
            isPending: isRouteRecalculating,
            addStopLabel: t("inlineAdd"),
            isAddStopActive: activeInsertion === beforeInsertionAnchor,
            onAddStop: isReorderEnabled
              ? () =>
                  onInsertionChange(
                    activeInsertion === beforeInsertionAnchor ? null : beforeInsertionAnchor
                  )
              : undefined,
            onSelectRoute: () => onRouteLegSelect(routeSummary.id),
            onTravelModePopoverOpenChange: (isOpen) =>
              onRoutePopoverOpenChange(routeSummary.id, isOpen),
            onHover: (nextIsHovered) =>
              onRouteLegHover(nextIsHovered ? routeSummary.id : undefined),
            onTravelModeChange: (travelMode) => onRouteTravelModeChange(routeSummary.id, travelMode)
          } satisfies StopRouteSegment)
        : undefined;

  return (
    <div className="grid">
      {timingIssue ? (
        <button
          type="button"
          className={cn(
            "mb-1 ml-10 flex min-w-0 items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-warning/15 focus-visible:outline-2",
            semanticColorClassNames.warningSubtle
          )}
          onClick={() => onReviewTimingIssue(timingIssue)}
        >
          <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">
            {t("timingOverlapIssue", {
              firstStop: timingIssue.firstSequence,
              secondStop: timingIssue.secondSequence
            })}
          </span>
          <span className="shrink-0 font-medium underline underline-offset-2">
            {t("reviewTiming")}
          </span>
        </button>
      ) : null}
      <StopSequenceItem
        itemId={item.id}
        sequence={sequence}
        label={t("stopLabel", { stop: sequence })}
        isFirst={isFirst}
        isLast={isLast}
        isSelected={isSelected}
        isActive={isHovered || isRouteFocused}
        isReorderEnabled={isReorderEnabled}
        dropIndicatorPosition={dropIndicatorPosition}
        routeSegment={routeSegment}
        insertionSlot={insertionSlot}
        insertionSlotPlacement={insertionSlotPlacement}
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
            isReorderEnabled={isReorderEnabled}
            dragHandleProps={dragHandleProps}
          />
        )}
      </StopSequenceItem>
    </div>
  );
}

function TimelineMinimap({
  items,
  selectedItemId,
  rangeRef,
  placeMap,
  sequenceByItem,
  onSelect,
  t
}: {
  items: ItineraryItem[];
  selectedItemId?: string | undefined;
  rangeRef: RefObject<HTMLSpanElement | null>;
  placeMap: Map<string, PlaceDto>;
  sequenceByItem: Map<string, number>;
  onSelect: (item: ItineraryItem) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const handlePointerNavigation = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (items.length === 0 || (event.pointerType !== "touch" && event.button !== 0)) {
      return;
    }

    event.preventDefault();

    const track = event.currentTarget;
    let lastSelectedIndex = -1;
    const selectFromPointer = (clientY: number) => {
      const rect = track.getBoundingClientRect();

      if (rect.height <= 0) {
        return;
      }

      const progress = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
      const index = Math.min(items.length - 1, Math.floor(progress * items.length));
      const item = items[index];

      if (!item || index === lastSelectedIndex) {
        return;
      }

      lastSelectedIndex = index;
      onSelect(item);
    };
    const handlePointerMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      selectFromPointer(moveEvent.clientY);
    };
    const handlePointerUp = () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
    };

    selectFromPointer(event.clientY);
    document.addEventListener("pointermove", handlePointerMove, { passive: false });
    document.addEventListener("pointerup", handlePointerUp, { once: true });
  };

  return (
    <nav
      className="hidden max-h-[calc(100dvh-7rem)] overflow-y-auto md:sticky md:top-0 md:block md:self-start"
      aria-label={t("timelineMinimapLabel")}
    >
      <div
        className="relative grid touch-none justify-center gap-1 before:absolute before:bottom-2 before:left-1/2 before:top-2 before:w-px before:-translate-x-1/2 before:bg-border/70"
        onPointerDown={handlePointerNavigation}
      >
        <span
          ref={rangeRef}
          className="pointer-events-none absolute left-1/2 z-0 min-h-5 w-3 -translate-x-1/2 rounded-sm border border-ring/30 bg-ring/15"
          aria-hidden="true"
          hidden
        />
        {items.map((item, index) => {
          const sequence = sequenceByItem.get(item.id) ?? 0;
          const label = getStopJumpLabel(item, placeMap, sequenceByItem, t);
          const isSelected = selectedItemId === item.id;

          return (
            <button
              key={item.id}
              type="button"
              data-timeline-minimap-index={index}
              className={cn(
                "relative z-10 flex size-5 items-center justify-center rounded-sm border bg-background text-[0.625rem] font-semibold leading-none text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2",
                isSelected && "border-accent bg-accent text-white"
              )}
              aria-label={t("timelineMinimapStop", { stop: sequence, name: label })}
              title={label}
              onClick={() => onSelect(item)}
            >
              {sequence}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function getVisibleStopIndexRange(
  items: ItineraryItem[],
  viewportTop: number,
  viewportBottom: number
) {
  let startIndex: number | null = null;
  let endIndex: number | null = null;

  items.forEach((item, index) => {
    const element = document.getElementById(`stop-sequence-item-${item.id}`);

    if (!element) {
      return;
    }

    const rect = element.getBoundingClientRect();

    if (rect.bottom <= viewportTop || rect.top >= viewportBottom) {
      return;
    }

    startIndex ??= index;
    endIndex = index;
  });

  if (startIndex === null || endIndex === null) {
    return null;
  }

  return { startIndex, endIndex };
}

function getTimelineMarkerElement(track: Element, index: number) {
  return track.querySelector<HTMLElement>(`[data-timeline-minimap-index="${index}"]`);
}

function getNearestScrollContainer(element: HTMLElement | null) {
  let current = element?.parentElement ?? null;

  while (current) {
    const overflowY = window.getComputedStyle(current).overflowY;

    if (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") {
      return current;
    }

    current = current.parentElement;
  }

  return null;
}

function getStopJumpLabel(
  item: ItineraryItem,
  placeMap: Map<string, PlaceDto>,
  sequenceByItem: Map<string, number>,
  t: ReturnType<typeof useTranslations>
) {
  const sequence = sequenceByItem.get(item.id) ?? 0;
  const stopLabel = t("stopLabel", { stop: sequence });
  const place = item.placeId ? placeMap.get(item.placeId) : undefined;

  return `#${sequence} ${place?.name ?? item.summary ?? stopLabel}`;
}

function findJumpTarget(
  query: string,
  items: ItineraryItem[],
  placeMap: Map<string, PlaceDto>,
  sequenceByItem: Map<string, number>
) {
  const normalizedQuery = normalizeJumpQuery(query);

  if (!normalizedQuery) {
    return undefined;
  }

  const sequenceMatch = normalizedQuery.match(/^#?\s*(\d+)\b/);

  if (sequenceMatch?.[1]) {
    const requestedSequence = Number.parseInt(sequenceMatch[1], 10);
    const sequenceTarget = items.find((item) => sequenceByItem.get(item.id) === requestedSequence);

    if (sequenceTarget) {
      return sequenceTarget;
    }
  }

  return items.find((item) =>
    getStopJumpSearchText(item, placeMap, sequenceByItem).includes(normalizedQuery)
  );
}

function getStopJumpSearchText(
  item: ItineraryItem,
  placeMap: Map<string, PlaceDto>,
  sequenceByItem: Map<string, number>
) {
  const sequence = sequenceByItem.get(item.id);
  const place = item.placeId ? placeMap.get(item.placeId) : undefined;
  const values = [
    sequence !== undefined ? String(sequence) : null,
    sequence !== undefined ? `#${sequence}` : null,
    place?.name,
    place?.formattedAddress,
    place?.address,
    item.summary,
    item.status,
    ...item.types
  ];

  return normalizeJumpQuery(values.filter((value): value is string => Boolean(value)).join(" "));
}

function normalizeJumpQuery(value: string) {
  return value
    .trim()
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getBeforeInsertionAnchor(itemId: string): InsertionAnchor {
  return `before:${itemId}`;
}

function getAfterInsertionAnchor(itemId: string): InsertionAnchor {
  return `after:${itemId}`;
}

function getInsertionTarget(anchor: InsertionAnchor, orderedItems: ItineraryItem[]) {
  if (anchor === "start") {
    return {
      beforeItemId: orderedItems[0]?.id,
      afterItemId: undefined
    };
  }

  if (anchor.startsWith("before:")) {
    return {
      beforeItemId: anchor.slice("before:".length) || undefined,
      afterItemId: undefined
    };
  }

  if (anchor.startsWith("after:")) {
    return {
      beforeItemId: undefined,
      afterItemId: anchor.slice("after:".length) || undefined
    };
  }

  return {
    beforeItemId: undefined,
    afterItemId: anchor
  };
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
  isContextual = false,
  showTrigger = true,
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
  isContextual?: boolean | undefined;
  showTrigger?: boolean | undefined;
  onInsertionChange: (anchor: InsertionAnchor | null) => void;
  onNewItemTypeChange: (type: ItineraryItem["types"][number]) => void;
  onSubmitPlace: (place: PlaceDto) => Promise<void>;
  t: ReturnType<typeof useTranslations>;
  itemT: ReturnType<typeof useTranslations>;
}) {
  const isActive = activeInsertion === anchor;

  if (!isActive) {
    if (!showTrigger) {
      return null;
    }

    return (
      <button
        type="button"
        className={cn(
          "flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-opacity hover:bg-muted hover:text-foreground focus-visible:outline-2",
          isContextual &&
            "md:opacity-0 md:group-hover/stop:opacity-100 md:focus-visible:opacity-100"
        )}
        onClick={() => onInsertionChange(anchor)}
      >
        <Plus className="size-3.5" aria-hidden="true" />
        {t("inlineAdd")}
      </button>
    );
  }

  return (
    <div className="grid gap-2 rounded-md border border-dashed border-border/80 bg-muted/20 p-3">
      <div className="grid gap-2 sm:grid-cols-[auto_1fr_auto]">
        <select
          value={newItemType}
          aria-label={t("newItemType")}
          className="h-9 rounded-md border bg-background px-3 text-sm"
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

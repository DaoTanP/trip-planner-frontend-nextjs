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
import { Filter, ListOrdered, Plus, Search, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  useCreateItineraryItemMutation,
  useReorderItineraryItemsMutation
} from "@/modules/itinerary/mutations/use-itinerary-mutations";
import type { ItineraryItem } from "@/modules/itinerary/types/itinerary.types";
import type { PlaceDto } from "@/services/api/contracts";
import {
  usePlannerStore,
  type PlannerGroupingMode
} from "@/stores/use-planner-store";

import { useVirtualWindow } from "../../hooks/use-virtual-window";
import {
  buildTimelineRows,
  filterTimelineItems,
  itineraryItemStatuses,
  itineraryItemTypes,
  sortTimelineItems,
  type ItemSyncState,
  type RouteSummaryByItem,
  type TimelineGroup,
  type TimelineRow
} from "../../utils/planner-workspace.utils";
import { buildItineraryReorderIntent, getPlaceMap, orderStride } from "../../utils/trip-editor.utils";
import { ItineraryItemCard } from "./itinerary-item-card";

interface TripItineraryPanelProps {
  tripId: string;
  tripTimezone: string;
  items: ItineraryItem[];
  places: PlaceDto[];
  routeSummaryByItem: RouteSummaryByItem;
  syncStateByItem: Map<string, ItemSyncState>;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
}

const groupingModes: PlannerGroupingMode[] = ["day", "city", "type", "flat"];

export function TripItineraryPanel({
  tripId,
  tripTimezone,
  items,
  places,
  routeSummaryByItem,
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
  const groupingMode = usePlannerStore((state) => state.groupingMode);
  const setFilters = usePlannerStore((state) => state.setFilters);
  const clearFilters = usePlannerStore((state) => state.clearFilters);
  const setGroupingMode = usePlannerStore((state) => state.setGroupingMode);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemType, setNewItemType] = useState<ItineraryItem["type"]>("ACTIVITY");
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
  const rows = useMemo(
    () => buildTimelineRows(visibleItems, places, groupingMode, locale, tripTimezone),
    [groupingMode, locale, places, tripTimezone, visibleItems]
  );
  const placeMap = useMemo(() => getPlaceMap(places), [places]);
  const itemIds = useMemo(() => visibleItems.map((item) => item.id), [visibleItems]);
  const virtualWindow = useVirtualWindow({
    itemCount: rows.length,
    estimateSize: 220,
    overscan: 12,
    enabled: rows.length > 140
  });
  const { containerRef, isVirtualized, totalSize, virtualItems } = virtualWindow;
  const hasActiveFilters =
    filters.query.trim().length > 0 || filters.type !== "ALL" || filters.status !== "ALL";

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

  function handleSubmit() {
    const title = newItemTitle.trim();

    if (!title) {
      return;
    }

    const lastSortOrder = orderedItems.at(-1)?.sortOrder ?? 0;

    createItem.mutate(
      {
        title,
        type: newItemType,
        clientMutationId: crypto.randomUUID(),
        sortOrder: lastSortOrder + orderStride
      },
      {
        onSuccess: () => setNewItemTitle("")
      }
    );
  }

  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{t("title")}</h2>
          <p className="text-xs text-muted-foreground">
            {t("visibleItems", { visible: visibleItems.length, total: orderedItems.length })}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
          <ListOrdered className="size-3" aria-hidden="true" />
          {t("items", { count: orderedItems.length })}
        </span>
      </div>

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

        <div className="flex flex-wrap items-center gap-1">
          <Filter className="size-4 text-muted-foreground" aria-hidden="true" />
          {groupingModes.map((mode) => (
            <button
              key={mode}
              type="button"
              className={cn(
                "h-8 rounded-md px-2 text-xs font-medium hover:bg-muted focus-visible:outline-2",
                groupingMode === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              )}
              onClick={() => setGroupingMode(mode)}
            >
              {t(`grouping.${mode}`)}
            </button>
          ))}
        </div>
      </div>

      <form
        className="grid gap-2 rounded-md border bg-card p-2 shadow-sm sm:grid-cols-[auto_1fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
      >
        <select
          value={newItemType}
          aria-label={t("newItemType")}
          className="h-9 rounded-md border bg-background px-2 text-sm"
          onChange={(event) => setNewItemType(event.target.value as ItineraryItem["type"])}
        >
          {itineraryItemTypes.map((type) => (
            <option key={type} value={type}>
              {itemT(`types.${type}`)}
            </option>
          ))}
        </select>
        <Input
          value={newItemTitle}
          onChange={(event) => setNewItemTitle(event.target.value)}
          placeholder={t("addPlaceholder")}
          className="h-9"
        />
        <Button type="submit" variant="secondary" size="sm" disabled={createItem.isPending}>
          <Plus aria-hidden="true" />
          {t("add")}
        </Button>
      </form>

      {rows.length > 0 ? (
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
              <div ref={containerRef} className="max-h-[72dvh] overflow-y-auto pr-1">
                <div className="relative" style={{ height: totalSize }}>
                  {virtualItems.map((virtualItem) => {
                    const row = rows[virtualItem.index];

                    if (!row) {
                      return null;
                    }

                    return (
                      <div
                        key={row.id}
                        className="absolute left-0 right-0 pb-2"
                        style={{
                          height: virtualItem.size,
                          transform: `translateY(${virtualItem.start}px)`
                        }}
                      >
                        <TimelineRowView
                          row={row}
                          tripId={tripId}
                          placeMap={placeMap}
                          routeSummaryByItem={routeSummaryByItem}
                          syncStateByItem={syncStateByItem}
                          overId={overId}
                          activeId={activeId}
                          itemT={itemT}
                          t={t}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="grid gap-2">
                {rows.map((row) => (
                  <TimelineRowView
                    key={row.id}
                    row={row}
                    tripId={tripId}
                    placeMap={placeMap}
                    routeSummaryByItem={routeSummaryByItem}
                    syncStateByItem={syncStateByItem}
                    overId={overId}
                    activeId={activeId}
                    itemT={itemT}
                    t={t}
                  />
                ))}
              </div>
            )}
          </SortableContext>
        </DndContext>
      ) : (
        <div className="rounded-md border border-dashed bg-card p-6 text-sm text-muted-foreground">
          {hasActiveFilters ? t("filteredEmpty") : t("empty")}
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

function TimelineRowView({
  row,
  tripId,
  placeMap,
  routeSummaryByItem,
  syncStateByItem,
  overId,
  activeId,
  itemT,
  t
}: {
  row: TimelineRow;
  tripId: string;
  placeMap: Map<string, PlaceDto>;
  routeSummaryByItem: RouteSummaryByItem;
  syncStateByItem: Map<string, ItemSyncState>;
  overId: string | null;
  activeId: string | null;
  itemT: ReturnType<typeof useTranslations>;
  t: ReturnType<typeof useTranslations>;
}) {
  if (row.type === "group") {
    return <TimelineGroupHeader group={row.group} itemT={itemT} t={t} />;
  }

  const item = row.item;

  return (
    <div
      className={cn(
        "rounded-md",
        overId === item.id && activeId !== item.id && "border-t-2 border-primary pt-2"
      )}
    >
      <ItineraryItemCard
        tripId={tripId}
        item={item}
        place={item.placeId ? placeMap.get(item.placeId) : undefined}
        routeSummary={routeSummaryByItem.get(item.id)}
        syncState={syncStateByItem.get(item.id)}
      />
    </div>
  );
}

function TimelineGroupHeader({
  group,
  itemT,
  t
}: {
  group: TimelineGroup;
  itemT: ReturnType<typeof useTranslations>;
  t: ReturnType<typeof useTranslations>;
}) {
  const label =
    group.mode === "type"
      ? itemT(`types.${group.key as ItineraryItem["type"]}`)
      : group.label ?? (group.fallbackKey ? t(`groups.${group.fallbackKey}`) : group.key);

  return (
    <div className="sticky top-0 z-10 flex items-center justify-between gap-3 rounded-md border bg-card/95 px-3 py-2 text-xs font-semibold shadow-sm backdrop-blur">
      <span className="truncate">{label}</span>
      <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-muted-foreground">
        {t("groupCount", { count: group.itemCount })}
      </span>
    </div>
  );
}

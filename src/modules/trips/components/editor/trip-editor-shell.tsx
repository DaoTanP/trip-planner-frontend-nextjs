"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo } from "react";
import { RefreshCw, X } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/error-state";
import {
  mapRouteQueryOptions,
  tripRouteSegmentsQueryOptions
} from "@/modules/map/queries/map-route.queries";
import { getRouteRenderPoints } from "@/modules/map/services/routing/route-normalizer";
import type { MapMarker } from "@/modules/map/types/map.types";
import { decodePolyline } from "@/modules/map/utils/polyline";
import { itineraryInfiniteQueryOptions } from "@/modules/itinerary/queries/itinerary.queries";
import { NotePanel } from "@/modules/notes/components/note-panel";
import { tripPlacesQueryOptions } from "@/modules/places/queries/place.queries";
import { useTripDeltaSync } from "@/modules/sync/hooks/use-trip-delta-sync";
import { useSyncDebug } from "@/modules/sync/hooks/use-sync-debug";
import { usePlannerStore } from "@/stores/use-planner-store";

import {
  tripCollaboratorsQueryOptions,
  tripDetailQueryOptions,
  tripExpensesQueryOptions
} from "../../queries/trip.queries";
import {
  getItemRoutePoints,
  getCachedRoutePoints,
  getItineraryMapMarkers,
  getItineraryRoute
} from "../../utils/trip-editor.utils";
import {
  buildCollaboratorPresence,
  buildItemSyncStateMap,
  buildPlannerInsights,
  buildPlannerStats,
  buildRouteSummaryByItem
} from "../../utils/planner-workspace.utils";
import { PlannerFloatingActions } from "./planner-floating-actions";
import { PlannerInsights } from "./planner-insights";
import { PlaceSearchBox } from "./place-search-box";
import { TripEditorHeader } from "./trip-editor-header";
import { TripEditorSkeleton } from "./trip-editor-skeleton";
import { TripItineraryPanel } from "./trip-itinerary-panel";

const LazyTripMap = dynamic(
  () => import("@/modules/map/components/trip-map").then((mod) => mod.TripMap),
  {
    ssr: false,
    loading: () => <div className="h-[26rem] rounded-md border bg-muted md:h-[calc(100dvh-8rem)]" />
  }
);

interface TripEditorShellProps {
  tripId: string;
}

export function TripEditorShell({ tripId }: TripEditorShellProps) {
  const locale = useLocale();
  const t = useTranslations("trip.editor");
  const tripQuery = useQuery(tripDetailQueryOptions(tripId));
  const itineraryQuery = useInfiniteQuery(itineraryInfiniteQueryOptions(tripId));
  const placesQuery = useQuery(tripPlacesQueryOptions(tripId));
  const routeSegmentsQuery = useQuery(tripRouteSegmentsQueryOptions(tripId));
  const collaboratorsQuery = useQuery(tripCollaboratorsQueryOptions(tripId));
  const expensesQuery = useQuery(tripExpensesQueryOptions(tripId));
  const syncDebug = useSyncDebug(tripId);
  useTripDeltaSync(tripId);
  const viewport = usePlannerStore((state) => state.viewport);
  const selectedItemId = usePlannerStore((state) => state.selectedItemId);
  const hoveredItemId = usePlannerStore((state) => state.hoveredItemId);
  const activeRouteItemId = usePlannerStore((state) => state.activeRouteItemId);
  const isMobileMapOpen = usePlannerStore((state) => state.isMobileMapOpen);
  const setViewport = usePlannerStore((state) => state.setViewport);
  const selectItem = usePlannerStore((state) => state.selectItem);
  const setHoveredItemId = usePlannerStore((state) => state.setHoveredItemId);
  const setMobileMapOpen = usePlannerStore((state) => state.setMobileMapOpen);
  const setSelectedTripId = usePlannerStore((state) => state.setSelectedTripId);

  const items = useMemo(
    () => itineraryQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [itineraryQuery.data]
  );
  const places = useMemo(() => placesQuery.data ?? [], [placesQuery.data]);
  const routeSegments = useMemo(
    () => routeSegmentsQuery.data?.items ?? [],
    [routeSegmentsQuery.data]
  );
  const markers = useMemo(() => getItineraryMapMarkers(items, places), [items, places]);
  const route = useMemo(() => getItineraryRoute(items, places), [items, places]);
  const cachedRoute = useMemo(
    () => getCachedRoutePoints(items, routeSegments, decodePolyline),
    [items, routeSegments]
  );
  const activeRoute = useMemo(
    () =>
      getItemRoutePoints(
        activeRouteItemId ?? hoveredItemId ?? selectedItemId,
        items,
        routeSegments,
        decodePolyline
      ),
    [activeRouteItemId, hoveredItemId, items, routeSegments, selectedItemId]
  );
  const routeRequest = useMemo(
    () => ({
      points: route,
      travelMode: "driving" as const,
      language: locale
    }),
    [locale, route]
  );
  const routeQuery = useQuery(mapRouteQueryOptions(routeRequest));
  const renderedRoute = useMemo(
    () => getRouteRenderPoints(routeQuery.data, cachedRoute.length > 0 ? cachedRoute : route),
    [cachedRoute, route, routeQuery.data]
  );
  const selectedMarkerId = selectedItemId ? `item:${selectedItemId}` : undefined;
  const hoveredMarkerId = hoveredItemId ? `item:${hoveredItemId}` : undefined;
  const routeSummaryByItem = useMemo(
    () => buildRouteSummaryByItem(items, routeSegments),
    [items, routeSegments]
  );
  const syncStateByItem = useMemo(
    () => buildItemSyncStateMap(syncDebug.queueEntries, tripId),
    [syncDebug.queueEntries, tripId]
  );
  const stats = useMemo(
    () =>
      buildPlannerStats({
        tripNoteCount: tripQuery.data?.noteCount ?? 0,
        items,
        places,
        routeSegments,
        expenses: expensesQuery.data
      }),
    [expensesQuery.data, items, places, routeSegments, tripQuery.data?.noteCount]
  );
  const insights = useMemo(
    () =>
      buildPlannerInsights({
        items,
        places,
        routeSegments,
        expenses: expensesQuery.data
      }),
    [expensesQuery.data, items, places, routeSegments]
  );
  const collaboratorPresence = useMemo(
    () => buildCollaboratorPresence(collaboratorsQuery.data),
    [collaboratorsQuery.data]
  );
  const syncSummary = useMemo(
    () => ({
      latestRevision: syncDebug.latestRevision,
      pendingCount: syncDebug.queuedMutationCount,
      conflictCount: syncDebug.queueEntries.filter((entry) => entry.state === "conflicted").length
    }),
    [syncDebug.latestRevision, syncDebug.queueEntries, syncDebug.queuedMutationCount]
  );

  useEffect(() => {
    setSelectedTripId(tripId);

    return () => setSelectedTripId(undefined);
  }, [setSelectedTripId, tripId]);

  useEffect(() => {
    if (!selectedItemId) {
      return;
    }

    const marker = markers.find((candidate) => candidate.itemId === selectedItemId);
    if (!marker) {
      return;
    }

    setViewport({
      latitude: marker.latitude,
      longitude: marker.longitude,
      zoom: Math.max(viewport.zoom, 13)
    });
  }, [markers, selectedItemId, setViewport, viewport.zoom]);

  useEffect(() => {
    const firstMarker = markers[0];
    if (!firstMarker || selectedItemId) {
      return;
    }

    setViewport({
      latitude: firstMarker.latitude,
      longitude: firstMarker.longitude,
      zoom: viewport.zoom
    });
  }, [markers, selectedItemId, setViewport, viewport.zoom]);

  const handleMarkerSelect = useCallback(
    (marker: MapMarker) => {
      selectItem(marker.itemId, marker.placeId);
      setViewport({
        latitude: marker.latitude,
        longitude: marker.longitude,
        zoom: Math.max(viewport.zoom, 14)
      });
    },
    [selectItem, setViewport, viewport.zoom]
  );

  const handleMarkerHover = useCallback(
    (marker?: MapMarker) => {
      setHoveredItemId(marker?.itemId);
    },
    [setHoveredItemId]
  );

  if (tripQuery.isLoading || itineraryQuery.isLoading) {
    return <TripEditorSkeleton />;
  }

  if (tripQuery.isError || itineraryQuery.isError || !tripQuery.data) {
    return (
      <ErrorState
        title={t("errorTitle")}
        description={t("errorDescription")}
        action={
          <Button type="button" variant="secondary" onClick={() => void tripQuery.refetch()}>
            <RefreshCw aria-hidden="true" />
            {t("retry")}
          </Button>
        }
      />
    );
  }

  const trip = tripQuery.data;
  const renderMapWorkspace = () => (
    <LazyTripMap
      markers={markers}
      route={renderedRoute}
      activeRoute={activeRoute}
      routeResult={routeQuery.data}
      viewport={viewport}
      selectedMarkerId={selectedMarkerId}
      hoveredMarkerId={hoveredMarkerId}
      onViewportChange={setViewport}
      onMarkerSelect={handleMarkerSelect}
      onMarkerHover={handleMarkerHover}
    />
  );

  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 px-3 sm:px-4 lg:px-6">
      <div className="mx-auto grid max-w-[104rem] gap-4 lg:grid-cols-[minmax(26rem,45rem)_minmax(28rem,1fr)] lg:items-start">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-3"
        >
          <TripEditorHeader
            trip={trip}
            stats={stats}
            collaborators={collaboratorPresence}
            syncSummary={syncSummary}
          />
          <PlannerInsights insights={insights} />
          <TripItineraryPanel
            tripId={trip.id}
            tripTimezone={trip.timezone}
            items={items}
            places={places}
            routeSummaryByItem={routeSummaryByItem}
            syncStateByItem={syncStateByItem}
            hasNextPage={itineraryQuery.hasNextPage}
            isFetchingNextPage={itineraryQuery.isFetchingNextPage}
            onLoadMore={() => void itineraryQuery.fetchNextPage()}
          />
          <NotePanel tripId={trip.id} targetEntityType="TRIP" targetEntityId={trip.id} />
        </motion.div>

        <aside className="hidden lg:sticky lg:top-20 lg:block">
          <div className="overflow-hidden rounded-md border bg-card shadow-sm">
            {renderMapWorkspace()}
          </div>
        </aside>
      </div>

      <PlaceSearchBox tripId={trip.id} items={items} />
      <PlannerFloatingActions tripId={trip.id} items={items} />

      {isMobileMapOpen ? (
        <div className="fixed inset-0 z-50 bg-background/50 backdrop-blur-sm lg:hidden">
          <section className="absolute inset-x-0 bottom-0 grid max-h-[82dvh] grid-rows-[auto_1fr] rounded-t-md border bg-card shadow-xl">
            <div className="flex h-12 items-center justify-between gap-3 border-b px-3">
              <h2 className="text-sm font-semibold">{t("map.label")}</h2>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={t("map.close")}
                onClick={() => setMobileMapOpen(false)}
              >
                <X aria-hidden="true" />
              </Button>
            </div>
            <div className="min-h-[22rem]">{renderMapWorkspace()}</div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

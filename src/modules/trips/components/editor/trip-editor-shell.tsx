"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo } from "react";
import { RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/error-state";
import { useSession } from "@/modules/auth/hooks/use-session";
import {
  usePresenceSource,
  useTripPresenceConnection,
  useTripPresenceEntries
} from "@/modules/collaboration/hooks/use-presence";
import {
  mapRouteQueryOptions,
  tripRouteSegmentsQueryOptions
} from "@/modules/map/queries/map-route.queries";
import { getRouteRenderPoints } from "@/modules/map/services/routing/route-normalizer";
import type { MapMarker } from "@/modules/map/types/map.types";
import { decodePolyline } from "@/modules/map/utils/polyline";
import { itineraryInfiniteQueryOptions } from "@/modules/itinerary/queries/itinerary.queries";
import { tripPlacesQueryOptions } from "@/modules/places/queries/place.queries";
import { useTripDeltaSync } from "@/modules/sync/hooks/use-trip-delta-sync";
import { useSyncDebug } from "@/modules/sync/hooks/use-sync-debug";
import { usePlannerStore } from "@/stores/use-planner-store";

import { tripDetailQueryOptions, tripExpensesQueryOptions } from "../../queries/trip.queries";
import {
  getAdjacentRouteSegmentIds,
  getCachedRoutePoints,
  getItineraryMapMarkers,
  getProviderRouteRequestPoints,
  getRouteSegmentAdjacentItemIds,
  getRouteSegmentPoints
} from "../../utils/trip-editor.utils";
import {
  buildItemSyncStateMap,
  buildPlannerStats,
  buildRouteSummaryByItem
} from "../../utils/planner-workspace.utils";
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
  const expensesQuery = useQuery(tripExpensesQueryOptions(tripId));
  const sessionQuery = useSession();
  const syncDebug = useSyncDebug(tripId);
  useTripDeltaSync(tripId);
  const viewport = usePlannerStore((state) => state.viewport);
  const selectedItemId = usePlannerStore((state) => state.selectedItemId);
  const hoveredItemId = usePlannerStore((state) => state.hoveredItemId);
  const selectedRouteSegmentId = usePlannerStore((state) => state.selectedRouteSegmentId);
  const hoveredRouteSegmentId = usePlannerStore((state) => state.hoveredRouteSegmentId);
  const setViewport = usePlannerStore((state) => state.setViewport);
  const selectItem = usePlannerStore((state) => state.selectItem);
  const setHoveredItemId = usePlannerStore((state) => state.setHoveredItemId);
  const setSelectedTripId = usePlannerStore((state) => state.setSelectedTripId);
  const currentUser = sessionQuery.data?.user;
  useTripPresenceConnection({ tripId, user: currentUser });
  usePresenceSource({
    tripId,
    entityType: "TRIP",
    entityId: tripId,
    state: "VIEWING",
    priority: 0,
    enabled: currentUser !== undefined
  });
  usePresenceSource({
    tripId,
    entityType: "ITINERARY_ITEM",
    entityId: selectedItemId ?? "__no_selected_stop__",
    state: "VIEWING",
    priority: 1,
    enabled: currentUser !== undefined && selectedItemId !== undefined
  });
  const presenceEntries = useTripPresenceEntries(tripId, currentUser?.id);

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
  const providerRouteRequestPoints = useMemo(
    () => getProviderRouteRequestPoints(markers),
    [markers]
  );
  const cachedRoute = useMemo(
    () => getCachedRoutePoints(items, routeSegments, decodePolyline),
    [items, routeSegments]
  );
  const focusedRouteSegmentId = hoveredRouteSegmentId ?? selectedRouteSegmentId;
  const focusedRouteItemIds = useMemo(
    () => getRouteSegmentAdjacentItemIds(focusedRouteSegmentId, items),
    [focusedRouteSegmentId, items]
  );
  const focusedMarkerIds = useMemo(
    () => focusedRouteItemIds.map((itemId) => `item:${itemId}`),
    [focusedRouteItemIds]
  );
  const activeRouteSegmentIds = useMemo(
    () =>
      focusedRouteSegmentId
        ? [focusedRouteSegmentId]
        : getAdjacentRouteSegmentIds(selectedItemId, items),
    [focusedRouteSegmentId, items, selectedItemId]
  );
  const activeRoute = useMemo(
    () => getRouteSegmentPoints(activeRouteSegmentIds, routeSegments, decodePolyline),
    [activeRouteSegmentIds, routeSegments]
  );
  const routeRequest = useMemo(
    () => ({
      points: providerRouteRequestPoints,
      travelMode: "driving" as const,
      language: locale
    }),
    [locale, providerRouteRequestPoints]
  );
  const routeQuery = useQuery(mapRouteQueryOptions(routeRequest));
  const renderedRoute = useMemo(
    () => getRouteRenderPoints(routeQuery.data, cachedRoute),
    [cachedRoute, routeQuery.data]
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
      focusedMarkerIds={focusedMarkerIds}
      onViewportChange={setViewport}
      onMarkerSelect={handleMarkerSelect}
      onMarkerHover={handleMarkerHover}
    />
  );

  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 px-3 sm:px-4 lg:px-6">
      <div className="mx-auto grid max-w-[112rem] gap-3 lg:grid-cols-[minmax(0,7fr)_minmax(20rem,3fr)] lg:items-start">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-2"
        >
          <TripEditorHeader trip={trip} stats={stats} presenceEntries={presenceEntries} />
          <TripItineraryPanel
            tripId={trip.id}
            tripTimezone={trip.timezone}
            items={items}
            places={places}
            currentUserId={currentUser?.id}
            routeSummaryByItem={routeSummaryByItem}
            focusedRouteItemIds={focusedRouteItemIds}
            syncStateByItem={syncStateByItem}
            hasNextPage={itineraryQuery.hasNextPage}
            isFetchingNextPage={itineraryQuery.isFetchingNextPage}
            onLoadMore={() => void itineraryQuery.fetchNextPage()}
          />
          <div className="lg:hidden">{renderMapWorkspace()}</div>
        </motion.div>

        <aside className="hidden lg:sticky lg:top-20 lg:block">{renderMapWorkspace()}</aside>
      </div>
    </div>
  );
}

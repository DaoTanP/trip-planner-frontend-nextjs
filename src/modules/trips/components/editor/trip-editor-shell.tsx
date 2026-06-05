"use client";

import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, Map as MapIcon, MapPinPlus, RefreshCw, X } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/error-state";
import { BudgetExpensePanel } from "@/modules/expenses/components/budget-expense-panel";
import { useSession } from "@/modules/auth/hooks/use-session";
import {
  usePresenceSource,
  useTripPresenceConnection,
  useTripPresenceEntries
} from "@/modules/collaboration/hooks/use-presence";
import { tripBudgetQueryOptions } from "@/modules/expenses/queries/expense.queries";
import { useCreateItineraryItemMutation } from "@/modules/itinerary/mutations/use-itinerary-mutations";
import { mapRouteQueryOptions } from "@/modules/map/queries/map-route.queries";
import { getRouteRenderPoints } from "@/modules/map/services/routing/route-normalizer";
import type { MapMarker } from "@/modules/map/types/map.types";
import { itineraryInfiniteQueryOptions } from "@/modules/itinerary/queries/itinerary.queries";
import { NotePanel } from "@/modules/notes/components/note-panel";
import { useResolvePlaceMutation } from "@/modules/places/mutations/use-place-mutations";
import { placeKeys, tripPlacesQueryOptions } from "@/modules/places/queries/place.queries";
import { reverseGeocodePlaces } from "@/modules/places/services/places.service";
import type { ReverseGeocodeResult } from "@/modules/places/types/place.types";
import { useTripDeltaSync } from "@/modules/sync/hooks/use-trip-delta-sync";
import { useSyncDebug } from "@/modules/sync/hooks/use-sync-debug";
import { usePlannerStore } from "@/stores/use-planner-store";

import { tripDetailQueryOptions } from "../../queries/trip.queries";
import {
  buildDerivedRouteLegs,
  getAdjacentRouteLegIds,
  getRouteLegAdjacentItemIds,
  getRouteLegPoints,
  getItineraryMapMarkers,
  getProviderRouteRequestPoints
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

type MapStopCandidate = {
  point: { latitude: number; longitude: number };
  place: ReverseGeocodeResult;
};

type EditorTab = "stops" | "budget" | "notes";

export function TripEditorShell({ tripId }: TripEditorShellProps) {
  const locale = useLocale();
  const t = useTranslations("trip.editor");
  const queryClient = useQueryClient();
  const tripQuery = useQuery(tripDetailQueryOptions(tripId));
  const itineraryQuery = useInfiniteQuery(itineraryInfiniteQueryOptions(tripId));
  const placesQuery = useQuery(tripPlacesQueryOptions(tripId));
  const budgetQuery = useQuery(tripBudgetQueryOptions(tripId));
  const createItem = useCreateItineraryItemMutation(tripId);
  const resolvePlace = useResolvePlaceMutation(tripId);
  const sessionQuery = useSession();
  const syncDebug = useSyncDebug(tripId);
  useTripDeltaSync(tripId);
  const viewport = usePlannerStore((state) => state.viewport);
  const selectedItemId = usePlannerStore((state) => state.selectedItemId);
  const hoveredItemId = usePlannerStore((state) => state.hoveredItemId);
  const selectedRouteLegId = usePlannerStore((state) => state.selectedRouteLegId);
  const hoveredRouteLegId = usePlannerStore((state) => state.hoveredRouteLegId);
  const setViewport = usePlannerStore((state) => state.setViewport);
  const selectItem = usePlannerStore((state) => state.selectItem);
  const selectRouteLeg = usePlannerStore((state) => state.selectRouteLeg);
  const setHoveredItemId = usePlannerStore((state) => state.setHoveredItemId);
  const setSelectedTripId = usePlannerStore((state) => state.setSelectedTripId);
  const [mapStopCandidate, setMapStopCandidate] = useState<MapStopCandidate | null>(null);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [isAddingMapStop, setIsAddingMapStop] = useState(false);
  const [activeTab, setActiveTab] = useState<EditorTab>("stops");
  const reverseGeocodeAbortRef = useRef<AbortController | null>(null);
  const reverseGeocodeRequestIdRef = useRef(0);
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
  const markers = useMemo(() => getItineraryMapMarkers(items, places), [items, places]);
  const providerRouteRequestPoints = useMemo(
    () => getProviderRouteRequestPoints(markers),
    [markers]
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
    () => getRouteRenderPoints(routeQuery.data, providerRouteRequestPoints),
    [providerRouteRequestPoints, routeQuery.data]
  );
  const routeLegs = useMemo(
    () => buildDerivedRouteLegs(items, places, routeQuery.data),
    [items, places, routeQuery.data]
  );
  const routeGapCount = useMemo(() => {
    if (placesQuery.isError) {
      return 0;
    }

    const placeById = new Map(places.map((place) => [place.id, place]));

    return items.filter((item) => {
      const place = placeById.get(item.placeId);

      if (!place) {
        return true;
      }

      return typeof place.latitude !== "number" || typeof place.longitude !== "number";
    }).length;
  }, [items, places, placesQuery.isError]);
  const focusedRouteLegId = hoveredRouteLegId ?? selectedRouteLegId;
  const focusedRouteItemIds = useMemo(
    () => getRouteLegAdjacentItemIds(focusedRouteLegId, routeLegs),
    [focusedRouteLegId, routeLegs]
  );
  const focusedMarkerIds = useMemo(
    () => focusedRouteItemIds.map((itemId) => `item:${itemId}`),
    [focusedRouteItemIds]
  );
  const activeRouteLegIds = useMemo(
    () =>
      focusedRouteLegId ? [focusedRouteLegId] : getAdjacentRouteLegIds(selectedItemId, routeLegs),
    [focusedRouteLegId, routeLegs, selectedItemId]
  );
  const activeRoute = useMemo(
    () => getRouteLegPoints(activeRouteLegIds, routeLegs, markers),
    [activeRouteLegIds, markers, routeLegs]
  );
  const selectedMarkerId = selectedItemId ? `item:${selectedItemId}` : undefined;
  const hoveredMarkerId = hoveredItemId ? `item:${hoveredItemId}` : undefined;
  const routeSummaryByItem = useMemo(() => buildRouteSummaryByItem(routeLegs), [routeLegs]);
  const syncStateByItem = useMemo(
    () => buildItemSyncStateMap(syncDebug.queueEntries, tripId),
    [syncDebug.queueEntries, tripId]
  );
  const stats = useMemo(
    () =>
      buildPlannerStats({
        tripNoteCount: tripQuery.data?.noteCount ?? 0,
        tripExpenseCount: tripQuery.data?.expenseCount,
        items,
        places,
        route: routeQuery.data,
        routeLegs,
        budgetSummary: budgetQuery.data
      }),
    [
      budgetQuery.data,
      items,
      places,
      routeLegs,
      routeQuery.data,
      tripQuery.data?.expenseCount,
      tripQuery.data?.noteCount
    ]
  );
  useEffect(() => {
    setSelectedTripId(tripId);

    return () => setSelectedTripId(undefined);
  }, [setSelectedTripId, tripId]);

  useEffect(() => {
    if (!selectedItemId || items.some((item) => item.id === selectedItemId)) {
      return;
    }

    selectItem(undefined, undefined);
  }, [items, selectItem, selectedItemId]);

  useEffect(() => {
    if (!selectedRouteLegId || routeLegs.some((routeLeg) => routeLeg.id === selectedRouteLegId)) {
      return;
    }

    selectRouteLeg(undefined);
  }, [routeLegs, selectRouteLeg, selectedRouteLegId]);

  useEffect(
    () => () => {
      reverseGeocodeAbortRef.current?.abort();
    },
    []
  );

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

  const handleMapClick = useCallback(
    async (point: { latitude: number; longitude: number }) => {
      const requestId = reverseGeocodeRequestIdRef.current + 1;
      const controller = new AbortController();

      reverseGeocodeRequestIdRef.current = requestId;
      reverseGeocodeAbortRef.current?.abort();
      reverseGeocodeAbortRef.current = controller;
      setMapStopCandidate(null);
      setIsReverseGeocoding(true);

      try {
        const place = await reverseGeocodePlaces({ point, language: locale }, controller.signal);
        if (requestId !== reverseGeocodeRequestIdRef.current || controller.signal.aborted) {
          return;
        }

        setMapStopCandidate({ point, place });
      } catch {
        if (controller.signal.aborted) {
          return;
        }

        toast.error(t("map.reverseGeocodeFailed"));
      } finally {
        if (requestId === reverseGeocodeRequestIdRef.current) {
          setIsReverseGeocoding(false);
          reverseGeocodeAbortRef.current = null;
        }
      }
    },
    [locale, t]
  );

  function handleDismissMapStopCandidate() {
    reverseGeocodeRequestIdRef.current += 1;
    reverseGeocodeAbortRef.current?.abort();
    reverseGeocodeAbortRef.current = null;
    setIsReverseGeocoding(false);
    setMapStopCandidate(null);
  }

  async function handleAddMapStop() {
    if (!mapStopCandidate || isAddingMapStop) {
      return;
    }

    const candidate = mapStopCandidate;
    setIsAddingMapStop(true);

    try {
      const place = await resolvePlace.mutateAsync(candidate.place);
      if (items.some((item) => item.placeId === place.id)) {
        toast.error(t("placeSearch.duplicateStop"));
        return;
      }

      const payload = {
        placeId: place.id,
        types: ["ACTIVITY"],
        clientMutationId: crypto.randomUUID()
      } satisfies Parameters<typeof createItem.mutateAsync>[0];
      const timezone = place.timezone ?? tripQuery.data?.timezone;

      const result = await createItem.mutateAsync(timezone ? { ...payload, timezone } : payload);
      selectItem(result.item.id, place.id);
      setMapStopCandidate(null);
      toast.success(t("map.stopAdded"));
    } catch {
      void queryClient.invalidateQueries({ queryKey: placeKeys.byTrip(tripId) });
      toast.error(t("map.addStopFailed"));
    } finally {
      setIsAddingMapStop(false);
    }
  }

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
  const handleJumpToMap = () => {
    document.getElementById("trip-editor-mobile-map")?.scrollIntoView({
      block: "start",
      behavior: "smooth"
    });
  };
  const renderMapWorkspace = (mapId?: string) => (
    <div id={mapId} className="relative scroll-mt-20">
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
        onMapClick={(point) => void handleMapClick(point)}
      />
      {routeQuery.isError && !isReverseGeocoding ? (
        <MapNotice>
          <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1">{t("map.routeError")}</span>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => void routeQuery.refetch()}
          >
            <RefreshCw aria-hidden="true" />
            {t("retry")}
          </Button>
        </MapNotice>
      ) : null}
      {routeGapCount > 0 && !routeQuery.isError && !isReverseGeocoding ? (
        <MapNotice>
          <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
          <span>{t("map.routeGapWarning", { count: routeGapCount })}</span>
        </MapNotice>
      ) : null}
      {isReverseGeocoding ? (
        <div className="absolute left-3 top-3 z-40 flex items-center gap-2 rounded-md bg-background/95 px-3 py-2 text-xs text-muted-foreground shadow-sm">
          <span>{t("map.reverseGeocoding")}</span>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-6"
            aria-label={t("map.cancelLookup")}
            onClick={handleDismissMapStopCandidate}
          >
            <X className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
      ) : null}
      {mapStopCandidate ? (
        <div className="absolute inset-x-3 bottom-3 z-40 rounded-md border bg-background/95 p-3 text-sm shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium">
                {mapStopCandidate.place.name ??
                  mapStopCandidate.place.formattedAddress ??
                  t("map.unknownPlace")}
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {mapStopCandidate.place.formattedAddress ??
                  t("map.coordinates", {
                    lat: mapStopCandidate.point.latitude.toFixed(5),
                    lng: mapStopCandidate.point.longitude.toFixed(5)
                  })}
              </p>
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8"
              aria-label={t("map.dismissCandidate")}
              onClick={handleDismissMapStopCandidate}
            >
              <X aria-hidden="true" />
            </Button>
          </div>
          <Button
            type="button"
            size="sm"
            className="mt-3"
            disabled={isAddingMapStop || createItem.isPending || resolvePlace.isPending}
            onClick={() => void handleAddMapStop()}
          >
            <MapPinPlus aria-hidden="true" />
            {t("map.addStop")}
          </Button>
        </div>
      ) : null}
    </div>
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
          {placesQuery.isError ? (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1">{t("placesError")}</span>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => void placesQuery.refetch()}
              >
                <RefreshCw aria-hidden="true" />
                {t("retry")}
              </Button>
            </div>
          ) : null}
          <div className="flex gap-1 rounded-md border bg-card p-1">
            {(["stops", "budget", "notes"] as const).map((tab) => (
              <Button
                key={tab}
                type="button"
                variant={activeTab === tab ? "secondary" : "ghost"}
                size="sm"
                aria-pressed={activeTab === tab}
                onClick={() => setActiveTab(tab)}
              >
                {t(`tabs.${tab}`)}
              </Button>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ml-auto lg:hidden"
              onClick={handleJumpToMap}
            >
              <MapIcon aria-hidden="true" />
              {t("map.jump")}
            </Button>
          </div>
          {activeTab === "stops" ? (
            <TripItineraryPanel
              tripId={trip.id}
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
          ) : null}
          {activeTab === "budget" ? (
            <BudgetExpensePanel tripId={trip.id} items={items} places={places} />
          ) : null}
          {activeTab === "notes" ? (
            <NotePanel
              tripId={trip.id}
              targetEntityType="TRIP"
              targetEntityId={trip.id}
              title={t("notes.tripTitle")}
            />
          ) : null}
          <div className="lg:hidden">{renderMapWorkspace("trip-editor-mobile-map")}</div>
        </motion.div>

        <aside className="hidden lg:sticky lg:top-20 lg:block">{renderMapWorkspace()}</aside>
      </div>
    </div>
  );
}

function MapNotice({ children }: { children: ReactNode }) {
  return (
    <div className="absolute left-3 right-3 top-3 z-40 flex items-center gap-2 rounded-md bg-background/95 px-3 py-2 text-xs text-muted-foreground shadow-sm">
      {children}
    </div>
  );
}

"use client";

import { useInfiniteQuery, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { mapConfig } from "@/modules/map/config/map.config";
import { MapProviderError } from "@/modules/map/providers/shared/map-provider-error";
import { mapRouteQueryOptions } from "@/modules/map/queries/map-route.queries";
import type {
  DerivedRouteLeg,
  MapMarker,
  MapRoute,
  MapRoutePoint,
  MapRouteRequest,
  MapTravelMode,
  MapViewport
} from "@/modules/map/types/map.types";
import { getRouteRenderPoints } from "@/modules/map/utils/map-route-render.utils";
import {
  itineraryInfiniteQueryOptions,
  itineraryRouteItemsQueryOptions
} from "@/modules/itinerary/queries/itinerary.queries";
import { NotePanel } from "@/modules/notes/components/note-panel";
import {
  upsertTripPlaceInCache,
  useResolvePlaceMutation
} from "@/modules/places/mutations/use-place-mutations";
import { placeKeys, tripPlacesQueryOptions } from "@/modules/places/queries/place.queries";
import { reverseGeocodePlaces } from "@/modules/places/services/places.service";
import type { ReverseGeocodeResult } from "@/modules/places/types/place.types";
import { useTripDeltaSync } from "@/modules/sync/hooks/use-trip-delta-sync";
import { useSyncDebug } from "@/modules/sync/hooks/use-sync-debug";
import { usePlannerStore } from "@/stores/use-planner-store";

import { tripDetailQueryOptions } from "../../queries/trip.queries";
import {
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
    loading: () => (
      <div className="h-[42dvh] min-h-72 max-h-[28rem] rounded-md border bg-muted md:h-[calc(100dvh-8rem)] md:max-h-none" />
    )
  }
);

interface TripEditorShellProps {
  tripId: string;
}

type MapStopCandidate = {
  tripId: string;
  point: { latitude: number; longitude: number };
  place: ReverseGeocodeResult;
};

type RouteLegRequest = {
  id: string;
  fromItemId: string;
  toItemId: string;
  fromPlaceId: string;
  toPlaceId: string;
  travelMode: MapTravelMode;
  fromPoint: MapRoutePoint;
  toPoint: MapRoutePoint;
};

type RouteGroupRequest = {
  id: string;
  travelMode: MapTravelMode;
  legs: RouteLegRequest[];
  request: MapRouteRequest;
};

type EditorTab = "stops" | "budget" | "notes";

const defaultMapViewport: MapViewport = {
  latitude: mapConfig.defaultViewport.latitude,
  longitude: mapConfig.defaultViewport.longitude,
  zoom: mapConfig.defaultViewport.zoom
};

export function TripEditorShell({ tripId }: TripEditorShellProps) {
  const locale = useLocale();
  const t = useTranslations("trip.editor");
  const queryClient = useQueryClient();
  const tripQuery = useQuery(tripDetailQueryOptions(tripId));
  const itineraryQuery = useInfiniteQuery(itineraryInfiniteQueryOptions(tripId));
  const routeItemsQuery = useQuery(itineraryRouteItemsQueryOptions(tripId));
  const placesQuery = useQuery(tripPlacesQueryOptions(tripId));
  const budgetQuery = useQuery(tripBudgetQueryOptions(tripId));
  const createItem = useCreateItineraryItemMutation(tripId);
  const resolvePlace = useResolvePlaceMutation();
  const sessionQuery = useSession();
  const syncDebug = useSyncDebug(tripId);
  useTripDeltaSync(tripId);
  const mapLayout = useMapLayout();
  const selectedItemId = usePlannerStore((state) => state.selectedItemId);
  const selectedPlaceId = usePlannerStore((state) => state.selectedPlaceId);
  const selectedItemFocusRequestId = usePlannerStore((state) => state.selectedItemFocusRequestId);
  const hoveredItemId = usePlannerStore((state) => state.hoveredItemId);
  const selectedRouteLegId = usePlannerStore((state) => state.selectedRouteLegId);
  const selectItem = usePlannerStore((state) => state.selectItem);
  const selectRouteLeg = usePlannerStore((state) => state.selectRouteLeg);
  const setHoveredItemId = usePlannerStore((state) => state.setHoveredItemId);
  const setSelectedTripId = usePlannerStore((state) => state.setSelectedTripId);
  const [mapStopCandidate, setMapStopCandidate] = useState<MapStopCandidate | null>(null);
  const [reverseGeocodingTripId, setReverseGeocodingTripId] = useState<string | undefined>();
  const [isAddingMapStop, setIsAddingMapStop] = useState(false);
  const [activeTab, setActiveTab] = useState<EditorTab>("stops");
  const [routeTravelModeByLegState, setRouteTravelModeByLegState] = useState<{
    tripId: string;
    travelModes: Record<string, MapTravelMode>;
  }>(() => ({
    tripId,
    travelModes: {}
  }));
  const routeTravelModeByLeg = useMemo(
    () =>
      routeTravelModeByLegState.tripId === tripId ? routeTravelModeByLegState.travelModes : {},
    [routeTravelModeByLegState, tripId]
  );
  const setRouteLegTravelMode = useCallback(
    (routeLegId: string, travelMode: MapTravelMode) => {
      setRouteTravelModeByLegState((current) => ({
        tripId,
        travelModes: {
          ...(current.tripId === tripId ? current.travelModes : {}),
          [routeLegId]: travelMode
        }
      }));
    },
    [tripId]
  );
  const [viewportState, setViewportState] = useState<{
    tripId: string;
    viewport: MapViewport;
  }>(() => ({
    tripId,
    viewport: defaultMapViewport
  }));
  const viewport = viewportState.tripId === tripId ? viewportState.viewport : defaultMapViewport;
  const setViewport = useCallback(
    (nextViewport: MapViewport) => {
      setViewportState({ tripId, viewport: nextViewport });
    },
    [tripId]
  );
  const reverseGeocodeAbortRef = useRef<AbortController | null>(null);
  const reverseGeocodeRequestIdRef = useRef(0);
  const addMapStopLockRef = useRef(false);
  const selectedFocusKeyRef = useRef<string | undefined>(undefined);
  const selectionContextKeyRef = useRef<string | undefined>(undefined);
  const skipNextSelectionDraftCancelRef = useRef(false);
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
  const fetchNextItineraryPage = itineraryQuery.fetchNextPage;
  const hasNextItineraryPage = itineraryQuery.hasNextPage;
  const isFetchingNextItineraryPage = itineraryQuery.isFetchingNextPage;
  const isLoadedItineraryComplete = itineraryQuery.hasNextPage === false;
  const completeRouteItems =
    routeItemsQuery.data ?? (isLoadedItineraryComplete ? items : undefined);
  const routeSourceItems = useMemo(() => completeRouteItems ?? [], [completeRouteItems]);
  const currentMapStopCandidate = mapStopCandidate?.tripId === tripId ? mapStopCandidate : null;
  const isReverseGeocoding = reverseGeocodingTripId === tripId;
  const isRouteDataIncomplete = completeRouteItems === undefined;
  const isRouteDataLoading =
    routeItemsQuery.isLoading || (isRouteDataIncomplete && routeItemsQuery.isFetching);
  const places = useMemo(() => placesQuery.data ?? [], [placesQuery.data]);
  const markers = useMemo(
    () => getItineraryMapMarkers(routeSourceItems, places),
    [places, routeSourceItems]
  );
  const providerRouteRequestPoints = useMemo(
    () => getProviderRouteRequestPoints(markers),
    [markers]
  );
  const routePointCount = providerRouteRequestPoints.length;
  const routeCanBeRequested = routePointCount >= 2;
  const routeLegRequests = useMemo(
    () => buildRouteLegRequests(markers, routeTravelModeByLeg),
    [markers, routeTravelModeByLeg]
  );
  const routeGroups = useMemo(() => buildRouteGroups(routeLegRequests), [routeLegRequests]);
  const routeGroupQueries = useQueries({
    queries: routeGroups.map((routeGroup) => mapRouteQueryOptions(routeGroup.request))
  });
  const routeError = routeGroupQueries.reduce<Error | undefined>((currentError, query) => {
    if (currentError) {
      return currentError;
    }

    return query.error instanceof Error ? query.error : undefined;
  }, undefined);
  const areRouteGroupsResolved =
    !isRouteDataIncomplete &&
    routeCanBeRequested &&
    routeGroups.length > 0 &&
    routeGroupQueries.length === routeGroups.length &&
    routeGroupQueries.every((query) => query.data !== undefined && query.error === null);
  const routeResult = useMemo(
    () =>
      areRouteGroupsResolved
        ? buildAggregateRouteResult(
            routeGroupQueries.map((query) => query.data),
            providerRouteRequestPoints
          )
        : undefined,
    [areRouteGroupsResolved, providerRouteRequestPoints, routeGroupQueries]
  );
  const routeLegs = useMemo(
    () =>
      buildRouteLegsFromRouteGroups(
        routeGroups,
        routeGroupQueries.map((query) => query.data)
      ),
    [routeGroups, routeGroupQueries]
  );
  const renderedRoute = useMemo(
    () =>
      areRouteGroupsResolved
        ? getRouteLegPoints(
            routeLegs.map((routeLeg) => routeLeg.id),
            routeLegs,
            markers
          )
        : [],
    [areRouteGroupsResolved, markers, routeLegs]
  );
  const routeGapCount = useMemo(() => {
    if (placesQuery.isError || isRouteDataIncomplete) {
      return 0;
    }

    const placeById = new Map(places.map((place) => [place.id, place]));

    return routeSourceItems.filter((item) => {
      const place = placeById.get(item.placeId);

      if (!place) {
        return true;
      }

      return typeof place.latitude !== "number" || typeof place.longitude !== "number";
    }).length;
  }, [isRouteDataIncomplete, places, placesQuery.isError, routeSourceItems]);
  const focusedRouteItemIds = useMemo(
    () => getRouteLegAdjacentItemIds(selectedRouteLegId, routeLegs),
    [routeLegs, selectedRouteLegId]
  );
  const focusedMarkerIds = useMemo(
    () => focusedRouteItemIds.map((itemId) => `item:${itemId}`),
    [focusedRouteItemIds]
  );
  const activeRouteLegIds = useMemo(
    () => (selectedRouteLegId ? [selectedRouteLegId] : []),
    [selectedRouteLegId]
  );
  const activeRoute = useMemo(
    () => (routeResult ? getRouteLegPoints(activeRouteLegIds, routeLegs, markers) : []),
    [activeRouteLegIds, markers, routeLegs, routeResult]
  );
  const selectedMarkerId = selectedItemId ? `item:${selectedItemId}` : undefined;
  const hoveredMarkerId = hoveredItemId ? `item:${hoveredItemId}` : undefined;
  const autoFitMarkerBoundsKey = useMemo(
    () =>
      selectedItemId || selectedRouteLegId
        ? undefined
        : buildAutoFitMarkerBoundsKey(tripId, markers),
    [markers, selectedItemId, selectedRouteLegId, tripId]
  );
  const routeSummaryByItem = useMemo(() => buildRouteSummaryByItem(routeLegs), [routeLegs]);
  const syncStateByItem = useMemo(
    () => buildItemSyncStateMap(syncDebug.queueEntries, tripId),
    [syncDebug.queueEntries, tripId]
  );
  const statsRouteLegs = useMemo(
    () => (areRouteGroupsResolved ? routeLegs : []),
    [areRouteGroupsResolved, routeLegs]
  );
  const stats = useMemo(
    () =>
      buildPlannerStats({
        tripNoteCount: tripQuery.data?.noteCount ?? 0,
        tripExpenseCount: tripQuery.data?.expenseCount,
        items: completeRouteItems ?? items,
        places,
        route: routeResult,
        routeLegs: statsRouteLegs,
        budgetSummary: budgetQuery.data
      }),
    [
      budgetQuery.data,
      completeRouteItems,
      items,
      places,
      routeResult,
      statsRouteLegs,
      tripQuery.data?.expenseCount,
      tripQuery.data?.noteCount
    ]
  );
  useEffect(() => {
    setSelectedTripId(tripId);

    return () => setSelectedTripId(undefined);
  }, [setSelectedTripId, tripId]);

  const abortReverseGeocode = useCallback(() => {
    reverseGeocodeRequestIdRef.current += 1;
    reverseGeocodeAbortRef.current?.abort();
    reverseGeocodeAbortRef.current = null;
  }, []);

  const cancelMapStopDraft = useCallback(() => {
    abortReverseGeocode();
    setReverseGeocodingTripId(undefined);
    setMapStopCandidate(null);
  }, [abortReverseGeocode]);

  useEffect(() => () => abortReverseGeocode(), [abortReverseGeocode]);

  useEffect(() => {
    const selectionContextKey = `${selectedItemId ?? ""}:${selectedRouteLegId ?? ""}`;

    if (
      selectionContextKeyRef.current !== undefined &&
      selectionContextKeyRef.current !== selectionContextKey
    ) {
      if (skipNextSelectionDraftCancelRef.current) {
        skipNextSelectionDraftCancelRef.current = false;
        selectionContextKeyRef.current = selectionContextKey;
        return;
      }

      cancelMapStopDraft();
    }

    selectionContextKeyRef.current = selectionContextKey;
  }, [cancelMapStopDraft, selectedItemId, selectedRouteLegId]);

  useEffect(() => {
    if (!selectedItemId) {
      return;
    }

    const selectedItem =
      items.find((item) => item.id === selectedItemId) ??
      routeSourceItems.find((item) => item.id === selectedItemId);

    if (!selectedItem) {
      selectItem(undefined, undefined);
      return;
    }

    if (selectedPlaceId !== selectedItem.placeId) {
      selectItem(selectedItem.id, selectedItem.placeId);
    }
  }, [items, routeSourceItems, selectItem, selectedItemId, selectedPlaceId]);

  useEffect(() => {
    if (
      !selectedItemId ||
      items.some((item) => item.id === selectedItemId) ||
      !hasNextItineraryPage ||
      isFetchingNextItineraryPage
    ) {
      return;
    }

    void fetchNextItineraryPage();
  }, [
    fetchNextItineraryPage,
    hasNextItineraryPage,
    isFetchingNextItineraryPage,
    items,
    selectedItemId
  ]);

  useEffect(() => {
    if (!hoveredItemId || items.some((item) => item.id === hoveredItemId)) {
      return;
    }

    setHoveredItemId(undefined);
  }, [hoveredItemId, items, setHoveredItemId]);

  useEffect(() => {
    if (!selectedRouteLegId || routeLegs.some((routeLeg) => routeLeg.id === selectedRouteLegId)) {
      return;
    }

    selectRouteLeg(undefined);
  }, [routeLegs, selectRouteLeg, selectedRouteLegId]);

  useEffect(() => {
    if (!selectedItemId) {
      selectedFocusKeyRef.current = undefined;
      return;
    }

    const marker = markers.find((candidate) => candidate.itemId === selectedItemId);
    if (!marker) {
      selectedFocusKeyRef.current = undefined;
      return;
    }

    const focusKey = `${selectedItemFocusRequestId}:${marker.id}:${marker.latitude}:${marker.longitude}`;
    if (selectedFocusKeyRef.current === focusKey) {
      return;
    }

    selectedFocusKeyRef.current = focusKey;
    setViewport({
      latitude: marker.latitude,
      longitude: marker.longitude,
      zoom: Math.max(viewport.zoom, 13)
    });
  }, [markers, selectedItemFocusRequestId, selectedItemId, setViewport, viewport.zoom]);

  const handleMarkerSelect = useCallback(
    (marker: MapMarker) => {
      cancelMapStopDraft();
      setActiveTab("stops");
      selectItem(marker.itemId, marker.placeId);
    },
    [cancelMapStopDraft, selectItem]
  );

  const handleMarkerHover = useCallback(
    (marker?: MapMarker) => {
      setHoveredItemId(marker?.itemId);
    },
    [setHoveredItemId]
  );

  const handleMapClick = useCallback(
    async (point: { latitude: number; longitude: number }) => {
      if (addMapStopLockRef.current) {
        return;
      }

      if (selectedItemId) {
        skipNextSelectionDraftCancelRef.current = true;
        selectItem(undefined, undefined);
      }

      const requestId = reverseGeocodeRequestIdRef.current + 1;
      const controller = new AbortController();

      reverseGeocodeRequestIdRef.current = requestId;
      reverseGeocodeAbortRef.current?.abort();
      reverseGeocodeAbortRef.current = controller;
      setMapStopCandidate(null);
      setReverseGeocodingTripId(tripId);

      try {
        const place = await reverseGeocodePlaces({ point, language: locale }, controller.signal);
        if (requestId !== reverseGeocodeRequestIdRef.current || controller.signal.aborted) {
          return;
        }

        setMapStopCandidate({ tripId, point, place });
      } catch {
        if (controller.signal.aborted) {
          return;
        }

        toast.error(t("map.reverseGeocodeFailed"));
      } finally {
        if (requestId === reverseGeocodeRequestIdRef.current) {
          setReverseGeocodingTripId(undefined);
          reverseGeocodeAbortRef.current = null;
        }
      }
    },
    [locale, selectItem, selectedItemId, t, tripId]
  );

  function handleDismissMapStopCandidate() {
    cancelMapStopDraft();
  }

  async function handleAddMapStop() {
    if (!currentMapStopCandidate || addMapStopLockRef.current) {
      return;
    }

    const candidate = currentMapStopCandidate;
    addMapStopLockRef.current = true;
    setIsAddingMapStop(true);

    try {
      const place = await resolvePlace.mutateAsync(candidate.place);
      const payload = {
        placeId: place.id,
        types: ["ACTIVITY"],
        clientMutationId: crypto.randomUUID()
      } satisfies Parameters<typeof createItem.mutateAsync>[0];
      const timezone = place.timezone ?? tripQuery.data?.timezone;

      const result = await createItem.mutateAsync(timezone ? { ...payload, timezone } : payload);
      upsertTripPlaceInCache(queryClient, tripId, place);
      setActiveTab("stops");
      selectItem(result.item.id, place.id);
      setMapStopCandidate(null);
      toast.success(t("map.stopAdded"));
    } catch {
      void queryClient.invalidateQueries({ queryKey: placeKeys.byTrip(tripId) });
      toast.error(t("map.addStopFailed"));
    } finally {
      addMapStopLockRef.current = false;
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
  const refetchRouteGroups = () => {
    routeGroupQueries.forEach((query) => void query.refetch());
  };
  const isRouteLoading =
    !isRouteDataIncomplete &&
    routeCanBeRequested &&
    routeGroupQueries.some((query) => query.isFetching) &&
    !routeResult &&
    !routeError;
  const renderMapWorkspace = (mapId?: string) => (
    <div id={mapId} className="relative scroll-mt-20">
      <LazyTripMap
        markers={markers}
        route={renderedRoute}
        activeRoute={activeRoute}
        routeResult={routeResult}
        viewport={viewport}
        selectedMarkerId={selectedMarkerId}
        hoveredMarkerId={hoveredMarkerId}
        focusedMarkerIds={focusedMarkerIds}
        autoFitMarkerBoundsKey={autoFitMarkerBoundsKey}
        onViewportChange={setViewport}
        onMarkerSelect={handleMarkerSelect}
        onMarkerHover={handleMarkerHover}
        onMapContextChange={cancelMapStopDraft}
        onMapClick={(point) => void handleMapClick(point)}
      />
      <MapNoticeStack>
        {placesQuery.isError ? (
          <MapNotice>
            <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1">{t("map.placesError")}</span>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => void placesQuery.refetch()}
            >
              <RefreshCw aria-hidden="true" />
              {t("retry")}
            </Button>
          </MapNotice>
        ) : null}
        {isRouteDataLoading ? (
          <MapNotice>
            <RefreshCw className="size-4 shrink-0 animate-spin" aria-hidden="true" />
            <span>{t("map.routeDataLoading")}</span>
          </MapNotice>
        ) : null}
        {!isRouteDataLoading && isRouteDataIncomplete ? (
          <MapNotice>
            <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              {routeItemsQuery.isError ? t("map.routeDataUnavailable") : t("map.routeIncomplete")}
            </span>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => void routeItemsQuery.refetch()}
            >
              <RefreshCw aria-hidden="true" />
              {t("retry")}
            </Button>
          </MapNotice>
        ) : null}
        {routeGapCount > 0 ? (
          <MapNotice>
            <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
            <span>{t("map.routeGapWarning", { count: routeGapCount })}</span>
          </MapNotice>
        ) : null}
        {routeError && routeCanBeRequested ? (
          <MapNotice>
            <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1">{getRouteErrorMessage(routeError, t)}</span>
            <Button type="button" size="sm" variant="secondary" onClick={refetchRouteGroups}>
              <RefreshCw aria-hidden="true" />
              {t("retry")}
            </Button>
          </MapNotice>
        ) : null}
        {isRouteLoading ? (
          <MapNotice>
            <RefreshCw className="size-4 shrink-0 animate-spin" aria-hidden="true" />
            <span>{t("map.routeLoading")}</span>
          </MapNotice>
        ) : null}
        {isReverseGeocoding ? (
          <MapNotice>
            <span className="min-w-0 flex-1">{t("map.reverseGeocoding")}</span>
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
          </MapNotice>
        ) : null}
      </MapNoticeStack>
      {currentMapStopCandidate ? (
        <div className="absolute inset-x-3 bottom-3 z-40 rounded-md border bg-background/95 p-3 text-sm shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium">
                {currentMapStopCandidate.place.name ??
                  currentMapStopCandidate.place.formattedAddress ??
                  t("map.unknownPlace")}
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {currentMapStopCandidate.place.formattedAddress ??
                  t("map.coordinates", {
                    lat: currentMapStopCandidate.point.latitude.toFixed(5),
                    lng: currentMapStopCandidate.point.longitude.toFixed(5)
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
      <div className="mx-auto grid max-w-[112rem] gap-3 lg:grid-cols-[minmax(0,5fr)_minmax(20rem,5fr)] lg:items-start">
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
                onClick={() => {
                  if (tab !== activeTab) {
                    cancelMapStopDraft();
                  }
                  setActiveTab(tab);
                }}
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
          {mapLayout === "mobile" ? (
            <div className="lg:hidden">{renderMapWorkspace("trip-editor-mobile-map")}</div>
          ) : null}
          {mapLayout === undefined ? (
            <div className="lg:hidden">
              <MapWorkspaceSkeleton />
            </div>
          ) : null}
          {activeTab === "stops" ? (
            <TripItineraryPanel
              tripId={trip.id}
              items={items}
              places={places}
              currentUserId={currentUser?.id}
              routeSummaryByItem={routeSummaryByItem}
              onRouteTravelModeChange={setRouteLegTravelMode}
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
        </motion.div>

        {mapLayout === "desktop" ? (
          <aside className="hidden lg:sticky lg:top-20 lg:block">{renderMapWorkspace()}</aside>
        ) : null}
        {mapLayout === undefined ? (
          <aside className="hidden lg:sticky lg:top-20 lg:block">
            <MapWorkspaceSkeleton />
          </aside>
        ) : null}
      </div>
    </div>
  );
}

function buildRouteLegRequests(
  markers: MapMarker[],
  travelModeByLeg: Record<string, MapTravelMode>
): RouteLegRequest[] {
  return markers.slice(1).flatMap((marker, index) => {
    const previousMarker = markers[index];

    if (!previousMarker?.itemId || !previousMarker.placeId || !marker.itemId || !marker.placeId) {
      return [];
    }

    const id = `leg:${previousMarker.itemId}:${marker.itemId}`;
    const travelMode = travelModeByLeg[id] ?? "driving";

    return [
      {
        id,
        fromItemId: previousMarker.itemId,
        toItemId: marker.itemId,
        fromPlaceId: previousMarker.placeId,
        toPlaceId: marker.placeId,
        travelMode,
        fromPoint: {
          latitude: previousMarker.latitude,
          longitude: previousMarker.longitude
        },
        toPoint: {
          latitude: marker.latitude,
          longitude: marker.longitude
        }
      }
    ];
  });
}

function buildRouteGroups(routeLegRequests: RouteLegRequest[]): RouteGroupRequest[] {
  const groups: RouteGroupRequest[] = [];

  routeLegRequests.forEach((routeLeg) => {
    const previousGroup = groups.at(-1);

    if (previousGroup?.travelMode === routeLeg.travelMode) {
      previousGroup.legs.push(routeLeg);
      previousGroup.request.points.push(routeLeg.toPoint);
      previousGroup.id = buildRouteGroupId(previousGroup);
      return;
    }

    const group: RouteGroupRequest = {
      id: `group:${routeLeg.id}:${routeLeg.travelMode}`,
      travelMode: routeLeg.travelMode,
      legs: [routeLeg],
      request: {
        points: [routeLeg.fromPoint, routeLeg.toPoint],
        travelMode: routeLeg.travelMode
      }
    };

    groups.push(group);
  });

  return groups;
}

function buildRouteGroupId(group: RouteGroupRequest) {
  const firstLeg = group.legs[0];
  const lastLeg = group.legs.at(-1);

  return `group:${firstLeg?.id ?? "empty"}:${lastLeg?.id ?? "empty"}:${group.travelMode}`;
}

function buildRouteLegsFromRouteGroups(
  routeGroups: RouteGroupRequest[],
  routes: Array<MapRoute | undefined>
): DerivedRouteLeg[] {
  return routeGroups.flatMap((routeGroup, groupIndex) => {
    const route = routes[groupIndex];

    return routeGroup.legs.map((routeLeg, legIndex) => {
      const providerLeg = route?.legs[legIndex];

      return {
        id: routeLeg.id,
        fromItemId: routeLeg.fromItemId,
        toItemId: routeLeg.toItemId,
        fromPlaceId: routeLeg.fromPlaceId,
        toPlaceId: routeLeg.toPlaceId,
        travelMode: routeLeg.travelMode,
        ...(providerLeg?.distanceMeters !== undefined
          ? { distanceMeters: providerLeg.distanceMeters ?? undefined }
          : {}),
        ...(providerLeg?.durationSeconds !== undefined
          ? { durationSeconds: providerLeg.durationSeconds ?? undefined }
          : {}),
        ...(providerLeg?.points?.length
          ? {
              geometry: {
                type: "LineString" as const,
                coordinates: providerLeg.points.map(
                  (point) => [point.longitude, point.latitude] as [number, number]
                )
              }
            }
          : {})
      };
    });
  });
}

function buildAggregateRouteResult(
  routes: Array<MapRoute | undefined>,
  fallbackPoints: MapRoutePoint[]
): MapRoute | undefined {
  const resolvedRoutes = routes.filter((route): route is MapRoute => route !== undefined);
  const provider = resolvedRoutes[0]?.provider;

  if (!provider || resolvedRoutes.length !== routes.length || resolvedRoutes.length === 0) {
    return undefined;
  }

  const points = resolvedRoutes.flatMap((route, index) => {
    const routePoints = getRouteRenderPoints(route);

    return index === 0 ? routePoints : routePoints.slice(1);
  });

  return {
    provider,
    points: points.length >= 2 ? points : fallbackPoints,
    distanceMeters: sumNullableRouteValues(resolvedRoutes.map((route) => route.distanceMeters)),
    durationSeconds: sumNullableRouteValues(resolvedRoutes.map((route) => route.durationSeconds)),
    legs: resolvedRoutes.flatMap((route) => route.legs)
  };
}

function sumNullableRouteValues(values: Array<number | null>) {
  const numericValues = values.filter((value): value is number => typeof value === "number");

  if (numericValues.length !== values.length) {
    return null;
  }

  return numericValues.reduce((total, value) => total + value, 0);
}

function getRouteErrorMessage(error: Error, t: ReturnType<typeof useTranslations>) {
  if (
    error instanceof MapProviderError &&
    (error.code === "MAP_PROVIDER_NOT_CONFIGURED" || error.code === "MAP_PROVIDER_UNSUPPORTED")
  ) {
    return t("map.routeUnavailable");
  }

  if (error instanceof MapProviderError && error.code === "MAP_PROVIDER_MISCONFIGURED") {
    return t("map.routeMisconfigured");
  }

  if (error instanceof MapProviderError && error.code === "MAP_PROVIDER_OFFLINE") {
    return t("map.routeOffline");
  }

  if (error instanceof MapProviderError && error.code === "MAP_PROVIDER_TIMEOUT") {
    return t("map.routeTimeout");
  }

  if (error instanceof MapProviderError && error.code === "MAP_PROVIDER_TOO_MANY_WAYPOINTS") {
    return t("map.routeTooManyStops");
  }

  if (error instanceof MapProviderError && error.code === "MAP_PROVIDER_UNSUPPORTED_TRAVEL_MODE") {
    return t("map.routeUnsupportedTravelMode");
  }

  if (error instanceof MapProviderError && error.code === "MAP_PROVIDER_ZERO_RESULTS") {
    return t("map.routeNoResults");
  }

  return t("map.routeError");
}

function MapNoticeStack({ children }: { children: ReactNode }) {
  return (
    <div className="absolute left-3 right-3 top-3 z-40 grid gap-2 empty:hidden">{children}</div>
  );
}

function MapNotice({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-background/95 px-3 py-2 text-xs text-muted-foreground shadow-sm">
      {children}
    </div>
  );
}

function MapWorkspaceSkeleton() {
  return (
    <div className="h-[42dvh] min-h-72 max-h-[28rem] rounded-md border bg-muted md:h-[calc(100dvh-8rem)] md:max-h-none" />
  );
}

function useMapLayout() {
  const [layout, setLayout] = useState<"mobile" | "desktop" | undefined>(undefined);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const updateLayout = () => setLayout(mediaQuery.matches ? "desktop" : "mobile");

    updateLayout();
    mediaQuery.addEventListener("change", updateLayout);

    return () => mediaQuery.removeEventListener("change", updateLayout);
  }, []);

  return layout;
}

function buildAutoFitMarkerBoundsKey(tripId: string, markers: MapMarker[]) {
  if (markers.length === 0) {
    return undefined;
  }

  const markerCoordinateKey = markers
    .map((marker) => `${marker.id}:${marker.latitude.toFixed(6)}:${marker.longitude.toFixed(6)}`)
    .sort()
    .join("|");

  return `${tripId}:${markerCoordinateKey}`;
}

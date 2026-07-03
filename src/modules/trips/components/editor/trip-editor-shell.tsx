"use client";

import { useInfiniteQuery, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode
} from "react";
import {
  AlertTriangle,
  GripVertical,
  Map as MapIcon,
  MapPinPlus,
  PanelRightClose,
  PanelRightOpen,
  RefreshCw,
  Route,
  X
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/error-state";
import { cn } from "@/lib/utils";
import { BudgetExpensePanel } from "@/modules/expenses/components/budget-expense-panel";
import { useSession } from "@/modules/auth/hooks/use-session";
import {
  useMarkerPresenceEntries,
  usePresenceSource,
  useTripPresenceConnection,
  useTripPresenceEntries
} from "@/modules/collaboration/hooks/use-presence";
import { ConflictDialog } from "@/modules/collaboration/components/conflict-dialog";
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
import { getViewportForPoints } from "@/modules/map/utils/bounds";
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
import { semanticColorClassNames } from "@/theme";

import { useUpsertTripRoutePreferenceMutation } from "../../mutations/use-route-preference-mutations";
import {
  tripDetailQueryOptions,
  tripRoutePreferencesQueryOptions
} from "../../queries/trip.queries";
import type { TripRoutePreference } from "../../types/trip.types";
import {
  getRouteLegAdjacentItemIds,
  getRouteLegPoints,
  getItineraryMapMarkers,
  getProviderRouteRequestPoints
} from "../../utils/trip-editor.utils";
import { getDefaultItineraryItemTimezone } from "../../utils/timezone.utils";
import {
  buildItemSyncStateMap,
  buildPlannerStats,
  buildRouteSummaryByItem,
  getScheduleOverlapIssue
} from "../../utils/planner-workspace.utils";
import { TripEditorHeader } from "./trip-editor-header";
import { TripEditorSkeleton } from "./trip-editor-skeleton";
import { PlanningPanel } from "./planning-panel";
import { TripItineraryPanel } from "./trip-itinerary-panel";

const LazyTripMap = dynamic(
  () => import("@/modules/map/components/trip-map").then((mod) => mod.TripMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[42dvh] min-h-72 max-h-[28rem] rounded-md border bg-muted md:h-dvh md:max-h-none md:rounded-none md:border-0" />
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
  insertAfterItemId?: string | undefined;
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
  request: MapRouteRequest;
};

type EditorTab = "stops" | "map" | "budget" | "notes" | "planning" | "files";

const defaultMapViewport: MapViewport = {
  latitude: mapConfig.defaultViewport.latitude,
  longitude: mapConfig.defaultViewport.longitude,
  zoom: mapConfig.defaultViewport.zoom
};
const defaultMapPaneWidthPercent = 34;
const minMapPaneWidthPercent = 30;
const maxMapPaneWidthPercent = 42;
const stickyWorkspaceTopClassName = "lg:top-0";

export function TripEditorShell({ tripId }: TripEditorShellProps) {
  const locale = useLocale();
  const t = useTranslations("trip.editor");
  const queryClient = useQueryClient();
  const tripQuery = useQuery(tripDetailQueryOptions(tripId));
  const itineraryQuery = useInfiniteQuery(itineraryInfiniteQueryOptions(tripId));
  const routeItemsQuery = useQuery(itineraryRouteItemsQueryOptions(tripId));
  const routePreferencesQuery = useQuery(tripRoutePreferencesQueryOptions(tripId));
  const placesQuery = useQuery(tripPlacesQueryOptions(tripId));
  const budgetQuery = useQuery(tripBudgetQueryOptions(tripId));
  const createItem = useCreateItineraryItemMutation(tripId);
  const upsertRoutePreference = useUpsertTripRoutePreferenceMutation(tripId);
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
  const followedPresenceUserId = usePlannerStore((state) => state.followedPresenceUserId);
  const selectItem = usePlannerStore((state) => state.selectItem);
  const selectRouteLeg = usePlannerStore((state) => state.selectRouteLeg);
  const setHoveredItemId = usePlannerStore((state) => state.setHoveredItemId);
  const setSelectedTripId = usePlannerStore((state) => state.setSelectedTripId);
  const followPresenceUser = usePlannerStore((state) => state.followPresenceUser);
  const [mapStopCandidate, setMapStopCandidate] = useState<MapStopCandidate | null>(null);
  const [reverseGeocodingTripId, setReverseGeocodingTripId] = useState<string | undefined>();
  const [isAddingMapStop, setIsAddingMapStop] = useState(false);
  const [activeTab, setActiveTab] = useState<EditorTab>("stops");
  const [mapPaneWidthPercent, setMapPaneWidthPercent] = useState(defaultMapPaneWidthPercent);
  const [isMapPaneCollapsed, setIsMapPaneCollapsed] = useState(false);
  const [expandedRouteLegState, setExpandedRouteLegState] = useState<{
    tripId: string;
    routeLegId?: string | undefined;
  }>(() => ({
    tripId
  }));
  const [popoverRouteLegState, setPopoverRouteLegState] = useState<{
    tripId: string;
    routeLegId?: string | undefined;
  }>(() => ({
    tripId
  }));
  const routeTravelModeByLeg = useMemo(
    () => buildRouteTravelModeByLeg(routePreferencesQuery.data ?? []),
    [routePreferencesQuery.data]
  );
  const setRouteLegTravelMode = useCallback(
    (routeLegId: string, travelMode: MapTravelMode) => {
      const routeLegItemIds = getRouteLegPreferenceItemIds(routeLegId);

      if (!routeLegItemIds || (routeTravelModeByLeg[routeLegId] ?? "driving") === travelMode) {
        return;
      }

      upsertRoutePreference.mutate({
        fromItemId: routeLegItemIds.fromItemId,
        toItemId: routeLegItemIds.toItemId,
        payload: { travelMode }
      });
    },
    [routeTravelModeByLeg, upsertRoutePreference]
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
  const splitPaneRef = useRef<HTMLDivElement>(null);
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
  usePresenceSource({
    tripId,
    entityType: "ITINERARY_ITEM",
    entityId: hoveredItemId ?? "__no_hovered_stop__",
    state: "VIEWING",
    priority: 2,
    enabled: currentUser !== undefined && hoveredItemId !== undefined
  });
  const presenceEntries = useTripPresenceEntries(tripId, currentUser?.id);
  const followedPresenceEntry = useMemo(
    () =>
      followedPresenceUserId
        ? presenceEntries.find((entry) => entry.userId === followedPresenceUserId)
        : undefined,
    [followedPresenceUserId, presenceEntries]
  );

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
  const markerIdsByItemId = useMemo(
    () =>
      new Map(
        markers
          .filter((marker) => marker.itemId)
          .map((marker) => [marker.itemId as string, marker.id])
      ),
    [markers]
  );
  const markerPresenceEntriesByMarkerId = useMarkerPresenceEntries({
    tripId,
    markerIdsByItemId,
    excludeUserId: currentUser?.id
  });
  const markerPresence = useMemo(
    () =>
      Array.from(markerPresenceEntriesByMarkerId.entries()).map(([markerId, entries]) => ({
        markerId,
        entries
      })),
    [markerPresenceEntriesByMarkerId]
  );
  const remoteFocusedMarkerIds = useMemo(
    () => Array.from(markerPresenceEntriesByMarkerId.keys()),
    [markerPresenceEntriesByMarkerId]
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
  const routeLegQueries = useQueries({
    queries: routeLegRequests.map((routeLeg) => mapRouteQueryOptions(routeLeg.request))
  });
  const routeError = routeLegQueries.reduce<Error | undefined>((currentError, query) => {
    if (currentError) {
      return currentError;
    }

    return query.error instanceof Error ? query.error : undefined;
  }, undefined);
  const areRouteLegRoutesResolved =
    !isRouteDataIncomplete &&
    routeCanBeRequested &&
    routeLegRequests.length > 0 &&
    routeLegQueries.length === routeLegRequests.length &&
    routeLegQueries.every((query) => query.data !== undefined && query.error === null);
  const routeResult = useMemo(
    () =>
      areRouteLegRoutesResolved
        ? buildAggregateRouteResult(
            routeLegQueries.map((query) => query.data),
            providerRouteRequestPoints
          )
        : undefined,
    [areRouteLegRoutesResolved, providerRouteRequestPoints, routeLegQueries]
  );
  const routeLegs = useMemo(
    () =>
      buildRouteLegsFromRouteRequests(
        routeLegRequests,
        routeLegQueries.map((query) => query.data)
      ),
    [routeLegQueries, routeLegRequests]
  );
  const expandedRouteLegId =
    expandedRouteLegState.tripId === tripId &&
    expandedRouteLegState.routeLegId &&
    routeLegs.some((routeLeg) => routeLeg.id === expandedRouteLegState.routeLegId)
      ? expandedRouteLegState.routeLegId
      : undefined;
  const popoverRouteLegId =
    popoverRouteLegState.tripId === tripId &&
    popoverRouteLegState.routeLegId &&
    routeLegs.some((routeLeg) => routeLeg.id === popoverRouteLegState.routeLegId)
      ? popoverRouteLegState.routeLegId
      : undefined;
  const mapFocusedRouteLegId = popoverRouteLegId ?? expandedRouteLegId;
  usePresenceSource({
    tripId,
    entityType: "MAP",
    entityId: mapFocusedRouteLegId ? `route:${mapFocusedRouteLegId}` : "__no_active_route__",
    state: "VIEWING",
    priority: 2,
    enabled: currentUser !== undefined && mapFocusedRouteLegId !== undefined
  });
  const renderedRoute = useMemo(
    () =>
      areRouteLegRoutesResolved
        ? getRouteLegPoints(
            routeLegs.map((routeLeg) => routeLeg.id),
            routeLegs,
            markers
          )
        : [],
    [areRouteLegRoutesResolved, markers, routeLegs]
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
    () => getRouteLegAdjacentItemIds(mapFocusedRouteLegId, routeLegs),
    [mapFocusedRouteLegId, routeLegs]
  );
  const focusedMarkerIds = useMemo(
    () => [
      ...new Set([
        ...focusedRouteItemIds.map((itemId) => `item:${itemId}`),
        ...remoteFocusedMarkerIds
      ])
    ],
    [focusedRouteItemIds, remoteFocusedMarkerIds]
  );
  const activeRouteLegIds = useMemo(
    () => (mapFocusedRouteLegId ? [mapFocusedRouteLegId] : []),
    [mapFocusedRouteLegId]
  );
  const activeRoute = useMemo(
    () => (routeResult ? getRouteLegPoints(activeRouteLegIds, routeLegs, markers) : []),
    [activeRouteLegIds, markers, routeLegs, routeResult]
  );
  const selectedMarkerId = selectedItemId ? `item:${selectedItemId}` : undefined;
  const hoveredMarkerId = hoveredItemId ? `item:${hoveredItemId}` : undefined;
  const autoFitMarkerBoundsKey = useMemo(
    () =>
      selectedItemId || mapFocusedRouteLegId
        ? undefined
        : buildAutoFitMarkerBoundsKey(tripId, markers),
    [mapFocusedRouteLegId, markers, selectedItemId, tripId]
  );
  const routeSummaryByItem = useMemo(() => buildRouteSummaryByItem(routeLegs), [routeLegs]);
  const syncStateByItem = useMemo(
    () => buildItemSyncStateMap(syncDebug.queueEntries, tripId),
    [syncDebug.queueEntries, tripId]
  );
  const statsRouteLegs = useMemo(
    () => (areRouteLegRoutesResolved ? routeLegs : []),
    [areRouteLegRoutesResolved, routeLegs]
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
  const firstTimingIssue = useMemo(
    () => getScheduleOverlapIssue(completeRouteItems ?? items),
    [completeRouteItems, items]
  );
  const visibleActiveTab = mapLayout === "desktop" && activeTab === "map" ? "stops" : activeTab;
  const isMobileMapOpen = visibleActiveTab === "map" && mapLayout === "mobile";
  usePresenceSource({
    tripId,
    entityType: "MAP",
    entityId: tripId,
    state: "VIEWING",
    priority: 1,
    enabled: currentUser !== undefined && isMobileMapOpen
  });
  usePresenceSource({
    tripId,
    entityType: "BUDGET",
    entityId: tripId,
    state: "VIEWING",
    priority: 1,
    enabled: currentUser !== undefined && visibleActiveTab === "budget"
  });

  useEffect(() => {
    if (!followedPresenceUserId) {
      return;
    }

    let followUpdateTimer: number | undefined;
    const scheduleFollowUpdate = (update: () => void) => {
      followUpdateTimer = window.setTimeout(update, 0);
    };

    if (!followedPresenceEntry) {
      followPresenceUser(undefined);
      return;
    }

    if (followedPresenceEntry.entityType === "ITINERARY_ITEM") {
      const followedItem =
        items.find((item) => item.id === followedPresenceEntry.entityId) ??
        routeSourceItems.find((item) => item.id === followedPresenceEntry.entityId);

      if (followedItem && selectedItemId !== followedItem.id) {
        scheduleFollowUpdate(() => {
          setActiveTab("stops");
          selectItem(followedItem.id, followedItem.placeId);
        });
      }

      return () => {
        if (followUpdateTimer !== undefined) {
          window.clearTimeout(followUpdateTimer);
        }
      };
    }

    if (
      followedPresenceEntry.entityType === "BUDGET" ||
      followedPresenceEntry.entityType === "EXPENSE"
    ) {
      scheduleFollowUpdate(() => setActiveTab("budget"));

      return () => {
        if (followUpdateTimer !== undefined) {
          window.clearTimeout(followUpdateTimer);
        }
      };
    }

    if (followedPresenceEntry.entityType === "NOTE") {
      scheduleFollowUpdate(() => setActiveTab("notes"));

      return () => {
        if (followUpdateTimer !== undefined) {
          window.clearTimeout(followUpdateTimer);
        }
      };
    }

    if (followedPresenceEntry.entityType === "MAP") {
      if (mapLayout === "mobile") {
        scheduleFollowUpdate(() => setActiveTab("map"));
      }

      if (!followedPresenceEntry.entityId.startsWith("route:")) {
        return () => {
          if (followUpdateTimer !== undefined) {
            window.clearTimeout(followUpdateTimer);
          }
        };
      }

      const routeLegId = followedPresenceEntry.entityId.slice("route:".length);

      if (!routeLegs.some((routeLeg) => routeLeg.id === routeLegId)) {
        return () => {
          if (followUpdateTimer !== undefined) {
            window.clearTimeout(followUpdateTimer);
          }
        };
      }

      if (selectedRouteLegId !== routeLegId) {
        scheduleFollowUpdate(() => {
          selectRouteLeg(routeLegId);

          const routePoints = getRouteLegPoints([routeLegId], routeLegs, markers);
          const nextViewport = getViewportForPoints(routePoints);

          if (nextViewport) {
            setViewport(nextViewport);
          }
        });
      }

      return () => {
        if (followUpdateTimer !== undefined) {
          window.clearTimeout(followUpdateTimer);
        }
      };
    }

    if (followedPresenceEntry.entityType === "TRIP") {
      scheduleFollowUpdate(() => setActiveTab("stops"));
    }

    return () => {
      if (followUpdateTimer !== undefined) {
        window.clearTimeout(followUpdateTimer);
      }
    };
  }, [
    followedPresenceEntry,
    followedPresenceUserId,
    followPresenceUser,
    items,
    mapLayout,
    markers,
    routeLegs,
    routeSourceItems,
    selectItem,
    selectRouteLeg,
    selectedItemId,
    selectedRouteLegId,
    setViewport
  ]);

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
    const selectionContextKey = selectedItemId ?? "";

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
  }, [cancelMapStopDraft, selectedItemId]);

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

  const handleIssueSummaryClick = useCallback(() => {
    if (!firstTimingIssue) {
      return;
    }

    cancelMapStopDraft();
    setActiveTab("stops");
    selectItem(firstTimingIssue.secondItem.id, firstTimingIssue.secondItem.placeId);
  }, [cancelMapStopDraft, firstTimingIssue, selectItem]);

  const handleMapPaneResizePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const container = splitPaneRef.current;

      if (!container) {
        return;
      }

      const rect = container.getBoundingClientRect();

      event.preventDefault();

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const nextMapWidthPercent = ((rect.right - moveEvent.clientX) / rect.width) * 100;

        setMapPaneWidthPercent(
          clampNumber(nextMapWidthPercent, minMapPaneWidthPercent, maxMapPaneWidthPercent)
        );
      };

      const handlePointerUp = () => {
        document.removeEventListener("pointermove", handlePointerMove);
        document.removeEventListener("pointerup", handlePointerUp);
      };

      document.addEventListener("pointermove", handlePointerMove);
      document.addEventListener("pointerup", handlePointerUp, { once: true });
    },
    []
  );

  const handleRouteSectionOpenChange = useCallback(
    (routeLegId: string, isOpen: boolean) => {
      setExpandedRouteLegState((current) => {
        const currentRouteLegId = current.tripId === tripId ? current.routeLegId : undefined;

        if (isOpen) {
          return { tripId, routeLegId };
        }

        return {
          tripId,
          routeLegId: currentRouteLegId === routeLegId ? undefined : currentRouteLegId
        };
      });

      if (!isOpen) {
        return;
      }

      const routePoints = getRouteLegPoints([routeLegId], routeLegs, markers);
      const nextViewport = getViewportForPoints(routePoints);

      if (nextViewport) {
        setViewport(nextViewport);
      }
    },
    [markers, routeLegs, setViewport, tripId]
  );

  const handleRoutePopoverOpenChange = useCallback(
    (routeLegId: string, isOpen: boolean) => {
      setPopoverRouteLegState((current) => {
        const currentRouteLegId = current.tripId === tripId ? current.routeLegId : undefined;

        if (isOpen) {
          return { tripId, routeLegId };
        }

        return {
          tripId,
          routeLegId: currentRouteLegId === routeLegId ? undefined : currentRouteLegId
        };
      });

      if (!isOpen) {
        return;
      }

      const routePoints = getRouteLegPoints([routeLegId], routeLegs, markers);
      const nextViewport = getViewportForPoints(routePoints);

      if (nextViewport) {
        setViewport(nextViewport);
      }
    },
    [markers, routeLegs, setViewport, tripId]
  );

  const handleMapClick = useCallback(
    async (point: { latitude: number; longitude: number }) => {
      if (addMapStopLockRef.current) {
        return;
      }

      const insertAfterItemId =
        selectedItemId &&
        (items.some((item) => item.id === selectedItemId) ||
          routeSourceItems.some((item) => item.id === selectedItemId))
          ? selectedItemId
          : undefined;

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

        setMapStopCandidate({ tripId, point, place, insertAfterItemId });
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
    [items, locale, routeSourceItems, selectItem, selectedItemId, t, tripId]
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
        timezone: getDefaultItineraryItemTimezone(tripQuery.data?.timezone),
        clientMutationId: crypto.randomUUID()
      } satisfies Parameters<typeof createItem.mutateAsync>[0];
      const fallbackAfterItemId =
        routeSourceItems[routeSourceItems.length - 1]?.id ?? items[items.length - 1]?.id;
      const afterItemId = candidate.insertAfterItemId ?? fallbackAfterItemId;

      const result = await createItem.mutateAsync({
        ...payload,
        ...(afterItemId ? { afterItemId } : {})
      });
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

  function handleOpenMobileMap() {
    cancelMapStopDraft();
    setActiveTab("map");
  }

  function handleCloseMobileMap() {
    cancelMapStopDraft();
    setActiveTab("stops");
  }

  useEffect(() => {
    if (!isMobileMapOpen) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      cancelMapStopDraft();
      setActiveTab("stops");
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [cancelMapStopDraft, isMobileMapOpen]);

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
  const refetchRouteLegs = () => {
    routeLegQueries.forEach((query) => void query.refetch());
  };
  const isRouteLoading =
    !isRouteDataIncomplete &&
    routeCanBeRequested &&
    routeLegQueries.some((query) => query.isFetching) &&
    !routeResult &&
    !routeError;
  const mapRouteSummary = formatMapRouteSummary(stats, locale, t);
  const renderMapWorkspace = (mapId?: string, actions?: ReactNode) => (
    <div
      id={mapId}
      className="relative scroll-mt-20 overflow-hidden rounded-md border border-border/80 bg-card lg:rounded-none lg:border-0"
    >
      <LazyTripMap
        markers={markers}
        route={renderedRoute}
        activeRoute={activeRoute}
        routeResult={routeResult}
        viewport={viewport}
        selectedMarkerId={selectedMarkerId}
        hoveredMarkerId={hoveredMarkerId}
        focusedMarkerIds={focusedMarkerIds}
        markerPresence={markerPresence}
        autoFitMarkerBoundsKey={autoFitMarkerBoundsKey}
        onViewportChange={setViewport}
        onMarkerSelect={handleMarkerSelect}
        onMarkerHover={handleMarkerHover}
        onMapContextChange={cancelMapStopDraft}
        onMapClick={(point) => void handleMapClick(point)}
      />
      {actions ? (
        <div className="absolute left-4 top-4 z-50 flex items-center gap-1">{actions}</div>
      ) : null}
      <MapNoticeStack className={actions ? "top-12" : undefined}>
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
            <Button type="button" size="sm" variant="secondary" onClick={refetchRouteLegs}>
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
      {mapRouteSummary && !currentMapStopCandidate ? (
        <div className="absolute bottom-3 right-3 z-30 inline-flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-md border bg-background/95 px-3 py-2 text-sm font-medium text-foreground shadow-sm">
          <Route className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="truncate">{mapRouteSummary}</span>
        </div>
      ) : null}
      {currentMapStopCandidate ? (
        <div className="absolute inset-x-3 bottom-3 z-40 rounded-md border bg-background/95 p-3 text-sm shadow-sm">
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
  const desktopGridStyle =
    mapLayout === "desktop" && !isMapPaneCollapsed
      ? {
          gridTemplateColumns: `minmax(0, ${100 - mapPaneWidthPercent}fr) 0.75rem minmax(20rem, ${mapPaneWidthPercent}fr)`
        }
      : undefined;

  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 overflow-x-hidden pb-0 lg:h-dvh lg:overflow-hidden">
      <div
        ref={splitPaneRef}
        className={cn(
          "grid w-full gap-0 lg:h-full lg:items-start",
          isMapPaneCollapsed
            ? "lg:grid-cols-[minmax(0,1fr)_auto]"
            : "lg:grid-cols-[minmax(0,2fr)_0.75rem_minmax(20rem,1fr)]"
        )}
        style={desktopGridStyle}
      >
        <div className="flex flex-col gap-3 px-3 pb-4 sm:px-4 lg:h-dvh lg:min-h-0 lg:overflow-hidden lg:px-5">
          <div className="sticky top-0 z-30 bg-background lg:static lg:z-auto">
            <TripEditorHeader
              trip={trip}
              stats={stats}
              presenceEntries={presenceEntries}
              currentUserId={currentUser?.id}
              followedPresenceUserId={followedPresenceUserId}
              onFollowPresenceUser={followPresenceUser}
              onIssueSummaryClick={firstTimingIssue ? handleIssueSummaryClick : undefined}
            />
          </div>
          {placesQuery.isError ? (
            <div
              className={cn(
                "flex items-start gap-2 rounded-md border p-3 text-sm",
                semanticColorClassNames.errorSubtle
              )}
            >
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
          <div
            className="flex flex-wrap items-center gap-x-5 gap-y-0 border-b border-border/70"
            role="tablist"
            aria-label={t("tabs.label")}
          >
            {(["stops", "map", "budget", "notes", "planning", "files"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={visibleActiveTab === tab}
                className={cn(
                  "relative -mb-px h-9 shrink-0 border-b-2 px-0 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2",
                  tab === "map" && "lg:hidden",
                  visibleActiveTab === tab ? "border-accent text-accent" : "border-transparent"
                )}
                onClick={() => {
                  if (tab !== activeTab) {
                    cancelMapStopDraft();
                  }
                  setActiveTab(tab);
                }}
              >
                {t(`tabs.${tab}`)}
              </button>
            ))}
          </div>
          <div className="min-w-0 px-1 pt-1 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain lg:pr-2">
            {visibleActiveTab === "stops" ? (
              <TripItineraryPanel
                tripId={trip.id}
                tripTimezone={trip.timezone}
                items={items}
                places={places}
                currentUserId={currentUser?.id}
                routeSummaryByItem={routeSummaryByItem}
                onRouteTravelModeChange={setRouteLegTravelMode}
                onRouteSectionOpenChange={handleRouteSectionOpenChange}
                onRoutePopoverOpenChange={handleRoutePopoverOpenChange}
                focusedRouteItemIds={focusedRouteItemIds}
                syncStateByItem={syncStateByItem}
                hasNextPage={itineraryQuery.hasNextPage}
                isFetchingNextPage={itineraryQuery.isFetchingNextPage}
                onLoadMore={() => void itineraryQuery.fetchNextPage()}
              />
            ) : null}
            {visibleActiveTab === "budget" ? (
              <BudgetExpensePanel tripId={trip.id} items={items} places={places} />
            ) : null}
            {visibleActiveTab === "notes" ? (
              <NotePanel
                tripId={trip.id}
                targetEntityType="TRIP"
                targetEntityId={trip.id}
                title={t("notes.tripTitle")}
              />
            ) : null}
            {visibleActiveTab === "planning" ? (
              <PlanningPanel
                tripId={trip.id}
                items={completeRouteItems ?? items}
                places={places}
                onSelectItem={(itemId, placeId) => {
                  setActiveTab("stops");
                  selectItem(itemId, placeId);
                }}
              />
            ) : null}
            {visibleActiveTab === "files" ? (
              <div className="rounded-md border border-dashed bg-muted/20 p-5 text-sm text-muted-foreground">
                {t("files.empty")}
              </div>
            ) : null}
            {visibleActiveTab === "map" && mapLayout === undefined ? (
              <div className="lg:hidden">
                <MapWorkspaceSkeleton />
              </div>
            ) : null}
          </div>
        </div>

        {mapLayout === "desktop" && !isMapPaneCollapsed ? (
          <div
            className={cn(
              "hidden h-dvh items-stretch justify-center lg:sticky lg:flex",
              stickyWorkspaceTopClassName
            )}
          >
            <button
              type="button"
              className="flex h-full w-3 cursor-col-resize items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2"
              aria-label={t("map.resize")}
              onPointerDown={handleMapPaneResizePointerDown}
            >
              <GripVertical className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        ) : null}

        {mapLayout === "desktop" && !isMapPaneCollapsed ? (
          <aside className={cn("hidden lg:sticky lg:block", stickyWorkspaceTopClassName)}>
            {renderMapWorkspace(
              undefined,
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 rounded-md border bg-background/95 px-2.5 text-muted-foreground shadow-none hover:bg-muted hover:text-foreground"
                aria-label={t("map.collapse")}
                title={t("map.collapse")}
                onClick={() => setIsMapPaneCollapsed(true)}
              >
                <PanelRightClose className="size-4" aria-hidden="true" />
                <span>{t("map.collapse")}</span>
              </Button>
            )}
          </aside>
        ) : null}
        {mapLayout === "desktop" && isMapPaneCollapsed ? (
          <aside className={cn("hidden lg:sticky lg:block", stickyWorkspaceTopClassName)}>
            <button
              type="button"
              className="flex size-9 items-center justify-center rounded-md border bg-background text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2"
              aria-label={t("map.expand")}
              title={t("map.expand")}
              onClick={() => setIsMapPaneCollapsed(false)}
            >
              <PanelRightOpen className="size-4" aria-hidden="true" />
            </button>
          </aside>
        ) : null}
        {mapLayout === undefined ? (
          <aside className={cn("hidden lg:sticky lg:block", stickyWorkspaceTopClassName)}>
            <MapWorkspaceSkeleton />
          </aside>
        ) : null}
      </div>

      <ConflictDialog tripId={trip.id} />

      {mapLayout === "mobile" && visibleActiveTab !== "map" ? (
        <button
          type="button"
          className="fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-3 z-40 inline-flex h-11 max-w-[calc(100vw-8rem)] items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-2 lg:hidden"
          onClick={handleOpenMobileMap}
        >
          <MapIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="truncate">{t("map.jump")}</span>
          {mapRouteSummary ? (
            <span className="hidden truncate text-xs font-normal text-muted-foreground sm:inline">
              {mapRouteSummary}
            </span>
          ) : null}
        </button>
      ) : null}

      {isMobileMapOpen ? (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={t("map.label")}
        >
          <button
            type="button"
            className="absolute inset-0 bg-background/75"
            aria-label={t("map.close")}
            onClick={handleCloseMobileMap}
          />
          <div className="absolute inset-x-0 bottom-0 grid max-h-[86dvh] rounded-t-md border bg-background pb-[env(safe-area-inset-bottom)] shadow-md">
            <div className="flex justify-center pt-2" aria-hidden="true">
              <span className="h-1 w-10 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="flex min-w-0 items-center justify-between gap-3 border-b px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{t("map.label")}</p>
                {mapRouteSummary ? (
                  <p className="truncate text-xs text-muted-foreground">{mapRouteSummary}</p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                aria-label={t("map.close")}
                onClick={handleCloseMobileMap}
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            </div>
            <div className="overflow-hidden p-3 pt-2">
              {renderMapWorkspace("trip-editor-mobile-map")}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function buildRouteTravelModeByLeg(
  routePreferences: TripRoutePreference[]
): Record<string, MapTravelMode> {
  return routePreferences.reduce<Record<string, MapTravelMode>>(
    (travelModeByLeg, routePreference) => {
      travelModeByLeg[`leg:${routePreference.fromItemId}:${routePreference.toItemId}`] =
        routePreference.travelMode;

      return travelModeByLeg;
    },
    {}
  );
}

function getRouteLegPreferenceItemIds(routeLegId: string) {
  const [prefix, fromItemId, toItemId] = routeLegId.split(":");

  if (prefix !== "leg" || !fromItemId || !toItemId) {
    return null;
  }

  return { fromItemId, toItemId };
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
        },
        request: {
          points: [
            {
              latitude: previousMarker.latitude,
              longitude: previousMarker.longitude
            },
            {
              latitude: marker.latitude,
              longitude: marker.longitude
            }
          ],
          travelMode
        }
      }
    ];
  });
}

function buildRouteLegsFromRouteRequests(
  routeLegRequests: RouteLegRequest[],
  routes: Array<MapRoute | undefined>
): DerivedRouteLeg[] {
  return routeLegRequests.map((routeLeg, index) => {
    const route = routes[index];
    const providerLeg = route?.legs[0];

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

function formatMapRouteSummary(
  stats: ReturnType<typeof buildPlannerStats>,
  locale: string,
  t: ReturnType<typeof useTranslations>
) {
  if (
    stats.routeCount === 0 ||
    stats.totalRouteDistanceMeters <= 0 ||
    stats.totalRouteDurationSeconds <= 0
  ) {
    return null;
  }

  const kilometers = stats.totalRouteDistanceMeters / 1000;
  const distance = t("map.routeDistanceKilometers", {
    kilometers: new Intl.NumberFormat(locale, {
      maximumFractionDigits: kilometers >= 10 ? 0 : 1
    }).format(kilometers)
  });
  const duration = t("map.routeDurationMinutes", {
    minutes: Math.max(1, Math.round(stats.totalRouteDurationSeconds / 60))
  });

  return t("map.routeSummary", { distance, duration });
}

function MapNoticeStack({
  children,
  className
}: {
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <div className={cn("absolute left-3 right-3 top-3 z-40 grid gap-2 empty:hidden", className)}>
      {children}
    </div>
  );
}

function MapNotice({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-background/95 px-3 py-2 text-xs text-muted-foreground shadow-sm">
      {children}
    </div>
  );
}

function MapWorkspaceSkeleton() {
  return (
    <div className="h-[42dvh] min-h-72 max-h-[28rem] rounded-md border bg-muted md:h-dvh md:max-h-none md:rounded-none md:border-0" />
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

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

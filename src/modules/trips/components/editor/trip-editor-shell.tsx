"use client";

import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";
import { RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/error-state";
import type { MapMarker } from "@/modules/map/types/map.types";
import { usePlannerStore } from "@/stores/use-planner-store";

import { tripDetailQueryOptions } from "../../queries/trip.queries";
import { getTripMapMarkers, getTripRoute } from "../../utils/trip-editor.utils";
import { PlaceSearchBox } from "./place-search-box";
import { TripEditorHeader } from "./trip-editor-header";
import { TripEditorSkeleton } from "./trip-editor-skeleton";
import { TripItineraryPanel } from "./trip-itinerary-panel";
import { TripNotesEditor } from "./trip-notes-editor";

const LazyTripMap = dynamic(
  () => import("@/modules/map/components/trip-map").then((mod) => mod.TripMap),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[26rem] rounded-md border bg-muted md:min-h-[calc(100dvh-8rem)]" />
    )
  }
);

interface TripEditorShellProps {
  tripId: string;
}

export function TripEditorShell({ tripId }: TripEditorShellProps) {
  const t = useTranslations("trip.editor");
  const tripQuery = useQuery(tripDetailQueryOptions(tripId));
  const viewport = usePlannerStore((state) => state.viewport);
  const selectedItemId = usePlannerStore((state) => state.selectedItemId);
  const hoveredItemId = usePlannerStore((state) => state.hoveredItemId);
  const setViewport = usePlannerStore((state) => state.setViewport);
  const selectItem = usePlannerStore((state) => state.selectItem);
  const setSelectedTripId = usePlannerStore((state) => state.setSelectedTripId);

  const markers = useMemo(
    () => (tripQuery.data ? getTripMapMarkers(tripQuery.data) : []),
    [tripQuery.data]
  );
  const route = useMemo(
    () => (tripQuery.data ? getTripRoute(tripQuery.data) : []),
    [tripQuery.data]
  );
  const selectedMarkerId = selectedItemId ? `item:${selectedItemId}` : undefined;
  const hoveredMarkerId = hoveredItemId ? `item:${hoveredItemId}` : undefined;

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

  if (tripQuery.isLoading) {
    return <TripEditorSkeleton />;
  }

  if (tripQuery.isError || !tripQuery.data) {
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

  function handleMarkerSelect(marker: MapMarker) {
    selectItem(marker.itemId, marker.placeId);
    setViewport({
      latitude: marker.latitude,
      longitude: marker.longitude,
      zoom: Math.max(viewport.zoom, 14)
    });
  }

  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-[96rem] gap-6 lg:grid-cols-[minmax(24rem,42rem)_minmax(28rem,1fr)] lg:items-start">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-4"
        >
          <TripEditorHeader key={`${trip.id}:${trip.version}`} trip={trip} />
          <TripNotesEditor trip={trip} />
          <PlaceSearchBox tripId={trip.id} days={trip.days} />
          <TripItineraryPanel trip={trip} />
        </motion.div>

        <aside className="lg:sticky lg:top-20">
          <LazyTripMap
            markers={markers}
            route={route}
            viewport={viewport}
            selectedMarkerId={selectedMarkerId}
            hoveredMarkerId={hoveredMarkerId}
            onViewportChange={setViewport}
            onMarkerSelect={handleMarkerSelect}
          />
        </aside>
      </div>
    </div>
  );
}

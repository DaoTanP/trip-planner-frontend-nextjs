"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { tripKeys } from "@/modules/trips/queries/trip.queries";
import type { TripDetail } from "@/modules/trips/types/trip.types";

import { reconcileRevisionGap } from "../reconciliation/reconciliation";
import { logSyncDebug } from "../runtime/sync-dev-logger";

type UseTripDeltaSyncOptions = {
  enabled?: boolean;
  intervalMs?: number;
};

export function useTripDeltaSync(
  tripId: string,
  { enabled = true, intervalMs = 15_000 }: UseTripDeltaSyncOptions = {}
) {
  const queryClient = useQueryClient();
  const latestRevisionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const abortController = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      const trip = queryClient.getQueryData<TripDetail>(tripKeys.detail(tripId));
      const sinceRevision = latestRevisionRef.current ?? trip?.revision ?? "0";

      try {
        const page = await reconcileRevisionGap(
          queryClient,
          tripId,
          sinceRevision,
          100,
          abortController.signal
        );
        latestRevisionRef.current = page.latestRevision;
        logSyncDebug("Delta sync completed", {
          tripId,
          latestRevision: page.latestRevision,
          eventCount: page.events.length
        });
      } catch (error) {
        if (!abortController.signal.aborted) {
          logSyncDebug("Delta sync failed", {
            tripId,
            message: error instanceof Error ? error.message : String(error)
          });
        }
      } finally {
        if (!abortController.signal.aborted) {
          timeoutId = setTimeout(tick, intervalMs);
        }
      }
    };

    timeoutId = setTimeout(tick, intervalMs);

    return () => {
      abortController.abort();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [enabled, intervalMs, queryClient, tripId]);
}

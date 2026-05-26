"use client";

import { useCallback, useEffect, useRef } from "react";

import type { MapViewport } from "@/modules/map/types/map.types";
import { normalizeViewport } from "@/modules/map/utils/viewport";

export function useMapViewport({
  debounceMs = 150,
  onViewportChange
}: {
  debounceMs?: number;
  onViewportChange: (viewport: MapViewport) => void;
}) {
  const timeoutRef = useRef<number | undefined>(undefined);
  const onViewportChangeRef = useRef(onViewportChange);

  useEffect(() => {
    onViewportChangeRef.current = onViewportChange;
  }, [onViewportChange]);

  useEffect(
    () => () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    },
    []
  );

  const commitViewport = useCallback((viewport: MapViewport) => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }

    onViewportChangeRef.current(normalizeViewport(viewport));
  }, []);

  const scheduleViewport = useCallback(
    (viewport: MapViewport) => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        onViewportChangeRef.current(normalizeViewport(viewport));
      }, debounceMs);
    },
    [debounceMs]
  );

  return {
    commitViewport,
    scheduleViewport
  };
}

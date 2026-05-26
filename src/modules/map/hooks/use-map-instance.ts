"use client";

import { useCallback, useRef } from "react";

export function useMapInstance<TMap>() {
  const mapRef = useRef<TMap | null>(null);

  const setMapInstance = useCallback((map: TMap | null) => {
    mapRef.current = map;
  }, []);

  return {
    mapRef,
    setMapInstance
  };
}

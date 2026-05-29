"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type VirtualWindowOptions = {
  itemCount: number;
  estimateSize: number;
  overscan?: number;
  enabled?: boolean;
};

type VirtualItem = {
  index: number;
  key: string;
  start: number;
  size: number;
};

export function useVirtualWindow({
  itemCount,
  estimateSize,
  overscan = 8,
  enabled = true
}: VirtualWindowOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ scrollTop: 0, height: 0 });
  const isVirtualized = enabled && itemCount > 0;

  useEffect(() => {
    const container = containerRef.current;

    if (!container || !isVirtualized) {
      return;
    }

    const updateViewport = () => {
      setViewport({
        scrollTop: container.scrollTop,
        height: container.clientHeight
      });
    };

    updateViewport();
    container.addEventListener("scroll", updateViewport, { passive: true });

    const resizeObserver = new ResizeObserver(updateViewport);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener("scroll", updateViewport);
      resizeObserver.disconnect();
    };
  }, [isVirtualized]);

  const virtualItems = useMemo<VirtualItem[]>(() => {
    if (!isVirtualized) {
      return Array.from({ length: itemCount }, (_, index) => ({
        index,
        key: String(index),
        start: index * estimateSize,
        size: estimateSize
      }));
    }

    const firstVisibleIndex = Math.floor(viewport.scrollTop / estimateSize);
    const visibleCount = Math.ceil(viewport.height / estimateSize);
    const startIndex = Math.max(0, firstVisibleIndex - overscan);
    const endIndex = Math.min(itemCount, firstVisibleIndex + visibleCount + overscan);

    return Array.from({ length: endIndex - startIndex }, (_, offset) => {
      const index = startIndex + offset;

      return {
        index,
        key: String(index),
        start: index * estimateSize,
        size: estimateSize
      };
    });
  }, [estimateSize, isVirtualized, itemCount, overscan, viewport.height, viewport.scrollTop]);

  return {
    containerRef,
    isVirtualized,
    totalSize: itemCount * estimateSize,
    virtualItems
  };
}

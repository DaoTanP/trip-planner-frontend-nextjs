"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type MutableRefObject
} from "react";
import { createPortal } from "react-dom";
import { Check, Plus, RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";
import type { MapTravelMode } from "@/modules/map/types/map.types";
import { getTravelModeConfig, routeColorClassNames } from "@/theme";

export interface StopRouteTravelModeOption {
  value: MapTravelMode;
  label: string;
  description?: string | undefined;
}

interface BaseStopRouteSegment {
  id: string;
  metrics: string[];
  routeSelectLabel: string;
  isSelected: boolean;
  isHovered: boolean;
  isPending?: boolean | undefined;
  addStopLabel?: string | undefined;
  isAddStopActive?: boolean | undefined;
  onAddStop?: (() => void) | undefined;
}

export interface StopRouteTravelSegment extends BaseStopRouteSegment {
  kind?: "route";
  travelMode: MapTravelMode;
  travelModeLabel: string;
  travelModeSelectLabel: string;
  routeModePickerTitle: string;
  travelModeOptions: StopRouteTravelModeOption[];
  onSelectRoute: () => void;
  onTravelModePopoverOpenChange: (isOpen: boolean) => void;
  onHover: (isHovered: boolean) => void;
  onTravelModeChange: (travelMode: MapTravelMode) => void;
}

export interface StopRouteGapSegment extends BaseStopRouteSegment {
  kind: "gap";
}

export type StopRouteSegment = StopRouteTravelSegment | StopRouteGapSegment;

interface StopSequenceRailProps {
  sequence: number;
  label: string;
  isFirst: boolean;
  isLast: boolean;
  isSelected?: boolean | undefined;
  isActive?: boolean | undefined;
  isDragging?: boolean | undefined;
  routeSegment?: StopRouteSegment | undefined;
}

interface StopMarkerProps {
  sequence: number;
  label: string;
  isSelected?: boolean | undefined;
  isActive?: boolean | undefined;
  isDragging?: boolean | undefined;
}

interface StopConnectorProps {
  isVisible: boolean;
  className?: string | undefined;
}

interface RouteSegmentProps {
  segment: StopRouteSegment;
}

interface RouteTravelSegmentProps {
  segment: StopRouteTravelSegment;
}

interface RouteGapSegmentProps {
  segment: StopRouteGapSegment;
}

type RouteModePickerPosition = {
  left: number;
  top: number;
  width: number;
};

const routeModePickerWidth = 256;
const routeModePickerEstimatedHeight = 230;
const routeModePickerViewportPadding = 8;

export function StopSequenceRail({
  sequence,
  label,
  isFirst,
  isLast,
  isSelected = false,
  isActive = false,
  isDragging = false,
  routeSegment
}: StopSequenceRailProps) {
  return (
    <div className="flex w-8 shrink-0 flex-col items-center self-stretch">
      <div className={cn("relative flex w-full justify-center", routeSegment ? "h-7" : "h-1.5")}>
        <StopConnector isVisible={!isFirst} className="h-full" />
        {routeSegment ? <RouteSegment segment={routeSegment} /> : null}
      </div>
      <StopMarker
        sequence={sequence}
        label={label}
        isSelected={isSelected}
        isActive={isActive}
        isDragging={isDragging}
      />
      <StopConnector isVisible={!isLast} className="min-h-5 flex-1" />
    </div>
  );
}

export function RouteSegment({ segment }: RouteSegmentProps) {
  if (segment.kind === "gap") {
    return <RouteGapSegment segment={segment} />;
  }

  return <RouteTravelSegment segment={segment} />;
}

function RouteTravelSegment({ segment }: RouteTravelSegmentProps) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const isPickerOpenRef = useRef(false);
  const onPopoverOpenChangeRef = useRef(segment.onTravelModePopoverOpenChange);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerPosition, setPickerPosition] = useState<RouteModePickerPosition | null>(null);
  const isFocused = segment.isSelected || segment.isHovered || segment.isPending;

  const setPickerOpen = useCallback((nextValue: boolean | ((current: boolean) => boolean)) => {
    const currentIsOpen = isPickerOpenRef.current;
    const nextIsOpen = typeof nextValue === "function" ? nextValue(currentIsOpen) : nextValue;

    if (nextIsOpen === currentIsOpen) {
      return;
    }

    isPickerOpenRef.current = nextIsOpen;
    onPopoverOpenChangeRef.current(nextIsOpen);
    setIsPickerOpen(nextIsOpen);
  }, []);
  const updatePickerPosition = useCallback(() => {
    const trigger = triggerRef.current;

    if (!trigger) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const left = Math.min(
      Math.max(routeModePickerViewportPadding, rect.left),
      Math.max(
        routeModePickerViewportPadding,
        window.innerWidth - routeModePickerWidth - routeModePickerViewportPadding
      )
    );
    const hasRoomBelow =
      rect.bottom + routeModePickerEstimatedHeight + routeModePickerViewportPadding <=
      window.innerHeight;
    const top = hasRoomBelow
      ? rect.bottom + 4
      : Math.max(routeModePickerViewportPadding, rect.top - routeModePickerEstimatedHeight - 4);

    setPickerPosition({
      left,
      top,
      width: routeModePickerWidth
    });
  }, []);

  useEffect(() => {
    onPopoverOpenChangeRef.current = segment.onTravelModePopoverOpenChange;
  }, [segment.onTravelModePopoverOpenChange]);

  useEffect(() => {
    return () => {
      if (isPickerOpenRef.current) {
        isPickerOpenRef.current = false;
        onPopoverOpenChangeRef.current(false);
      }
    };
  }, []);

  useEffect(() => {
    if (!isPickerOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setPickerOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isPickerOpen, setPickerOpen]);

  useEffect(() => {
    if (!isPickerOpen) {
      return;
    }

    updatePickerPosition();
    window.addEventListener("resize", updatePickerPosition);
    window.addEventListener("scroll", updatePickerPosition, true);

    return () => {
      window.removeEventListener("resize", updatePickerPosition);
      window.removeEventListener("scroll", updatePickerPosition, true);
    };
  }, [isPickerOpen, updatePickerPosition]);

  function openPicker(focusOptionIndex?: number) {
    segment.onSelectRoute();
    setPickerOpen(true);
    updatePickerPosition();

    if (focusOptionIndex !== undefined) {
      window.requestAnimationFrame(() => optionRefs.current[focusOptionIndex]?.focus());
    }
  }

  function closePicker() {
    setPickerOpen(false);
    triggerRef.current?.focus();
  }

  function handleModeChange(travelMode: MapTravelMode) {
    segment.onSelectRoute();
    segment.onTravelModeChange(travelMode);
    setPickerOpen(false);
    triggerRef.current?.focus();
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      openPicker(
        Math.max(
          0,
          segment.travelModeOptions.findIndex((option) => option.value === segment.travelMode)
        )
      );
    }

    if (event.key === "Escape" && isPickerOpen) {
      event.preventDefault();
      closePicker();
    }
  }

  function handleOptionKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === "Escape") {
      event.preventDefault();
      closePicker();
      return;
    }

    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      return;
    }

    event.preventDefault();

    const optionCount = segment.travelModeOptions.length;
    const nextIndex =
      event.key === "ArrowDown"
        ? (index + 1) % optionCount
        : (index - 1 + optionCount) % optionCount;

    optionRefs.current[nextIndex]?.focus();
  }

  return (
    <div
      ref={rootRef}
      className="absolute left-1/2 top-1/2 z-20 flex -translate-y-1/2 items-center whitespace-nowrap text-left text-xs text-muted-foreground"
      onMouseEnter={() => segment.onHover(true)}
      onMouseLeave={() => segment.onHover(false)}
    >
      <span className="h-px w-5 bg-border" aria-hidden="true" />
      {segment.onAddStop ? <RouteAddStopButton segment={segment} /> : null}
      <div className="relative min-w-0">
        <button
          ref={triggerRef}
          type="button"
          className={cn(
            "group inline-flex min-h-6 max-w-[min(22rem,calc(100vw-5rem))] min-w-0 items-center gap-1.5 rounded-sm px-1 py-0.5 text-left text-xs transition-colors",
            "hover:text-foreground focus-visible:outline-2",
            segment.isPending && "cursor-progress",
            isFocused && "text-foreground"
          )}
          aria-label={segment.routeSelectLabel}
          aria-haspopup="menu"
          aria-expanded={isPickerOpen}
          aria-controls={isPickerOpen ? menuId : undefined}
          onClick={() => {
            segment.onSelectRoute();
            setPickerOpen((current) => {
              if (!current) {
                window.requestAnimationFrame(updatePickerPosition);
              }

              return !current;
            });
          }}
          onKeyDown={handleTriggerKeyDown}
        >
          <RouteModeChip segment={segment} />
          <RouteMetrics segment={segment} />
        </button>
        {isPickerOpen && pickerPosition && typeof document !== "undefined"
          ? createPortal(
              <RouteModePicker
                segment={segment}
                menuId={menuId}
                menuRef={menuRef}
                position={pickerPosition}
                optionRefs={optionRefs}
                onModeChange={handleModeChange}
                onOptionKeyDown={handleOptionKeyDown}
              />,
              document.body
            )
          : null}
      </div>
    </div>
  );
}

function RouteGapSegment({ segment }: RouteGapSegmentProps) {
  return (
    <div
      className="absolute left-1/2 top-1/2 z-20 flex -translate-y-1/2 items-center whitespace-nowrap text-left text-xs text-muted-foreground/80"
      aria-label={segment.routeSelectLabel}
    >
      <span className="h-px w-5 border-t border-dashed border-border" aria-hidden="true" />
      {segment.onAddStop ? <RouteAddStopButton segment={segment} /> : null}
      <span className="inline-flex min-h-6 min-w-0 items-center gap-1.5 rounded-sm px-1 py-0.5">
        <span aria-hidden="true">{"->"}</span>
        <RouteMetrics segment={segment} />
      </span>
    </div>
  );
}

export function StopMarker({
  sequence,
  label,
  isSelected = false,
  isActive = false,
  isDragging = false
}: StopMarkerProps) {
  return (
    <span
      title={String(sequence)}
      className={cn(
        "relative z-10 flex size-7 items-center justify-center rounded-md border bg-muted text-xs font-semibold leading-none text-muted-foreground transition-[background-color,border-color,color,box-shadow]",
        isActive && "border-marker-focused bg-marker-focused/10 text-marker-focused",
        isSelected && "border-accent bg-accent text-white",
        isDragging && "ring-2 ring-ring ring-offset-2"
      )}
      aria-label={label}
    >
      {sequence}
    </span>
  );
}

function RouteAddStopButton({ segment }: { segment: StopRouteSegment }) {
  if (!segment.onAddStop) {
    return null;
  }

  return (
    <button
      type="button"
      className={cn(
        "inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2",
        segment.isAddStopActive && "bg-muted text-foreground"
      )}
      aria-label={segment.addStopLabel}
      title={segment.addStopLabel}
      onClick={(event) => {
        event.stopPropagation();
        segment.onAddStop?.();
      }}
    >
      <Plus className="size-3.5" aria-hidden="true" />
    </button>
  );
}

function RouteModeChip({ segment }: RouteTravelSegmentProps) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <TravelModeIcon travelMode={segment.travelMode} />
      <span className="sr-only">{segment.travelModeLabel}</span>
    </span>
  );
}

function RouteMetrics({ segment }: RouteSegmentProps) {
  if (segment.metrics.length === 0) {
    return null;
  }

  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-muted-foreground group-hover:text-current">
      {segment.isPending ? (
        <RefreshCw className="size-3 shrink-0 animate-spin" aria-hidden="true" />
      ) : null}
      <span className="min-w-0 truncate">{segment.metrics.join(" \u00b7 ")}</span>
    </span>
  );
}

function RouteModePicker({
  segment,
  menuId,
  menuRef,
  position,
  optionRefs,
  onModeChange,
  onOptionKeyDown
}: RouteTravelSegmentProps & {
  menuId: string;
  menuRef: MutableRefObject<HTMLDivElement | null>;
  position: RouteModePickerPosition;
  optionRefs: MutableRefObject<Array<HTMLButtonElement | null>>;
  onModeChange: (travelMode: MapTravelMode) => void;
  onOptionKeyDown: (event: KeyboardEvent<HTMLButtonElement>, index: number) => void;
}) {
  return (
    <div
      id={menuId}
      ref={menuRef}
      role="menu"
      aria-label={segment.travelModeSelectLabel}
      className="fixed z-[100] rounded-md border bg-background p-1 shadow-sm"
      style={{
        left: position.left,
        top: position.top,
        width: position.width
      }}
    >
      <div className="border-b px-2 py-1.5 text-xs font-semibold text-muted-foreground">
        {segment.routeModePickerTitle}
      </div>
      <div className="grid gap-1 py-1">
        {segment.travelModeOptions.map((option, index) => {
          const isActive = option.value === segment.travelMode;

          return (
            <button
              key={option.value}
              ref={(element) => {
                optionRefs.current[index] = element;
              }}
              type="button"
              role="menuitemradio"
              aria-checked={isActive}
              className={cn(
                "grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
                "hover:bg-muted focus-visible:outline-2",
                isActive && routeColorClassNames.activeModeOption
              )}
              onClick={() => onModeChange(option.value)}
              onKeyDown={(event) => onOptionKeyDown(event, index)}
            >
              <TravelModeIcon travelMode={option.value} />
              <span className="min-w-0">
                <span className="block truncate font-medium">{option.label}</span>
                {option.description ? (
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {option.description}
                  </span>
                ) : null}
              </span>
              {isActive ? (
                <Check
                  className={cn("size-4", routeColorClassNames.activeModeCheck)}
                  aria-hidden="true"
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TravelModeIcon({ travelMode }: { travelMode: MapTravelMode }) {
  const { Icon, color } = getTravelModeConfig(travelMode);

  return <Icon className={cn("size-3.5 shrink-0", color.className)} aria-hidden="true" />;
}

export function StopConnector({ isVisible, className }: StopConnectorProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("w-px bg-border/80", !isVisible && "bg-transparent", className)}
    />
  );
}

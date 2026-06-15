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
import {
  Bike,
  Bus,
  Car,
  ChevronDown,
  Check,
  Footprints,
  Plane,
  Route,
  Ship,
  TrainFront
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { MapTravelMode } from "@/modules/map/types/map.types";

export interface StopRouteTravelModeOption {
  value: MapTravelMode;
  label: string;
  description?: string | undefined;
}

export interface StopRouteSegment {
  id: string;
  travelMode: MapTravelMode;
  travelModeLabel: string;
  travelModeSelectLabel: string;
  routeModePickerTitle: string;
  travelModeOptions: StopRouteTravelModeOption[];
  metrics: string[];
  routeSelectLabel: string;
  isSelected: boolean;
  isHovered: boolean;
  onFocusRoute: () => void;
  onHover: (isHovered: boolean) => void;
  onTravelModeChange: (travelMode: MapTravelMode) => void;
}

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
    <div className="flex w-12 shrink-0 flex-col items-center self-stretch">
      <div className={cn("relative flex w-full justify-center", routeSegment ? "h-9" : "h-2")}>
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
      <StopConnector isVisible={!isLast} className="min-h-8 flex-1" />
    </div>
  );
}

export function RouteSegment({ segment }: RouteSegmentProps) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerPosition, setPickerPosition] = useState<RouteModePickerPosition | null>(null);
  const isFocused = segment.isSelected || segment.isHovered;
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
    if (!isPickerOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setIsPickerOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isPickerOpen]);

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
    segment.onFocusRoute();
    setIsPickerOpen(true);
    updatePickerPosition();

    if (focusOptionIndex !== undefined) {
      window.requestAnimationFrame(() => optionRefs.current[focusOptionIndex]?.focus());
    }
  }

  function closePicker() {
    setIsPickerOpen(false);
    triggerRef.current?.focus();
  }

  function handleModeChange(travelMode: MapTravelMode) {
    segment.onFocusRoute();
    segment.onTravelModeChange(travelMode);
    setIsPickerOpen(false);
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
      <span className="h-px w-10 bg-border" aria-hidden="true" />
      <div className="relative min-w-0">
        <button
          ref={triggerRef}
          type="button"
          className={cn(
            "group inline-flex min-h-8 max-w-[min(22rem,calc(100vw-5rem))] min-w-0 items-center gap-3 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
            "hover:bg-muted/70 hover:text-foreground hover:shadow-sm focus-visible:outline-2",
            isFocused && "bg-accent/10 text-foreground ring-1 ring-accent/40"
          )}
          aria-label={segment.routeSelectLabel}
          aria-haspopup="menu"
          aria-expanded={isPickerOpen}
          aria-controls={isPickerOpen ? menuId : undefined}
          onClick={() => {
            segment.onFocusRoute();
            setIsPickerOpen((current) => {
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
          <ChevronDown
            className={cn("size-3 shrink-0 transition-transform", isPickerOpen && "rotate-180")}
            aria-hidden="true"
          />
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

export function StopMarker({
  sequence,
  label,
  isSelected = false,
  isActive = false,
  isDragging = false
}: StopMarkerProps) {
  return (
    <span
      className={cn(
        "relative z-10 flex size-8 items-center justify-center rounded-full border bg-background text-xs font-semibold text-foreground shadow-sm transition-colors",
        isActive && "border-accent bg-accent/10 text-accent-foreground",
        isSelected && "border-primary bg-primary text-primary-foreground",
        isDragging && "ring-2 ring-ring"
      )}
      aria-label={label}
    >
      {sequence}
    </span>
  );
}

function RouteModeChip({ segment }: RouteSegmentProps) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 font-medium text-foreground">
      <TravelModeIcon travelMode={segment.travelMode} />
      <span className="truncate">{segment.travelModeLabel}</span>
    </span>
  );
}

function RouteMetrics({ segment }: RouteSegmentProps) {
  if (segment.metrics.length === 0) {
    return null;
  }

  return (
    <span className="min-w-0 truncate text-muted-foreground group-hover:text-current">
      {segment.metrics.join(" \u00b7 ")}
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
}: RouteSegmentProps & {
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
      className="fixed z-[100] rounded-md border bg-background p-1 shadow-lg"
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
                isActive && "bg-accent/10 text-foreground"
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
              {isActive ? <Check className="size-4 text-primary" aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TravelModeIcon({ travelMode }: { travelMode: string }) {
  const normalizedMode = travelMode.trim().toLowerCase();

  if (["driving", "drive", "car", "route"].includes(normalizedMode)) {
    return <Car className="size-3.5 shrink-0" aria-hidden="true" />;
  }

  if (["walking", "walk", "foot"].includes(normalizedMode)) {
    return <Footprints className="size-3.5 shrink-0" aria-hidden="true" />;
  }

  if (["bicycling", "cycling", "bike", "bicycle"].includes(normalizedMode)) {
    return <Bike className="size-3.5 shrink-0" aria-hidden="true" />;
  }

  if (["transit", "bus"].includes(normalizedMode)) {
    return <Bus className="size-3.5 shrink-0" aria-hidden="true" />;
  }

  if (["train", "rail"].includes(normalizedMode)) {
    return <TrainFront className="size-3.5 shrink-0" aria-hidden="true" />;
  }

  if (["flight", "plane", "air"].includes(normalizedMode)) {
    return <Plane className="size-3.5 shrink-0" aria-hidden="true" />;
  }

  if (["ferry", "ship", "boat"].includes(normalizedMode)) {
    return <Ship className="size-3.5 shrink-0" aria-hidden="true" />;
  }

  return <Route className="size-3.5 shrink-0" aria-hidden="true" />;
}

export function StopConnector({ isVisible, className }: StopConnectorProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("w-px bg-border", !isVisible && "bg-transparent", className)}
    />
  );
}

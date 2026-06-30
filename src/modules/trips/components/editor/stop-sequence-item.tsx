"use client";

import type { DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { StopSequenceRail, type StopRouteSegment } from "./stop-sequence-rail";

export interface StopSequenceDragHandleProps {
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
}

export type StopSequenceDropIndicatorPosition = "before" | "after";
export type StopSequenceInsertionSlotPlacement = "before" | "after";

interface StopSequenceItemProps {
  itemId: string;
  sequence: number;
  label: string;
  isFirst: boolean;
  isLast: boolean;
  isSelected: boolean;
  isActive: boolean;
  isReorderEnabled: boolean;
  dropIndicatorPosition?: StopSequenceDropIndicatorPosition | null | undefined;
  routeSegment?: StopRouteSegment | undefined;
  children: (dragHandleProps: StopSequenceDragHandleProps) => ReactNode;
  insertionSlot?: ReactNode;
  insertionSlotPlacement?: StopSequenceInsertionSlotPlacement | undefined;
}

interface StopSequenceItemFrameProps {
  sequence: number;
  label: string;
  isFirst: boolean;
  isLast: boolean;
  isSelected: boolean;
  isActive: boolean;
  isReorderEnabled?: boolean | undefined;
  isDragging?: boolean | undefined;
  routeSegment?: StopRouteSegment | undefined;
  children: ReactNode;
  insertionSlot?: ReactNode;
  insertionSlotPlacement?: StopSequenceInsertionSlotPlacement | undefined;
}

interface StopSequenceItemPreviewProps extends StopSequenceItemFrameProps {
  width: number;
  height: number;
}

export function StopSequenceItem({
  itemId,
  sequence,
  label,
  isFirst,
  isLast,
  isSelected,
  isActive,
  isReorderEnabled,
  dropIndicatorPosition,
  routeSegment,
  children,
  insertionSlot,
  insertionSlotPlacement = "after"
}: StopSequenceItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: itemId,
    data: {
      type: "itinerary-item"
    },
    disabled: !isReorderEnabled
  });

  return (
    <div
      id={`stop-sequence-item-${itemId}`}
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition
      }}
      className={cn("relative scroll-mt-24", isDragging && "opacity-0")}
    >
      {dropIndicatorPosition ? (
        <StopSequenceDropIndicator position={dropIndicatorPosition} />
      ) : null}
      <StopSequenceItemFrame
        sequence={sequence}
        label={label}
        isFirst={isFirst}
        isLast={isLast}
        isSelected={isSelected}
        isActive={isActive}
        isReorderEnabled={isReorderEnabled}
        isDragging={isDragging}
        routeSegment={routeSegment}
        insertionSlot={insertionSlot}
        insertionSlotPlacement={insertionSlotPlacement}
      >
        {children({
          attributes,
          listeners
        })}
      </StopSequenceItemFrame>
    </div>
  );
}

export function StopSequenceItemPreview({
  width,
  height,
  sequence,
  label,
  isFirst,
  isLast,
  isSelected,
  isActive,
  routeSegment,
  children,
  insertionSlot,
  insertionSlotPlacement = "after"
}: StopSequenceItemPreviewProps) {
  return (
    <div
      className="pointer-events-none overflow-visible rounded-md"
      style={{
        minHeight: height,
        width
      }}
      aria-hidden="true"
    >
      <StopSequenceItemFrame
        sequence={sequence}
        label={label}
        isFirst={isFirst}
        isLast={isLast}
        isSelected={isSelected}
        isActive={isActive}
        isReorderEnabled={false}
        isDragging
        routeSegment={routeSegment}
        insertionSlot={insertionSlot}
        insertionSlotPlacement={insertionSlotPlacement}
      >
        {children}
      </StopSequenceItemFrame>
    </div>
  );
}

function StopSequenceDropIndicator({ position }: { position: StopSequenceDropIndicatorPosition }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute left-0 right-0 z-20 flex items-center gap-2",
        position === "before" ? "-top-1" : "-bottom-1"
      )}
      aria-hidden="true"
    >
      <span className="ml-9 size-2 rounded-sm bg-trip-state-active" />
      <span className="h-0.5 min-w-0 flex-1 rounded-sm bg-trip-state-active" />
    </div>
  );
}

function StopSequenceItemFrame({
  sequence,
  label,
  isFirst,
  isLast,
  isSelected,
  isActive,
  isReorderEnabled = false,
  isDragging = false,
  routeSegment,
  children,
  insertionSlot,
  insertionSlotPlacement = "after"
}: StopSequenceItemFrameProps) {
  return (
    <div
      className="group/stop flex gap-2"
      data-reorder-enabled={isReorderEnabled ? "true" : undefined}
    >
      <StopSequenceRail
        sequence={sequence}
        label={label}
        isFirst={isFirst}
        isLast={isLast}
        isSelected={isSelected}
        isActive={isActive}
        isDragging={isDragging}
        routeSegment={routeSegment}
      />
      <div className={cn("min-w-0 flex-1", routeSegment ? "pt-7" : "pt-1.5")}>
        {insertionSlot && insertionSlotPlacement === "before" ? (
          <div className="mb-1">{insertionSlot}</div>
        ) : null}

        {children}

        {insertionSlot && insertionSlotPlacement === "after" ? (
          <div className="mt-0.5">{insertionSlot}</div>
        ) : null}
      </div>
    </div>
  );
}

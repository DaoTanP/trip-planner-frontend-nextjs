"use client";

import type { DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { tripStateColorClassNames } from "@/theme";

import { StopSequenceRail, type StopRouteSegment } from "./stop-sequence-rail";

export interface StopSequenceDragHandleProps {
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
}

export type StopSequenceDropIndicatorPosition = "before" | "after";

interface StopSequenceItemProps {
  itemId: string;
  sequence: number;
  label: string;
  isFirst: boolean;
  isLast: boolean;
  isSelected: boolean;
  isActive: boolean;
  dropIndicatorPosition?: StopSequenceDropIndicatorPosition | null | undefined;
  routeSegment?: StopRouteSegment | undefined;
  children: (dragHandleProps: StopSequenceDragHandleProps) => ReactNode;
  insertionSlot?: ReactNode;
}

interface StopSequenceItemFrameProps {
  sequence: number;
  label: string;
  isFirst: boolean;
  isLast: boolean;
  isSelected: boolean;
  isActive: boolean;
  isDragging?: boolean | undefined;
  routeSegment?: StopRouteSegment | undefined;
  children: ReactNode;
  insertionSlot?: ReactNode;
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
  dropIndicatorPosition,
  routeSegment,
  children,
  insertionSlot
}: StopSequenceItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: itemId,
    data: {
      type: "itinerary-item"
    }
  });

  return (
    <div
      id={`stop-sequence-item-${itemId}`}
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition
      }}
      className={cn(
        "relative scroll-mt-24",
        dropIndicatorPosition && [
          "before:absolute before:inset-x-0 before:z-10 before:h-0.5",
          dropIndicatorPosition === "before" ? "before:top-0" : "before:bottom-0",
          tripStateColorClassNames.insertionIndicator
        ],
        isDragging && "opacity-0"
      )}
    >
      <StopSequenceItemFrame
        sequence={sequence}
        label={label}
        isFirst={isFirst}
        isLast={isLast}
        isSelected={isSelected}
        isActive={isActive}
        isDragging={isDragging}
        routeSegment={routeSegment}
        insertionSlot={insertionSlot}
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
  insertionSlot
}: StopSequenceItemPreviewProps) {
  return (
    <div
      className="pointer-events-none"
      style={{
        height,
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
        isDragging
        routeSegment={routeSegment}
        insertionSlot={insertionSlot}
      >
        {children}
      </StopSequenceItemFrame>
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
  isDragging = false,
  routeSegment,
  children,
  insertionSlot
}: StopSequenceItemFrameProps) {
  return (
    <div className="flex gap-4">
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
      <div className={cn("min-w-0 flex-1", routeSegment ? "pt-9" : "pt-2")}>
        {children}

        {insertionSlot ? <div className="mt-1">{insertionSlot}</div> : null}
      </div>
    </div>
  );
}

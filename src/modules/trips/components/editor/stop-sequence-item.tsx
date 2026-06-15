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

interface StopSequenceItemProps {
  itemId: string;
  sequence: number;
  label: string;
  isFirst: boolean;
  isLast: boolean;
  isSelected: boolean;
  isActive: boolean;
  isOver: boolean;
  routeSegment?: StopRouteSegment | undefined;
  children: (dragHandleProps: StopSequenceDragHandleProps) => ReactNode;
  insertionSlot?: ReactNode;
}

export function StopSequenceItem({
  itemId,
  sequence,
  label,
  isFirst,
  isLast,
  isSelected,
  isActive,
  isOver,
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
        "scroll-mt-24",
        isOver && "border-t-2 border-primary pt-2",
        isDragging && "relative z-20 opacity-80"
      )}
    >
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
          {children({
            attributes,
            listeners
          })}

          {insertionSlot ? <div className="mt-1">{insertionSlot}</div> : null}
        </div>
      </div>
    </div>
  );
}

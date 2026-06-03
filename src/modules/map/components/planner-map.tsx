"use client";

import { MapPinPlus } from "lucide-react";
import { useTranslations } from "next-intl";

import { MapCanvas } from "@/modules/map/components/map-canvas";
import type { TripMapProps } from "@/modules/map/types/map.types";

export function PlannerMap(props: TripMapProps) {
  const t = useTranslations("trip.editor.map");

  return (
    <div className="relative">
      <MapCanvas {...props} />
      {props.markers.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center p-6">
          <div className="flex max-w-64 items-center gap-2 rounded-md bg-background/90 px-3 py-2 text-sm text-muted-foreground shadow-sm">
            <MapPinPlus className="size-4 shrink-0" aria-hidden="true" />
            <span>{t("empty")}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

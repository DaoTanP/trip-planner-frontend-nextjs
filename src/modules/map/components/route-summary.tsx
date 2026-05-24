"use client";

import { Route } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import type { MapRoute } from "@/modules/map/types/map.types";

interface RouteSummaryProps {
  route?: MapRoute | undefined;
}

export function RouteSummary({ route }: RouteSummaryProps) {
  const locale = useLocale();
  const t = useTranslations("trip.editor.map");

  if (!route || route.distanceMeters === null || route.durationSeconds === null) {
    return null;
  }

  const kilometers = route.distanceMeters / 1000;
  const distance = t("routeDistanceKilometers", {
    kilometers: new Intl.NumberFormat(locale, {
      maximumFractionDigits: kilometers >= 10 ? 0 : 1,
      minimumFractionDigits: kilometers >= 10 ? 0 : 1
    }).format(kilometers)
  });
  const duration = t("routeDurationMinutes", {
    minutes: Math.max(1, Math.round(route.durationSeconds / 60))
  });

  return (
    <div className="absolute bottom-3 right-3 z-30 inline-flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-md bg-background/90 px-2 py-1 text-xs text-muted-foreground shadow-sm">
      <Route className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate">{t("routeSummary", { distance, duration })}</span>
    </div>
  );
}

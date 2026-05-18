import { useTranslations } from "next-intl";

import { EmptyState } from "@/components/shared/empty-state";

import type { ItineraryStop } from "../types/itinerary.types";

interface ItineraryTimelineProps {
  stops: ItineraryStop[];
}

export function ItineraryTimeline({ stops }: ItineraryTimelineProps) {
  const t = useTranslations("itinerary");

  if (stops.length === 0) {
    return <EmptyState title={t("empty.title")} description={t("empty.description")} />;
  }

  return (
    <ol className="grid gap-3">
      {stops.map((stop) => (
        <li key={stop.id} className="rounded-md border bg-card p-4">
          <p className="text-sm font-medium">{t("stop.notes")}</p>
          {stop.notes ? <p className="mt-1 text-sm text-muted-foreground">{stop.notes}</p> : null}
        </li>
      ))}
    </ol>
  );
}

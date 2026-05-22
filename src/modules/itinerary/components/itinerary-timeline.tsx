import { useTranslations } from "next-intl";

import { EmptyState } from "@/components/shared/empty-state";

import type { ItineraryItem } from "../types/itinerary.types";

interface ItineraryTimelineProps {
  items: ItineraryItem[];
}

export function ItineraryTimeline({ items }: ItineraryTimelineProps) {
  const t = useTranslations("itinerary");

  if (items.length === 0) {
    return <EmptyState title={t("empty.title")} description={t("empty.description")} />;
  }

  return (
    <ol className="grid gap-3">
      {items.map((item) => (
        <li key={item.id} className="rounded-md border bg-card p-4">
          <p className="text-sm font-medium">{item.title}</p>
          {item.description ? (
            <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

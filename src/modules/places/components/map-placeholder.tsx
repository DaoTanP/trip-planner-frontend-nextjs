import { Map } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

interface MapPlaceholderProps {
  className?: string;
}

export function MapPlaceholder({ className }: MapPlaceholderProps) {
  const t = useTranslations("itinerary");

  return (
    <div
      className={cn(
        "flex aspect-[16/10] min-h-72 items-center justify-center rounded-md border bg-secondary/40 text-muted-foreground",
        className
      )}
      role="img"
      aria-label={t("map.label")}
    >
      <div className="flex flex-col items-center gap-2 text-sm">
        <Map className="size-8" aria-hidden="true" />
        <span>{t("map.placeholder")}</span>
      </div>
    </div>
  );
}

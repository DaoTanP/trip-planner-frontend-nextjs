"use client";

import { CalendarDays, MapPin, Trash2, Users } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { useDeleteTripMutation } from "../mutations/use-delete-trip-mutation";
import type { Trip } from "../types/trip.types";

interface TripCardProps {
  trip: Trip;
}

export function TripCard({ trip }: TripCardProps) {
  const t = useTranslations("trip");
  const format = useFormatter();
  const deleteMutation = useDeleteTripMutation();
  const startDate = trip.startDate ? format.dateTime(new Date(trip.startDate), "tripDate") : null;
  const endDate = trip.endDate ? format.dateTime(new Date(trip.endDate), "tripDate") : null;
  const destinations =
    trip.destinationNames.length > 0 ? trip.destinationNames.join(", ") : t("card.noDestinations");

  return (
    <article className="grid gap-4 rounded-md border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h2 className="truncate text-base font-semibold">{trip.title}</h2>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-4" aria-hidden="true" />
            {destinations}
          </p>
        </div>
        <Badge variant={trip.status === "COMPLETED" ? "success" : "secondary"}>
          {t(`status.${trip.status}`)}
        </Badge>
      </div>

      <div className="grid gap-2 text-sm text-muted-foreground">
        <p className="flex items-center gap-2">
          <CalendarDays className="size-4" aria-hidden="true" />
          {startDate && endDate ? t("card.dateRange", { startDate, endDate }) : t("card.noDates")}
        </p>
        <p className="flex items-center gap-2">
          <Users className="size-4" aria-hidden="true" />
          {t("card.collaborators", { count: trip.collaboratorCount })}
        </p>
        <p>{t("card.days", { count: trip.itineraryDayCount })}</p>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="justify-self-end"
        disabled={deleteMutation.isPending}
        onClick={() => deleteMutation.mutate(trip.id)}
      >
        <Trash2 aria-hidden="true" />
        {t("delete")}
      </Button>
    </article>
  );
}

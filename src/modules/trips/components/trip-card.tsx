"use client";

import {
  CalendarRange,
  CircleDollarSign,
  MapPinned,
  MessageSquare,
  Pencil,
  Trash2,
  Users
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { routes } from "@/constants/routes";
import { Link } from "@/i18n/routing";

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

  return (
    <article className="grid gap-4 rounded-md border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h2 className="truncate text-base font-semibold">{trip.title}</h2>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPinned className="size-4" aria-hidden="true" />
            {t("card.items", { count: trip.itineraryItemCount })}
          </p>
        </div>
        <Badge variant={trip.status === "COMPLETED" ? "success" : "secondary"}>
          {t(`status.${trip.status}`)}
        </Badge>
      </div>

      <div className="grid gap-2 text-sm text-muted-foreground">
        <p className="flex items-center gap-2">
          <CalendarRange className="size-4" aria-hidden="true" />
          {startDate && endDate ? t("card.dateRange", { startDate, endDate }) : t("card.noDates")}
        </p>
        <p className="flex items-center gap-2">
          <Users className="size-4" aria-hidden="true" />
          {t("card.collaborators", { count: trip.collaboratorCount })}
        </p>
        <p className="flex items-center gap-2">
          <MessageSquare className="size-4" aria-hidden="true" />
          {t("card.notes", { count: trip.noteCount })}
        </p>
        <p className="flex items-center gap-2">
          <CircleDollarSign className="size-4" aria-hidden="true" />
          {t("card.expenses", { count: trip.expenseCount })}
        </p>
      </div>

      <div className="flex justify-end gap-2">
        <Button asChild variant="secondary" size="sm">
          <Link href={routes.tripEdit(trip.id)}>
            <Pencil aria-hidden="true" />
            {t("edit")}
          </Link>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={deleteMutation.isPending}
          onClick={() => deleteMutation.mutate(trip.id)}
        >
          <Trash2 aria-hidden="true" />
          {t("delete")}
        </Button>
      </div>
    </article>
  );
}

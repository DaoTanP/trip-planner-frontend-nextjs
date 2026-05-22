"use client";

import { CalendarDays, ImageIcon, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useUpdateTripMutation } from "../../mutations/use-trip-editor-mutations";
import type { TripDetail } from "../../types/trip.types";

interface TripEditorHeaderProps {
  trip: TripDetail;
}

export function TripEditorHeader({ trip }: TripEditorHeaderProps) {
  const t = useTranslations("trip.editor");
  const updateTrip = useUpdateTripMutation(trip.id);
  const [title, setTitle] = useState(trip.title);
  const [description, setDescription] = useState(trip.description ?? "");
  const [startDate, setStartDate] = useState(trip.startDate ?? "");
  const [endDate, setEndDate] = useState(trip.endDate ?? "");

  const isDirty =
    title !== trip.title ||
    description !== (trip.description ?? "") ||
    startDate !== (trip.startDate ?? "") ||
    endDate !== (trip.endDate ?? "");

  return (
    <section className="overflow-hidden rounded-md border bg-card shadow-sm">
      <div className="relative h-36 bg-secondary sm:h-44">
        {trip.coverImageUrl ? (
          // Cover URLs may come from several storage/providers; keep rendering provider-neutral for now.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={trip.coverImageUrl}
            alt=""
            className="size-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <ImageIcon className="size-10" aria-hidden="true" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background/90 to-transparent" />
      </div>

      <div className="grid gap-4 p-4">
        <div className="grid gap-2">
          <Label htmlFor="trip-title">{t("titleLabel")}</Label>
          <Input
            id="trip-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t("titlePlaceholder")}
            className="h-12 text-lg font-semibold"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="trip-description">{t("descriptionLabel")}</Label>
          <textarea
            id="trip-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={t("descriptionPlaceholder")}
            className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="grid gap-2">
            <Label htmlFor="trip-start-date">{t("startDateLabel")}</Label>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="trip-start-date"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="trip-end-date">{t("endDateLabel")}</Label>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="trip-end-date"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <Button
            type="button"
            disabled={!isDirty || updateTrip.isPending || title.trim().length < 2}
            onClick={() =>
              updateTrip.mutate({
                title: title.trim(),
                description: description.trim() || null,
                startDate: startDate || null,
                endDate: endDate || null
              })
            }
          >
            <Save aria-hidden="true" />
            {updateTrip.isPending ? t("saving") : t("save")}
          </Button>
        </div>
      </div>
    </section>
  );
}

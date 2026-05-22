"use client";

import { MapPin, Plus, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { placeSearchQueryOptions } from "@/modules/places/queries/place.queries";
import { useCreateItineraryItemMutation } from "@/modules/itinerary/mutations/use-itinerary-mutations";

import type { TripDay } from "../../types/trip.types";

interface PlaceSearchBoxProps {
  tripId: string;
  days: TripDay[];
}

export function PlaceSearchBox({ tripId, days }: PlaceSearchBoxProps) {
  const t = useTranslations("trip.editor.placeSearch");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [dayId, setDayId] = useState(days[0]?.id ?? "");
  const createItem = useCreateItineraryItemMutation(tripId);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);

    return () => window.clearTimeout(timeout);
  }, [query]);

  const searchParams = useMemo(() => ({ q: debouncedQuery, limit: 8 }), [debouncedQuery]);
  const placesQuery = useQuery(placeSearchQueryOptions(searchParams));
  const selectedDayId = days.some((day) => day.id === dayId) ? dayId : (days[0]?.id ?? "");

  return (
    <section className="rounded-md border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Search className="size-4" aria-hidden="true" />
        {t("title")}
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("placeholder")}
            className="pl-9"
          />
        </div>
        <select
          value={selectedDayId}
          onChange={(event) => setDayId(event.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          {days.map((day, index) => (
            <option key={day.id} value={day.id}>
              {day.title || t("dayFallback", { number: index + 1 })}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 grid gap-2">
        {placesQuery.isFetching ? (
          <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            {t("loading")}
          </div>
        ) : null}

        {placesQuery.data?.map((place) => (
          <article
            key={place.id}
            className="flex items-center justify-between gap-3 rounded-md border bg-background p-3"
          >
            <div className="min-w-0">
              <h3 className="truncate text-sm font-medium">{place.name}</h3>
              <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                <MapPin className="size-3" aria-hidden="true" />
                {place.formattedAddress ?? t("noAddress")}
              </p>
            </div>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              aria-label={t("addPlace", { name: place.name })}
              disabled={!selectedDayId || createItem.isPending}
              onClick={() => {
                const payload = {
                  placeId: place.id,
                  title: place.name,
                  order:
                    (days.find((day) => day.id === selectedDayId)?.items.length ?? 0) * 1024 + 1024
                };

                createItem.mutate({
                  dayId: selectedDayId,
                  payload: place.formattedAddress
                    ? { ...payload, description: place.formattedAddress }
                    : payload
                });
              }}
            >
              <Plus aria-hidden="true" />
            </Button>
          </article>
        ))}

        {debouncedQuery && placesQuery.data?.length === 0 && !placesQuery.isFetching ? (
          <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t("empty")}</div>
        ) : null}
      </div>
    </section>
  );
}

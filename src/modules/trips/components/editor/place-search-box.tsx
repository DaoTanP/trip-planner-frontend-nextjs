"use client";

import { MapPin, Plus, Search, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCreateItineraryItemMutation } from "@/modules/itinerary/mutations/use-itinerary-mutations";
import type { ItineraryItem } from "@/modules/itinerary/types/itinerary.types";
import { useCreatePlaceFromDetailsMutation } from "@/modules/places/mutations/use-place-mutations";
import {
  placeDetailQueryOptions,
  placeSearchQueryOptions
} from "@/modules/places/queries/place.queries";
import type { PlaceSearchResult } from "@/modules/places/types/place.types";
import { usePlannerStore } from "@/stores/use-planner-store";

import { orderStride } from "../../utils/trip-editor.utils";

interface PlaceSearchBoxProps {
  tripId: string;
  items: ItineraryItem[];
}

export function PlaceSearchBox({ tripId, items }: PlaceSearchBoxProps) {
  const locale = useLocale();
  const t = useTranslations("trip.editor.placeSearch");
  const queryClient = useQueryClient();
  const isOpen = usePlannerStore((state) => state.isPlaceSearchOpen);
  const setPlaceSearchOpen = usePlannerStore((state) => state.setPlaceSearchOpen);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [pendingPlaceId, setPendingPlaceId] = useState<string | undefined>();
  const createPlace = useCreatePlaceFromDetailsMutation();
  const createItem = useCreateItineraryItemMutation(tripId);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);

    return () => window.clearTimeout(timeout);
  }, [query]);

  const searchParams = useMemo(
    () => ({ q: debouncedQuery, limit: 8, language: locale }),
    [debouncedQuery, locale]
  );
  const placesQuery = useQuery(placeSearchQueryOptions(searchParams));
  const isAddingPlace = Boolean(pendingPlaceId) || createPlace.isPending || createItem.isPending;

  async function handleAddPlace(place: PlaceSearchResult) {
    setPendingPlaceId(place.id);

    try {
      const details = await queryClient.fetchQuery(
        placeDetailQueryOptions({
          placeId: place.providerPlaceId ?? place.id,
          provider: place.provider,
          storedPlaceId: place.storedPlaceId,
          language: locale
        })
      );
      const storedPlace = await createPlace.mutateAsync(details);
      const payload = {
        placeId: storedPlace.id,
        title: storedPlace.name,
        type: "PLACE" as const,
        clientMutationId: crypto.randomUUID(),
        sortOrder: items.length * orderStride + orderStride
      };

      createItem.mutate(
        storedPlace.formattedAddress
          ? { ...payload, description: storedPlace.formattedAddress }
          : payload
      );
      setPlaceSearchOpen(false);
      setQuery("");
    } catch {
      toast.error(t("addError"));
    } finally {
      setPendingPlaceId(undefined);
    }
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 bg-background/50 backdrop-blur-sm transition-opacity",
        isOpen ? "opacity-100" : "pointer-events-none opacity-0"
      )}
      aria-hidden={!isOpen}
    >
      <section
        className={cn(
          "absolute right-0 top-0 grid h-dvh w-full max-w-lg grid-rows-[auto_1fr] border-l bg-card shadow-xl transition-transform sm:w-[28rem]",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        aria-label={t("title")}
      >
        <div className="flex h-14 items-center justify-between gap-3 border-b px-4">
          <div className="flex min-w-0 items-center gap-2 text-sm font-semibold">
            <Search className="size-4" aria-hidden="true" />
            <span className="truncate">{t("title")}</span>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={t("close")}
            onClick={() => setPlaceSearchOpen(false)}
          >
            <X aria-hidden="true" />
          </Button>
        </div>

        <div className="min-h-0 overflow-y-auto p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("placeholder")}
              className="pl-9"
              autoFocus={isOpen}
            />
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
                  disabled={isAddingPlace}
                  onClick={() => void handleAddPlace(place)}
                >
                  <Plus aria-hidden="true" />
                </Button>
              </article>
            ))}

            {debouncedQuery && placesQuery.data?.length === 0 && !placesQuery.isFetching ? (
              <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                {t("empty")}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <button
        type="button"
        className="absolute inset-0 -z-10 cursor-default"
        aria-label={t("close")}
        onClick={() => setPlaceSearchOpen(false)}
      />
    </div>
  );
}

"use client";

import { MapPin, Plus, Search, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCreatePlaceFromDetailsMutation } from "@/modules/places/mutations/use-place-mutations";
import {
  placeDetailQueryOptions,
  placeSearchQueryOptions
} from "@/modules/places/queries/place.queries";
import type { PlaceSearchResult } from "@/modules/places/types/place.types";
import type { PlaceDto } from "@/services/api/contracts";

interface PlaceSearchBoxProps {
  title?: string | undefined;
  placeholder?: string | undefined;
  className?: string | undefined;
  autoFocus?: boolean | undefined;
  actionLabel?: ((place: PlaceSearchResult) => string) | undefined;
  onClose?: (() => void) | undefined;
  onPlaceSelected: (place: PlaceDto) => Promise<void> | void;
}

export function PlaceSearchBox({
  title,
  placeholder,
  className,
  autoFocus = true,
  actionLabel,
  onClose,
  onPlaceSelected
}: PlaceSearchBoxProps) {
  const locale = useLocale();
  const t = useTranslations("trip.editor.placeSearch");
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [pendingPlaceId, setPendingPlaceId] = useState<string | undefined>();
  const [isSelectingPlace, setIsSelectingPlace] = useState(false);
  const createPlace = useCreatePlaceFromDetailsMutation();

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);

    return () => window.clearTimeout(timeout);
  }, [query]);

  const searchParams = useMemo(
    () => ({ q: debouncedQuery, limit: 8, language: locale }),
    [debouncedQuery, locale]
  );
  const placesQuery = useQuery(placeSearchQueryOptions(searchParams));
  const isAddingPlace = Boolean(pendingPlaceId) || createPlace.isPending || isSelectingPlace;

  async function handleAddPlace(place: PlaceSearchResult) {
    setPendingPlaceId(place.id);
    setIsSelectingPlace(true);

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
      await onPlaceSelected(storedPlace);
      setQuery("");
      onClose?.();
    } catch {
      toast.error(t("addError"));
    } finally {
      setPendingPlaceId(undefined);
      setIsSelectingPlace(false);
    }
  }

  return (
    <section
      className={cn("grid gap-3 rounded-md border bg-card p-3 shadow-sm", className)}
      aria-label={title ?? t("title")}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <Search className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{title ?? t("title")}</span>
        </div>
        {onClose ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8"
            aria-label={t("close")}
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </Button>
        ) : null}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder ?? t("placeholder")}
          className="pl-9"
          autoFocus={autoFocus}
        />
      </div>

      <div className="grid gap-2">
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
                <MapPin className="size-3 shrink-0" aria-hidden="true" />
                {place.formattedAddress ?? t("noAddress")}
              </p>
            </div>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              aria-label={actionLabel?.(place) ?? t("addPlace", { name: place.name })}
              disabled={isAddingPlace}
              onClick={() => void handleAddPlace(place)}
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

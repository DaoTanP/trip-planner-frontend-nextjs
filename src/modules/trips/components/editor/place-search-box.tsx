"use client";

import { MapPin, Plus, Search, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  upsertTripPlaceInCache,
  useResolvePlaceMutation
} from "@/modules/places/mutations/use-place-mutations";
import {
  placeKeys,
  placeDetailQueryOptions,
  providerPlaceSearchQueryOptions
} from "@/modules/places/queries/place.queries";
import type { PlaceSearchResult, ResolvablePlaceInput } from "@/modules/places/types/place.types";
import type { PlaceDto } from "@/services/api/contracts";

interface PlaceSearchBoxProps {
  title?: string | undefined;
  tripId?: string | undefined;
  placeholder?: string | undefined;
  className?: string | undefined;
  autoFocus?: boolean | undefined;
  actionLabel?: ((place: PlaceSearchResult) => string) | undefined;
  onClose?: (() => void) | undefined;
  onPlaceSelected: (place: PlaceDto) => Promise<void> | void;
}

export function PlaceSearchBox({
  title,
  tripId,
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
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [pendingPlaceId, setPendingPlaceId] = useState<string | undefined>();
  const [isSelectingPlace, setIsSelectingPlace] = useState(false);
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const selectionLockRef = useRef(false);
  const resolvePlace = useResolvePlaceMutation();

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);

    return () => window.clearTimeout(timeout);
  }, [query]);

  const searchParams = useMemo(
    () => ({ q: debouncedQuery, limit: 8, language: locale }),
    [debouncedQuery, locale]
  );
  const placesQuery = useQuery(providerPlaceSearchQueryOptions(searchParams));
  const isAddingPlace = Boolean(pendingPlaceId) || resolvePlace.isPending || isSelectingPlace;
  const results = placesQuery.data ?? [];
  const hasResults = results.length > 0;
  const listboxId = `${searchId}-results`;
  const activeOptionId =
    hasResults && results[activeResultIndex]
      ? `${searchId}-result-${activeResultIndex}`
      : undefined;

  async function handleAddPlace(place: PlaceSearchResult) {
    if (selectionLockRef.current) {
      return;
    }

    selectionLockRef.current = true;
    setPendingPlaceId(place.id);
    setIsSelectingPlace(true);

    try {
      const input: ResolvablePlaceInput =
        place.provider === "google" && !place.storedPlaceId
          ? await queryClient.fetchQuery(
              placeDetailQueryOptions({
                placeId: place.providerPlaceId ?? place.id,
                provider: place.provider,
                language: locale
              })
            )
          : place;
      const storedPlace = await resolvePlace.mutateAsync(input);
      await onPlaceSelected(storedPlace);
      if (tripId) {
        upsertTripPlaceInCache(queryClient, tripId, storedPlace);
      }
      setQuery("");
      onClose?.();
    } catch {
      if (tripId) {
        void queryClient.invalidateQueries({ queryKey: placeKeys.byTrip(tripId) });
      }
      toast.error(t("addError"));
    } finally {
      selectionLockRef.current = false;
      setPendingPlaceId(undefined);
      setIsSelectingPlace(false);
    }
  }

  async function handleAddManualPlace() {
    const name = debouncedQuery.trim();

    if (!name || selectionLockRef.current) {
      return;
    }

    selectionLockRef.current = true;
    setPendingPlaceId(`manual:${name}`);
    setIsSelectingPlace(true);

    try {
      const storedPlace = await resolvePlace.mutateAsync({
        provider: "MANUAL",
        source: "MANUAL",
        name
      });
      await onPlaceSelected(storedPlace);
      if (tripId) {
        upsertTripPlaceInCache(queryClient, tripId, storedPlace);
      }
      setQuery("");
      onClose?.();
    } catch {
      if (tripId) {
        void queryClient.invalidateQueries({ queryKey: placeKeys.byTrip(tripId) });
      }
      toast.error(t("addError"));
    } finally {
      selectionLockRef.current = false;
      setPendingPlaceId(undefined);
      setIsSelectingPlace(false);
    }
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      if (onClose) {
        onClose();
      } else {
        setQuery("");
      }
      return;
    }

    if (!hasResults) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveResultIndex((current) => (current + 1) % results.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveResultIndex((current) => (current - 1 + results.length) % results.length);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const activePlace = results[activeResultIndex];
      if (activePlace && !isAddingPlace) {
        void handleAddPlace(activePlace);
      }
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
          onChange={(event) => {
            setActiveResultIndex(0);
            setQuery(event.target.value);
          }}
          onKeyDown={handleSearchKeyDown}
          placeholder={placeholder ?? t("placeholder")}
          className="pl-9"
          autoFocus={autoFocus}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={hasResults}
          aria-controls={listboxId}
          aria-activedescendant={activeOptionId}
        />
      </div>

      <div className="grid gap-2" id={listboxId} role="listbox">
        {placesQuery.isFetching ? (
          <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            {t("loading")}
          </div>
        ) : null}

        {placesQuery.isError ? (
          <div className="grid gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <span>{t("error")}</span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-fit"
              onClick={() => void placesQuery.refetch()}
            >
              {t("retry")}
            </Button>
          </div>
        ) : null}

        {results.map((place, index) => {
          const isActive = index === activeResultIndex;

          return (
            <article
              key={place.id}
              id={`${searchId}-result-${index}`}
              role="option"
              aria-selected={isActive}
              className={cn(
                "flex items-center justify-between gap-3 rounded-md border bg-background p-3",
                isActive && "border-primary ring-1 ring-primary/30"
              )}
              onMouseEnter={() => setActiveResultIndex(index)}
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
          );
        })}

        {debouncedQuery &&
        results.length === 0 &&
        !placesQuery.isFetching &&
        !placesQuery.isError ? (
          <div className="grid gap-2 rounded-md bg-muted p-3 text-sm text-muted-foreground">
            <span>{t("empty")}</span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-fit"
              disabled={isAddingPlace}
              onClick={() => void handleAddManualPlace()}
            >
              <Plus aria-hidden="true" />
              {t("addManual", { name: debouncedQuery })}
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

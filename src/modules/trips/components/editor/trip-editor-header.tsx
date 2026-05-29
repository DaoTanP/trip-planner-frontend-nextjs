"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ImageIcon,
  MapPin,
  MessageSquare,
  Route,
  Save,
  Search,
  Share2,
  Users,
  WalletCards,
  Wifi
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePlannerStore } from "@/stores/use-planner-store";

import { useUpdateTripMutation } from "../../mutations/use-trip-editor-mutations";
import type { TripDetail } from "../../types/trip.types";
import type { CollaboratorPresence, PlannerStats } from "../../utils/planner-workspace.utils";

interface TripEditorHeaderProps {
  trip: TripDetail;
  stats: PlannerStats;
  collaborators: CollaboratorPresence[];
  syncSummary: {
    latestRevision: string;
    pendingCount: number;
    conflictCount: number;
  };
}

export function TripEditorHeader({
  trip,
  stats,
  collaborators,
  syncSummary
}: TripEditorHeaderProps) {
  const locale = useLocale();
  const t = useTranslations("trip.editor");
  const updateTrip = useUpdateTripMutation(trip.id);
  const setPlaceSearchOpen = usePlannerStore((state) => state.setPlaceSearchOpen);
  const setCommandPaletteOpen = usePlannerStore((state) => state.setCommandPaletteOpen);
  const [title, setTitle] = useState(trip.title);
  const [description, setDescription] = useState(trip.description ?? "");

  useEffect(() => {
    setTitle(trip.title);
    setDescription(trip.description ?? "");
  }, [trip.description, trip.title, trip.version]);

  const isDirty = title !== trip.title || description !== (trip.description ?? "");
  const lastEdited = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date(trip.updatedAt)),
    [locale, trip.updatedAt]
  );
  const derivedDateRange = useMemo(
    () => formatDerivedDateRange(stats, locale) ?? t("header.noDerivedDates"),
    [locale, stats, t]
  );

  const distance = t("header.distanceKilometers", {
    value: formatDistance(stats.totalRouteDistanceMeters, locale)
  });
  const travelTime = t("header.durationMinutes", {
    count: Math.max(0, Math.round(stats.totalRouteDurationSeconds / 60))
  });
  const totalExpenses = formatMoney(stats.totalExpenses, stats.expenseCurrency, locale);
  const status = getSyncStatus(syncSummary.pendingCount, syncSummary.conflictCount);

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success(t("header.shareCopied"));
    } catch {
      toast.error(t("header.shareFailed"));
    }
  }

  return (
    <section className="overflow-hidden rounded-md border bg-card shadow-sm">
      <div className="relative h-28 bg-muted sm:h-32">
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
            <ImageIcon className="size-8" aria-hidden="true" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent" />
      </div>

      <div className="grid gap-3 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
          <div className="min-w-0">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              aria-label={t("titleLabel")}
              placeholder={t("titlePlaceholder")}
              className="w-full rounded-sm bg-transparent text-xl font-semibold outline-none focus-visible:bg-muted sm:text-2xl"
            />
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              aria-label={t("descriptionLabel")}
              placeholder={t("descriptionPlaceholder")}
              className="mt-1 min-h-12 w-full resize-none rounded-sm bg-transparent text-sm text-muted-foreground outline-none focus-visible:bg-muted"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setPlaceSearchOpen(true)}
            >
              <Search aria-hidden="true" />
              {t("header.search")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCommandPaletteOpen(true)}
            >
              {t("header.quickAdd")}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => void handleShare()}>
              <Share2 aria-hidden="true" />
              {t("header.share")}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!isDirty || updateTrip.isPending || title.trim().length < 2}
              onClick={() =>
                updateTrip.mutate({
                  title: title.trim(),
                  description: description.trim() || null
                })
              }
            >
              <Save aria-hidden="true" />
              {updateTrip.isPending ? t("saving") : t("save")}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1">
            <Clock3 className="size-3" aria-hidden="true" />
            {derivedDateRange}
          </span>
          <span className="rounded-md bg-muted px-2 py-1">{trip.timezone}</span>
          <span className="rounded-md bg-muted px-2 py-1">
            {t("header.lastEdited", { value: lastEdited })}
          </span>
          <span className="rounded-md bg-muted px-2 py-1">
            {t("header.revision", { value: syncSummary.latestRevision })}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-1",
              status === "conflict"
                ? "bg-destructive/10 text-destructive"
                : status === "syncing"
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-accent text-accent-foreground"
            )}
          >
            {status === "conflict" ? (
              <AlertTriangle className="size-3" aria-hidden="true" />
            ) : status === "syncing" ? (
              <Wifi className="size-3" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="size-3" aria-hidden="true" />
            )}
            {t(`header.sync.${status}`, { count: syncSummary.pendingCount })}
          </span>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
          <HeaderStat icon={Route} label={t("header.stats.itinerary")} value={stats.itineraryCount} />
          <HeaderStat icon={MapPin} label={t("header.stats.places")} value={stats.placeCount} />
          <HeaderStat icon={Route} label={t("header.stats.distance")} value={distance} />
          <HeaderStat icon={Clock3} label={t("header.stats.travelTime")} value={travelTime} />
          <HeaderStat icon={MessageSquare} label={t("header.stats.notes")} value={stats.noteCount} />
          <HeaderStat icon={WalletCards} label={t("header.stats.expenses")} value={totalExpenses} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <div className="flex min-w-0 items-center gap-2">
            <Users className="size-4 text-muted-foreground" aria-hidden="true" />
            <div className="flex -space-x-2">
              {collaborators.length > 0 ? (
                collaborators.map((collaborator) => (
                  <span
                    key={collaborator.id}
                    className="flex size-8 items-center justify-center overflow-hidden rounded-full border-2 border-card bg-muted text-xs font-semibold"
                    title={collaborator.name}
                  >
                    {collaborator.avatarUrl ? (
                      // Avatar URLs are provider/user supplied and can be remote.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={collaborator.avatarUrl}
                        alt=""
                        className="size-full object-cover"
                        draggable={false}
                      />
                    ) : (
                      initials(collaborator.name)
                    )}
                  </span>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">{t("header.noCollaborators")}</span>
              )}
            </div>
          </div>
          <span className="text-xs text-muted-foreground">
            {t("header.collaboratorCount", { count: collaborators.length })}
          </span>
        </div>
      </div>
    </section>
  );
}

function HeaderStat({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Route;
  label: string;
  value: string | number;
}) {
  return (
    <div className="grid min-h-16 grid-cols-[auto_1fr] items-center gap-2 rounded-md border bg-background px-3 py-2">
      <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0">
        <p className="truncate text-[0.7rem] uppercase text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

function formatDerivedDateRange(stats: PlannerStats, locale: string) {
  if (!stats.derivedStartDate && !stats.derivedEndDate) {
    return null;
  }

  const formatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const start = stats.derivedStartDate ? formatter.format(new Date(stats.derivedStartDate)) : null;
  const end = stats.derivedEndDate ? formatter.format(new Date(stats.derivedEndDate)) : start;

  return start === end || !end ? start : `${start} - ${end}`;
}

function formatDistance(meters: number, locale: string) {
  const kilometers = meters / 1000;

  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: kilometers >= 10 ? 0 : 1
  }).format(kilometers);
}

function formatMoney(amount: number, currency: string | null, locale: string) {
  if (!currency) {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(amount);
  }

  return new Intl.NumberFormat(locale, {
    currency,
    maximumFractionDigits: 0,
    style: "currency"
  }).format(amount);
}

function getSyncStatus(pendingCount: number, conflictCount: number) {
  if (conflictCount > 0) {
    return "conflict";
  }

  return pendingCount > 0 ? "syncing" : "synced";
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

"use client";

import { CalendarRange, Save, Search, Share2, SlidersHorizontal } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PresenceAvatarStack } from "@/modules/collaboration/components/presence-avatar-stack";
import { useUniquePresenceUsers } from "@/modules/collaboration/hooks/use-presence";
import type { PresenceEntry } from "@/modules/collaboration/types/presence.types";
import { usePlannerStore } from "@/stores/use-planner-store";
import { statusColorClassNames } from "@/theme";

import { useUpdateTripMutation } from "../../mutations/use-trip-editor-mutations";
import type { TripDetail } from "../../types/trip.types";
import type { PlannerStats } from "../../utils/planner-workspace.utils";

interface TripEditorHeaderProps {
  trip: TripDetail;
  stats: PlannerStats;
  presenceEntries?: PresenceEntry[] | undefined;
}

export function TripEditorHeader({ trip, stats, presenceEntries = [] }: TripEditorHeaderProps) {
  const locale = useLocale();
  const t = useTranslations("trip.editor");
  const statusT = useTranslations("trip.status");
  const visibilityT = useTranslations("trip.visibility");
  const updateTrip = useUpdateTripMutation(trip.id);
  const isFilterBarOpen = usePlannerStore((state) => state.isFilterBarOpen);
  const setFilterBarOpen = usePlannerStore((state) => state.setFilterBarOpen);
  const [draft, setDraft] = useState(() => ({
    version: trip.version,
    title: trip.title
  }));
  const activePresence = useUniquePresenceUsers(presenceEntries);
  const title = draft.version === trip.version ? draft.title : trip.title;
  const isDirty = title !== trip.title;
  const derivedDateRange = useMemo(
    () => formatDerivedDateRange(stats, locale) ?? t("header.noDerivedDates"),
    [locale, stats, t]
  );
  const summaryParts = useMemo(
    () => [
      t("header.summary.stops", { count: stats.itineraryCount }),
      t("header.summary.places", { count: stats.placeCount }),
      t("header.summary.notes", { count: stats.noteCount }),
      t("header.summary.distance", {
        value: formatDistance(stats.totalRouteDistanceMeters, locale)
      }),
      t("header.summary.expenses", {
        value: formatMoney(stats.totalExpenses, stats.expenseCurrency, locale)
      }),
      formatBudgetSummary(stats, locale, t)
    ],
    [locale, stats, t]
  );

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success(t("header.shareCopied"));
    } catch {
      toast.error(t("header.shareFailed"));
    }
  }

  return (
    <section className="rounded-md border bg-card px-3 py-3 shadow-sm">
      <div className="grid gap-3 xl:grid-cols-[1fr_auto] xl:items-center">
        <div className="min-w-0">
          <input
            value={title}
            onChange={(event) =>
              setDraft({
                version: trip.version,
                title: event.target.value
              })
            }
            aria-label={t("titleLabel")}
            placeholder={t("titlePlaceholder")}
            className="w-full rounded-sm bg-transparent text-lg font-semibold outline-none focus-visible:bg-muted sm:text-xl"
          />
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex min-w-0 items-center gap-1">
              <CalendarRange className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{derivedDateRange}</span>
            </span>
            <span
              className={cn(
                "rounded-md border px-2 py-0.5",
                statusColorClassNames.trip[trip.status]
              )}
            >
              {statusT(trip.status)}
            </span>
            <span
              className={cn(
                "rounded-md border px-2 py-0.5",
                statusColorClassNames.visibility[trip.visibility]
              )}
            >
              {visibilityT(trip.visibility)}
            </span>
            <span className="min-w-0 truncate">{summaryParts.join(" / ")}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          {activePresence.length > 0 ? (
            <div className="flex min-w-0 items-center gap-2 rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground">
              <PresenceAvatarStack entries={activePresence} />
              <span className="max-w-48 truncate">{formatHeaderPresence(activePresence, t)}</span>
            </div>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setFilterBarOpen(true)}
          >
            <Search aria-hidden="true" />
            {t("header.search")}
          </Button>
          <Button
            type="button"
            variant={isFilterBarOpen ? "secondary" : "outline"}
            size="sm"
            aria-pressed={isFilterBarOpen}
            onClick={() => setFilterBarOpen(!isFilterBarOpen)}
          >
            <SlidersHorizontal aria-hidden="true" />
            {t("header.filter")}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void handleShare()}>
            <Share2 aria-hidden="true" />
            {t("header.share")}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!isDirty || updateTrip.isPending || title.trim().length < 2}
            onClick={() => updateTrip.mutate({ title: title.trim() })}
          >
            <Save aria-hidden="true" />
            {updateTrip.isPending ? t("saving") : t("save")}
          </Button>
        </div>
      </div>
    </section>
  );
}

function formatHeaderPresence(entries: PresenceEntry[], t: ReturnType<typeof useTranslations>) {
  const visibleNames = entries
    .slice(0, 2)
    .map((entry) => entry.userName)
    .join(" / ");
  const hiddenCount = Math.max(0, entries.length - 2);

  return hiddenCount > 0
    ? t("header.presence.withMore", { names: visibleNames, count: hiddenCount })
    : t("header.presence.names", { names: visibleNames });
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

function formatBudgetSummary(
  stats: PlannerStats,
  locale: string,
  t: ReturnType<typeof useTranslations>
) {
  if (stats.budgetLimit === null) {
    return t("header.summary.noBudget");
  }

  const currency = stats.expenseCurrency;
  const limit = formatMoney(stats.budgetLimit, currency, locale);
  const remaining =
    stats.remainingBudget === null ? null : formatMoney(stats.remainingBudget, currency, locale);

  return remaining
    ? t("header.summary.budgetWithRemaining", { limit, remaining })
    : t("header.summary.budget", { limit });
}

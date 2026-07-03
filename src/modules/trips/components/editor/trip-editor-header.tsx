"use client";

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clipboard,
  Hash,
  MoreHorizontal,
  Pencil,
  Save,
  Share2
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { routes } from "@/constants/routes";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { ActiveUsersPopover } from "@/modules/collaboration/components/active-users-popover";
import { ActivityFeedPopover } from "@/modules/collaboration/components/activity-feed-popover";
import { RealtimeStatus } from "@/modules/collaboration/components/realtime-status";
import { usePresenceSource } from "@/modules/collaboration/hooks/use-presence";
import type { PresenceEntry } from "@/modules/collaboration/types/presence.types";
import { semanticColorClassNames, statusColorClassNames } from "@/theme";

import { useUpdateTripMutation } from "../../mutations/use-trip-editor-mutations";
import type { TripDetail } from "../../types/trip.types";
import type { PlannerStats } from "../../utils/planner-workspace.utils";

interface TripEditorHeaderProps {
  trip: TripDetail;
  stats: PlannerStats;
  presenceEntries?: PresenceEntry[] | undefined;
  currentUserId?: string | undefined;
  followedPresenceUserId?: string | undefined;
  onFollowPresenceUser?: ((userId?: string) => void) | undefined;
  onIssueSummaryClick?: (() => void) | undefined;
}

export function TripEditorHeader({
  trip,
  stats,
  presenceEntries = [],
  currentUserId,
  followedPresenceUserId,
  onFollowPresenceUser,
  onIssueSummaryClick
}: TripEditorHeaderProps) {
  const locale = useLocale();
  const t = useTranslations("trip.editor");
  const statusT = useTranslations("trip.status");
  const visibilityT = useTranslations("trip.visibility");
  const updateTrip = useUpdateTripMutation(trip.id);
  const overflowMenuRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState(() => ({
    version: trip.version,
    title: trip.title
  }));
  const [isOverflowMenuOpen, setIsOverflowMenuOpen] = useState(false);
  const [isTitleFocused, setIsTitleFocused] = useState(false);
  const title = draft.version === trip.version ? draft.title : trip.title;
  const isDirty = title !== trip.title;
  const derivedDateRange = useMemo(
    () => formatDerivedDateRange(stats, locale) ?? t("header.noDerivedDates"),
    [locale, stats, t]
  );
  const summaryParts = useMemo(
    () => [
      derivedDateRange,
      t("header.summary.stops", { count: stats.itineraryCount }),
      t("header.summary.distance", {
        value: formatDistance(stats.totalRouteDistanceMeters, locale)
      }),
      t("header.summary.drivingDuration", {
        duration: formatTravelDuration(stats.totalRouteDurationSeconds, t)
      }),
      formatBudgetSummary(stats, locale, t)
    ],
    [derivedDateRange, locale, stats, t]
  );
  const saveState = updateTrip.isPending
    ? t("saving")
    : isDirty
      ? t("header.unsaved")
      : t("header.saved");
  usePresenceSource({
    tripId: trip.id,
    entityType: "TRIP",
    entityId: trip.id,
    state: "EDITING",
    priority: 2,
    enabled: isTitleFocused
  });

  useEffect(() => {
    if (!isOverflowMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (!overflowMenuRef.current?.contains(target)) {
        setIsOverflowMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOverflowMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOverflowMenuOpen]);

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success(t("header.shareCopied"));
    } catch {
      toast.error(t("header.shareFailed"));
    }
  }

  async function handleCopyTripId() {
    try {
      await navigator.clipboard.writeText(trip.id);
      toast.success(t("header.tripIdCopied"));
    } catch {
      toast.error(t("header.tripIdCopyFailed"));
    }
  }

  function closeOverflowMenu() {
    setIsOverflowMenuOpen(false);
  }

  return (
    <section className="border-b border-border/70 bg-background py-3">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="-ml-2 h-7 px-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <Link href={routes.trips}>
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              {t("header.backToTrips")}
            </Link>
          </Button>

          <div className="mt-1.5 flex min-w-0 items-center gap-2">
            <span className="relative inline-grid max-w-full">
              <span
                className="invisible col-start-1 row-start-1 whitespace-pre text-2xl font-semibold leading-none tracking-normal sm:text-[1.85rem]"
                aria-hidden="true"
              >
                {title || "M"}
              </span>
              <input
                value={title}
                onChange={(event) =>
                  setDraft({
                    version: trip.version,
                    title: event.target.value
                  })
                }
                onFocus={() => setIsTitleFocused(true)}
                onBlur={() => setIsTitleFocused(false)}
                aria-label={t("titleLabel")}
                placeholder={t("titlePlaceholder")}
                className="col-start-1 row-start-1 w-full min-w-0 rounded-sm bg-transparent text-2xl font-semibold leading-none tracking-normal text-foreground outline-none focus-visible:bg-muted sm:text-[1.85rem]"
                style={{ width: "100%" }}
              />
            </span>
            {!isTitleFocused ? (
              <Pencil className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            ) : null}
          </div>

          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            {summaryParts.map((part, index) => (
              <span key={`${part}-${index}`} className="inline-flex min-w-0 items-center gap-2">
                {index > 0 ? <span aria-hidden="true">{"\u00b7"}</span> : null}
                <span className="truncate">{part}</span>
              </span>
            ))}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "rounded-sm border-0 px-2 py-0.5 text-xs font-medium",
                statusColorClassNames.trip[trip.status]
              )}
            >
              {statusT(trip.status)}
            </span>
            <span
              className={cn(
                "rounded-sm border-0 px-2 py-0.5 text-xs font-medium",
                statusColorClassNames.visibility[trip.visibility]
              )}
            >
              {visibilityT(trip.visibility)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end lg:self-center">
          <ActiveUsersPopover
            entries={presenceEntries}
            followedUserId={followedPresenceUserId}
            onFollowUser={onFollowPresenceUser}
          />
          <ActivityFeedPopover
            tripId={trip.id}
            currentUserId={currentUserId}
            presenceEntries={presenceEntries}
          />
          <RealtimeStatus tripId={trip.id} />
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <CheckCircle2 className="size-3.5" aria-hidden="true" />
            {saveState}
          </span>
          {stats.timingIssueCount > 0 ? (
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors hover:bg-warning/15 focus-visible:outline-2 disabled:pointer-events-none",
                semanticColorClassNames.warningSubtle
              )}
              disabled={!onIssueSummaryClick}
              onClick={onIssueSummaryClick}
            >
              <AlertTriangle className="size-3.5" aria-hidden="true" />
              {t("header.summary.issues", { count: stats.timingIssueCount })}
            </button>
          ) : null}
          <Button
            type="button"
            size="sm"
            className="h-9 rounded-md border-0 bg-accent px-3 text-accent-foreground shadow-none hover:bg-accent/90"
            onClick={() => void handleShare()}
          >
            <Share2 aria-hidden="true" />
            {t("header.share")}
          </Button>
          {isDirty || updateTrip.isPending ? (
            <Button
              type="button"
              size="sm"
              className="h-9 rounded-md px-3"
              disabled={!isDirty || updateTrip.isPending || title.trim().length < 2}
              onClick={() => updateTrip.mutate({ title: title.trim() })}
            >
              <Save aria-hidden="true" />
              {updateTrip.isPending ? t("saving") : t("save")}
            </Button>
          ) : null}
          <div ref={overflowMenuRef} className="relative">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 rounded-md border bg-background shadow-none hover:bg-muted"
              aria-label={t("header.moreActions")}
              aria-haspopup="menu"
              aria-expanded={isOverflowMenuOpen}
              onClick={() => setIsOverflowMenuOpen((current) => !current)}
            >
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </Button>
            {isOverflowMenuOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-full z-50 mt-1 grid min-w-44 gap-1 rounded-md border bg-background p-1 text-sm shadow-sm"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-left hover:bg-muted focus-visible:outline-2"
                  onClick={() => {
                    closeOverflowMenu();
                    void handleShare();
                  }}
                >
                  <Clipboard className="size-4 text-muted-foreground" aria-hidden="true" />
                  {t("header.copyLink")}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-left hover:bg-muted focus-visible:outline-2"
                  onClick={() => {
                    closeOverflowMenu();
                    void handleCopyTripId();
                  }}
                >
                  <Hash className="size-4 text-muted-foreground" aria-hidden="true" />
                  {t("header.copyTripId")}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function formatDerivedDateRange(stats: PlannerStats, locale: string) {
  if (!stats.derivedStartDate && !stats.derivedEndDate) {
    return null;
  }

  const startDate = stats.derivedStartDate ? new Date(stats.derivedStartDate) : null;
  const endDate = stats.derivedEndDate ? new Date(stats.derivedEndDate) : startDate;

  if (!startDate || Number.isNaN(startDate.getTime())) {
    return null;
  }

  if (!endDate || Number.isNaN(endDate.getTime())) {
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(startDate);
  }

  if (startDate.toDateString() === endDate.toDateString()) {
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(startDate);
  }

  const sameMonth =
    startDate.getFullYear() === endDate.getFullYear() &&
    startDate.getMonth() === endDate.getMonth();

  if (sameMonth) {
    const month = new Intl.DateTimeFormat(locale, { month: "short" }).format(startDate);
    const year = new Intl.DateTimeFormat(locale, { year: "numeric" }).format(startDate);

    return `${month} ${startDate.getDate()}-${endDate.getDate()}, ${year}`;
  }

  const formatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  return `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
}

function formatDistance(meters: number, locale: string) {
  const kilometers = meters / 1000;

  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: kilometers >= 10 ? 0 : 1
  }).format(kilometers);
}

function formatTravelDuration(seconds: number, t: ReturnType<typeof useTranslations>) {
  const totalMinutes = Math.max(0, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h`;
  }

  return t("header.durationMinutes", { count: totalMinutes });
}

function formatBudgetSummary(
  stats: PlannerStats,
  locale: string,
  t: ReturnType<typeof useTranslations>
) {
  if (stats.budgetLimit === null) {
    return t("header.summary.noBudget");
  }

  const budget = formatCurrency(stats.budgetLimit, stats.expenseCurrency, locale);

  if (stats.remainingBudget !== null) {
    return t("header.summary.budgetWithRemaining", {
      limit: budget,
      remaining: formatCurrency(stats.remainingBudget, stats.expenseCurrency, locale)
    });
  }

  return t("header.summary.budget", { limit: budget });
}

function formatCurrency(amount: number, currency: string | null, locale: string) {
  if (!currency) {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(amount);
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(amount);
}

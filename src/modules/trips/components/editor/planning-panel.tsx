"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Eye,
  Gauge,
  ListChecks,
  RefreshCw,
  Route,
  Wallet
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/error-state";
import { cn } from "@/lib/utils";
import type { ItineraryItem } from "@/modules/itinerary/types/itinerary.types";
import type { Place } from "@/modules/places/types/place.types";
import { tripPlanningQueryOptions } from "../../queries/trip.queries";
import type {
  PlanningEngineIssueDto,
  PlanningEngineMetricDto,
  PlanningEngineSuggestionDto
} from "@/services/api/contracts";

interface PlanningPanelProps {
  tripId: string;
  items: ItineraryItem[];
  places: Place[];
  onSelectItem: (itemId: string, placeId?: string | undefined) => void;
}

export function PlanningPanel({ tripId, items, places, onSelectItem }: PlanningPanelProps) {
  const t = useTranslations("trip.editor.planning");
  const locale = useLocale();
  const planningQuery = useQuery(tripPlanningQueryOptions(tripId));
  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const placeById = useMemo(() => new Map(places.map((place) => [place.id, place])), [places]);

  if (planningQuery.isLoading) {
    return (
      <div className="grid gap-2">
        <div className="h-24 animate-pulse rounded-md border bg-muted" />
        <div className="h-40 animate-pulse rounded-md border bg-muted" />
        <div className="h-40 animate-pulse rounded-md border bg-muted" />
      </div>
    );
  }

  if (planningQuery.isError || !planningQuery.data) {
    return (
      <ErrorState
        title={t("errorTitle")}
        description={t("errorMessage")}
        action={
          <Button type="button" variant="secondary" onClick={() => void planningQuery.refetch()}>
            <RefreshCw aria-hidden="true" />
            {t("retry")}
          </Button>
        }
      />
    );
  }

  const planning = planningQuery.data;
  const criticalIssues = planning.issues.filter((issue) => issue.severity === "CRITICAL").length;
  const warningIssues = planning.issues.filter((issue) => issue.severity === "WARNING").length;
  const metricsByKey = new Map(planning.metrics.map((metric) => [metric.key, metric]));
  const topIssues = planning.issues.slice(0, 8);
  const topSuggestions = planning.suggestions.slice(0, 6);

  const getItemLabel = (itemId: string) => {
    const item = itemById.get(itemId);
    const place = item ? placeById.get(item.placeId) : undefined;

    return place?.name ?? item?.summary ?? t("unknownStop");
  };

  const handlePreviewSuggestion = (suggestion: PlanningEngineSuggestionDto) => {
    const firstItemId = suggestion.affectedEntityIds.find((entityId) => itemById.has(entityId));
    if (!firstItemId) return;

    onSelectItem(firstItemId, itemById.get(firstItemId)?.placeId);
  };

  return (
    <div className="grid gap-3 text-sm">
      <section className="rounded-md border bg-card p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Gauge className="size-4 text-muted-foreground" aria-hidden="true" />
              <h2 className="text-base font-semibold">{t("title")}</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("generatedAt", {
                value: new Intl.DateTimeFormat(locale, {
                  dateStyle: "medium",
                  timeStyle: "short"
                }).format(new Date(planning.generatedAt))
              })}
            </p>
          </div>
          <div className="text-right">
            <p className={cn("text-2xl font-semibold", getHealthClassName(planning.health.status))}>
              {planning.health.score}
              <span className="text-sm font-normal text-muted-foreground">
                /{planning.health.maxScore}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">{t(`health.${planning.health.status}`)}</p>
          </div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <HealthLine
            icon={<AlertTriangle className="size-4" aria-hidden="true" />}
            label={t("summary.critical")}
            value={criticalIssues}
          />
          <HealthLine
            icon={<ListChecks className="size-4" aria-hidden="true" />}
            label={t("summary.warnings")}
            value={warningIssues}
          />
          <HealthLine
            icon={<Clock3 className="size-4" aria-hidden="true" />}
            label={t("summary.scheduled")}
            value={`${planning.timeline.scheduledItemCount}/${planning.timeline.segments.length}`}
          />
        </div>
      </section>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <section className="rounded-md border bg-card">
          <SectionHeader
            title={t("issues.title")}
            meta={t("issues.meta", { count: planning.issues.length })}
          />
          <div className="divide-y">
            {topIssues.length === 0 ? (
              <EmptyLine icon={<CheckCircle2 className="size-4" aria-hidden="true" />}>
                {t("issues.empty")}
              </EmptyLine>
            ) : (
              topIssues.map((issue) => (
                <IssueRow
                  key={issue.id}
                  issue={issue}
                  affectedLabel={formatAffected(issue, getItemLabel, t("tripScope"))}
                />
              ))
            )}
          </div>
        </section>

        <section className="rounded-md border bg-card">
          <SectionHeader
            title={t("suggestions.title")}
            meta={t("suggestions.meta", { count: planning.suggestions.length })}
          />
          <div className="divide-y">
            {topSuggestions.length === 0 ? (
              <EmptyLine icon={<CheckCircle2 className="size-4" aria-hidden="true" />}>
                {t("suggestions.empty")}
              </EmptyLine>
            ) : (
              topSuggestions.map((suggestion) => (
                <SuggestionRow
                  key={suggestion.id}
                  suggestion={suggestion}
                  affectedLabel={formatAffectedSuggestion(suggestion, getItemLabel, t("tripScope"))}
                  onPreview={() => handlePreviewSuggestion(suggestion)}
                  canPreview={suggestion.affectedEntityIds.some((entityId) =>
                    itemById.has(entityId)
                  )}
                />
              ))
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <section className="rounded-md border bg-card">
          <SectionHeader title={t("metrics.title")} meta={t("metrics.meta")} />
          <div className="grid gap-1 p-2 sm:grid-cols-2">
            {[
              "scheduledRatio",
              "travelRatio",
              "budgetUsage",
              "totalTravelDistance",
              "totalTravelDuration",
              "idleGapMinutes"
            ].map((metricKey) => {
              const metric = metricsByKey.get(metricKey as PlanningEngineMetricDto["key"]);
              if (!metric) return null;

              return <MetricRow key={metric.key} metric={metric} />;
            })}
          </div>
        </section>

        <section className="rounded-md border bg-card">
          <SectionHeader
            title={t("travel.title")}
            meta={t("travel.meta", {
              distance: formatDistance(planning.route.totalDistanceMeters, locale),
              duration: formatDuration(planning.route.totalDurationMinutes, t)
            })}
          />
          <div className="divide-y">
            {planning.route.segments.slice(0, 5).map((segment) => (
              <div key={segment.id} className="grid gap-1 px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate font-medium">
                    {getItemLabel(segment.fromItemId)}
                    {" -> "}
                    {getItemLabel(segment.toItemId)}
                  </p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {segment.distanceMeters === null
                      ? t("travel.missing")
                      : formatDistance(segment.distanceMeters, locale)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {segment.durationMinutes === null
                    ? t("travel.noDuration")
                    : formatDuration(segment.durationMinutes, t)}
                  {" · "}
                  {t(`travel.modes.${segment.travelMode}`)}
                  {segment.warnings.length > 0 ? ` · ${t("travel.warning")}` : ""}
                </p>
              </div>
            ))}
            {planning.route.segments.length === 0 ? (
              <EmptyLine icon={<Route className="size-4" aria-hidden="true" />}>
                {t("travel.empty")}
              </EmptyLine>
            ) : null}
          </div>
        </section>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <section className="rounded-md border bg-card">
          <SectionHeader title={t("constraints.title")} meta={t("constraints.meta")} />
          <div className="divide-y">
            {planning.constraints.map((constraint) => (
              <div
                key={constraint.id}
                className="flex items-center justify-between gap-3 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {t(`constraints.codes.${constraint.code}`)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {t(`constraints.status.${constraint.status}`)}
                  </p>
                </div>
                <span
                  className={cn("text-xs font-medium", getConstraintClassName(constraint.status))}
                >
                  {constraint.status}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-md border bg-card">
          <SectionHeader title={t("budget.title")} meta={planning.budget.currency ?? ""} />
          <div className="grid gap-2 p-3">
            <HealthLine
              icon={<Wallet className="size-4" aria-hidden="true" />}
              label={t("budget.spent")}
              value={formatMoney(planning.budget.spentAmount, planning.budget.currency, locale)}
            />
            <HealthLine
              icon={<Wallet className="size-4" aria-hidden="true" />}
              label={t("budget.remaining")}
              value={
                planning.budget.remainingAmount === null
                  ? t("budget.noBudget")
                  : formatMoney(planning.budget.remainingAmount, planning.budget.currency, locale)
              }
            />
            <div className="grid gap-1">
              {planning.budget.dailySpend.slice(0, 4).map((entry) => (
                <div key={entry.date} className="flex justify-between gap-3 text-xs">
                  <span className="text-muted-foreground">{entry.date}</span>
                  <span>{formatMoney(entry.amount, planning.budget.currency, locale)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function SectionHeader({ title, meta }: { title: string; meta?: string | undefined }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      {meta ? <span className="text-xs text-muted-foreground">{meta}</span> : null}
    </div>
  );
}

function HealthLine({
  icon,
  label,
  value
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border bg-background px-2.5 py-2">
      <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
        {icon}
        <span className="truncate text-xs">{label}</span>
      </span>
      <span className="shrink-0 font-medium">{value}</span>
    </div>
  );
}

function IssueRow({
  issue,
  affectedLabel
}: {
  issue: PlanningEngineIssueDto;
  affectedLabel: string;
}) {
  const t = useTranslations("trip.editor.planning");

  return (
    <div className="grid gap-1 px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate font-medium">{t(`issues.codes.${issue.code}`)}</p>
        <span className={cn("shrink-0 text-xs font-medium", getSeverityClassName(issue.severity))}>
          {t(`severity.${issue.severity}`)}
        </span>
      </div>
      <p className="truncate text-xs text-muted-foreground">{affectedLabel}</p>
    </div>
  );
}

function SuggestionRow({
  suggestion,
  affectedLabel,
  canPreview,
  onPreview
}: {
  suggestion: PlanningEngineSuggestionDto;
  affectedLabel: string;
  canPreview: boolean;
  onPreview: () => void;
}) {
  const t = useTranslations("trip.editor.planning");

  return (
    <div className="grid gap-2 px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">
            {t(`suggestions.reasons.${suggestion.reasonCode}`)}
          </p>
          <p className="truncate text-xs text-muted-foreground">{affectedLabel}</p>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {Math.round(suggestion.confidence * 100)}%
        </span>
      </div>
      {canPreview ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="justify-self-start"
          onClick={onPreview}
        >
          <Eye aria-hidden="true" />
          {t("suggestions.preview")}
        </Button>
      ) : null}
    </div>
  );
}

function MetricRow({ metric }: { metric: PlanningEngineMetricDto }) {
  const t = useTranslations("trip.editor.planning");
  const locale = useLocale();

  return (
    <div className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5">
      <span className="min-w-0 truncate text-muted-foreground">
        {t(`metrics.labels.${metric.key}`)}
      </span>
      <span className="shrink-0 font-medium">{formatMetricValue(metric, locale)}</span>
    </div>
  );
}

function EmptyLine({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
      {icon}
      <span>{children}</span>
    </div>
  );
}

function formatAffected(
  issue: PlanningEngineIssueDto,
  getItemLabel: (itemId: string) => string,
  fallback: string
) {
  const labels = issue.affectedEntityIds.slice(0, 3).map(getItemLabel).filter(Boolean);
  return labels.length > 0 ? labels.join(", ") : fallback;
}

function formatAffectedSuggestion(
  suggestion: PlanningEngineSuggestionDto,
  getItemLabel: (itemId: string) => string,
  fallback: string
) {
  const previewItemIds = suggestion.preview.itemIds ?? suggestion.affectedEntityIds;
  const labels = previewItemIds.slice(0, 3).map(getItemLabel).filter(Boolean);
  return labels.length > 0 ? labels.join(" -> ") : fallback;
}

function formatMetricValue(metric: PlanningEngineMetricDto, locale: string) {
  if (metric.unit === "percent") {
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(metric.value)}%`;
  }

  if (metric.unit === "meters") {
    return formatDistance(metric.value, locale);
  }

  if (metric.unit === "minutes") {
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(metric.value)} min`;
  }

  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(metric.value);
}

function formatDistance(value: number, locale: string) {
  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: value >= 10_000 ? 0 : 1
  }).format(value / 1000)} km`;
}

function formatDuration(minutes: number, t: ReturnType<typeof useTranslations>) {
  return t("duration", { count: Math.max(0, Math.round(minutes)) });
}

function formatMoney(value: number, currency: string | null, locale: string) {
  if (!currency) {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(value);
}

function getHealthClassName(status: string) {
  if (status === "AT_RISK") return "text-destructive";
  if (status === "NEEDS_ATTENTION") return "text-warning";
  return "text-success";
}

function getSeverityClassName(severity: string) {
  if (severity === "CRITICAL") return "text-destructive";
  if (severity === "WARNING") return "text-warning";
  return "text-muted-foreground";
}

function getConstraintClassName(status: string) {
  if (status === "FAIL") return "text-destructive";
  if (status === "WARN") return "text-warning";
  if (status === "PASS") return "text-success";
  return "text-muted-foreground";
}

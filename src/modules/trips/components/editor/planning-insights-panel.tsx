"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Lightbulb,
  Map as MapIcon,
  RefreshCw,
  Route
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  PlanningIssueDto,
  PlanningIssueSeverityDto,
  PlanningScheduleSuggestionDto,
  PlaceDto
} from "@/services/api/contracts";
import type { ItineraryItem } from "@/modules/itinerary/types/itinerary.types";

import { tripPlanningInsightsQueryOptions } from "../../queries/trip.queries";
import { getPlaceMap } from "../../utils/trip-editor.utils";

interface PlanningInsightsPanelProps {
  tripId: string;
  items: ItineraryItem[];
  places: PlaceDto[];
  onSelectItem?: ((itemId: string, placeId?: string) => void) | undefined;
}

export function PlanningInsightsPanel({
  tripId,
  items,
  places,
  onSelectItem
}: PlanningInsightsPanelProps) {
  const t = useTranslations("trip.editor.insights");
  const locale = useLocale();
  const insightsQuery = useQuery(tripPlanningInsightsQueryOptions(tripId));
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const placeMap = useMemo(() => getPlaceMap(places), [places]);
  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  if (insightsQuery.isLoading) {
    return (
      <div className="grid gap-3 rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground">
        <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
        {t("loading")}
      </div>
    );
  }

  if (insightsQuery.isError || !insightsQuery.data) {
    return (
      <div className="flex items-start gap-2 rounded-md border bg-muted/20 p-4 text-sm">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{t("errorTitle")}</p>
          <p className="mt-1 text-muted-foreground">{t("errorDescription")}</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => void insightsQuery.refetch()}
        >
          <RefreshCw aria-hidden="true" />
          {t("retry")}
        </Button>
      </div>
    );
  }

  const insights = insightsQuery.data;
  const optimization = insights.recommendations.optimization;
  const criticalIssues = insights.issues.filter((issue) => issue.severity === "CRITICAL");
  const warningIssues = insights.issues.filter((issue) => issue.severity === "WARNING");
  const previewSteps = optimization.steps
    .slice()
    .sort((left, right) => left.recommendedSequence - right.recommendedSequence);

  return (
    <section className="grid gap-4" aria-label={t("title")}>
      <div className="grid gap-3 rounded-md border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold">{t("title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("generatedAt", {
                value: new Intl.DateTimeFormat(locale, {
                  dateStyle: "medium",
                  timeStyle: "short"
                }).format(new Date(insights.generatedAt))
              })}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">{t("score.label")}</span>
            <span
              className={cn("text-2xl font-semibold", getScoreClassName(insights.score.overall))}
            >
              {insights.score.overall}
            </span>
            <span className="text-muted-foreground">/ {insights.score.maxScore}</span>
          </div>
        </div>

        <div className="grid gap-2">
          {insights.score.dimensions.map((dimension) => (
            <div key={dimension.key} className="grid gap-1">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span>{t(`score.dimensions.${dimension.key}`)}</span>
                <span className="tabular-nums text-muted-foreground">
                  {dimension.score}/{dimension.maxScore}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-sm bg-muted">
                <div
                  className="h-full bg-accent"
                  style={{ width: `${Math.max(0, Math.min(100, dimension.score))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.85fr)]">
        <div className="grid gap-4">
          <section className="rounded-md border bg-card">
            <SectionHeader
              icon={<AlertTriangle className="size-4" aria-hidden="true" />}
              title={t("issues.title")}
              meta={t("issues.meta", {
                critical: criticalIssues.length,
                warning: warningIssues.length
              })}
            />
            <div className="grid gap-1 p-2">
              {insights.issues.length === 0 ? (
                <EmptyLine icon={<CheckCircle2 className="size-4" aria-hidden="true" />}>
                  {t("issues.empty")}
                </EmptyLine>
              ) : (
                insights.issues
                  .slice(0, 8)
                  .map((issue) => (
                    <IssueRow
                      key={issue.id}
                      issue={issue}
                      itemById={itemById}
                      placeMap={placeMap}
                      onSelectItem={onSelectItem}
                    />
                  ))
              )}
            </div>
          </section>

          <section className="rounded-md border bg-card">
            <SectionHeader
              icon={<Route className="size-4" aria-hidden="true" />}
              title={t("optimization.title")}
              meta={t("optimization.meta", {
                mode: t(`travelModes.${optimization.travelMode}`),
                confidence: Math.round(optimization.confidence.score * 100)
              })}
            />
            <div className="grid gap-3 p-3">
              <div className="grid gap-2 sm:grid-cols-3">
                <Metric
                  label={t("optimization.currentDistance")}
                  value={formatDistance(optimization.current.distanceMeters, locale)}
                />
                <Metric
                  label={t("optimization.savingDistance")}
                  value={formatDistance(optimization.savings.distanceMeters, locale)}
                />
                <Metric
                  label={t("optimization.savingTime")}
                  value={formatDuration(optimization.savings.durationMinutes, t)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setIsPreviewOpen((current) => !current)}
                >
                  <Eye aria-hidden="true" />
                  {isPreviewOpen ? t("optimization.hidePreview") : t("optimization.preview")}
                </Button>
              </div>
              {isPreviewOpen ? (
                <ol className="grid gap-1">
                  {previewSteps.map((step) => {
                    const item = itemById.get(step.itemId);
                    const place = item ? placeMap.get(item.placeId) : undefined;

                    return (
                      <li
                        key={step.itemId}
                        className="grid grid-cols-[2rem_1fr_auto] items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60"
                      >
                        <span className="tabular-nums text-muted-foreground">
                          {step.recommendedSequence}
                        </span>
                        <span className="min-w-0 truncate">{place?.name ?? t("unknownStop")}</span>
                        {item ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            onClick={() => onSelectItem?.(item.id, item.placeId)}
                          >
                            {t("view")}
                          </Button>
                        ) : null}
                      </li>
                    );
                  })}
                </ol>
              ) : null}
            </div>
          </section>

          <section className="rounded-md border bg-card">
            <SectionHeader
              icon={<Lightbulb className="size-4" aria-hidden="true" />}
              title={t("schedule.title")}
              meta={t("schedule.meta", { count: insights.recommendations.schedule.length })}
            />
            <div className="grid gap-1 p-2">
              {insights.recommendations.schedule.length === 0 ? (
                <EmptyLine>{t("schedule.empty")}</EmptyLine>
              ) : (
                insights.recommendations.schedule
                  .slice(0, 8)
                  .map((suggestion) => (
                    <ScheduleRow
                      key={suggestion.id}
                      suggestion={suggestion}
                      itemById={itemById}
                      placeMap={placeMap}
                      onSelectItem={onSelectItem}
                    />
                  ))
              )}
            </div>
          </section>
        </div>

        <div className="grid content-start gap-4">
          <section className="rounded-md border bg-card">
            <SectionHeader
              title={t("budget.title")}
              meta={insights.budgetInsights.currency ?? ""}
            />
            <div className="grid gap-2 p-3">
              <Metric
                label={t("budget.spent")}
                value={formatCurrency(
                  insights.budgetInsights.spentAmount,
                  insights.budgetInsights.currency,
                  locale
                )}
              />
              <Metric
                label={t("budget.remaining")}
                value={
                  insights.budgetInsights.remainingAmount === null
                    ? t("budget.notSet")
                    : formatCurrency(
                        insights.budgetInsights.remainingAmount,
                        insights.budgetInsights.currency,
                        locale
                      )
                }
              />
              {insights.budgetInsights.recommendations.slice(0, 3).map((recommendation) => (
                <p key={recommendation.code} className="text-sm text-muted-foreground">
                  {t(
                    `budget.recommendations.${recommendation.code}`,
                    toTranslationParams(recommendation.params)
                  )}
                </p>
              ))}
            </div>
          </section>

          <section className="rounded-md border bg-card">
            <SectionHeader
              icon={<MapIcon className="size-4" aria-hidden="true" />}
              title={t("map.title")}
              meta={t("map.meta", {
                clusters: insights.mapInsights.clusters.length,
                isolated: insights.mapInsights.isolatedStops.length
              })}
            />
            <div className="grid gap-2 p-3 text-sm">
              {insights.mapInsights.groupingSuggestions.slice(0, 4).map((group) => (
                <p key={group.id} className="text-muted-foreground">
                  {t(`map.grouping.${group.reasonCode}`, { count: group.itemIds.length })}
                </p>
              ))}
              {insights.mapInsights.groupingSuggestions.length === 0 ? (
                <p className="text-muted-foreground">{t("map.empty")}</p>
              ) : null}
            </div>
          </section>

          <section className="rounded-md border bg-card">
            <SectionHeader
              title={t("places.title")}
              meta={t("places.meta", { count: insights.recommendations.places.length })}
            />
            <div className="grid gap-1 p-2">
              {insights.recommendations.places.length === 0 ? (
                <EmptyLine>{t("places.empty")}</EmptyLine>
              ) : (
                insights.recommendations.places.map((place) => (
                  <div key={place.id} className="rounded-md px-2 py-1.5 text-sm">
                    <p className="font-medium">{t(`places.names.${place.reasonCode}`)}</p>
                    <p className="text-xs text-muted-foreground">
                      {t(`places.reasons.${place.reasonCode}`)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-md border bg-card">
            <SectionHeader
              title={t("collaboration.title")}
              meta={t("collaboration.meta", {
                active: insights.collaborationInsights.activeCollaboratorCount,
                edits: insights.collaborationInsights.pendingEditCount
              })}
            />
            <div className="grid gap-2 p-3 text-sm text-muted-foreground">
              <p>
                {t("collaboration.activity", {
                  count: insights.collaborationInsights.recentActivityCount
                })}
              </p>
              {insights.collaborationInsights.contributorStats.slice(0, 3).map((contributor) => (
                <p key={contributor.userId ?? contributor.name}>
                  {t("collaboration.contributor", {
                    name: contributor.name,
                    count: contributor.mutationCount
                  })}
                </p>
              ))}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

function SectionHeader({
  title,
  meta,
  icon
}: {
  title: string;
  meta?: string | undefined;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
        <h3 className="truncate text-sm font-semibold">{title}</h3>
      </div>
      {meta ? <span className="shrink-0 text-xs text-muted-foreground">{meta}</span> : null}
    </div>
  );
}

function IssueRow({
  issue,
  itemById,
  placeMap,
  onSelectItem
}: {
  issue: PlanningIssueDto;
  itemById: Map<string, ItineraryItem>;
  placeMap: Map<string, PlaceDto>;
  onSelectItem?: ((itemId: string, placeId?: string) => void) | undefined;
}) {
  const t = useTranslations("trip.editor.insights");
  const item =
    issue.entityType === "ITINERARY_ITEM" && issue.entityId
      ? itemById.get(issue.entityId)
      : undefined;
  const place = item ? placeMap.get(item.placeId) : undefined;

  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-md px-2 py-1.5 text-sm">
      <SeverityBadge severity={issue.severity} />
      <div className="min-w-0">
        <p className="truncate">
          {t(`issues.codes.${issue.code}`, toTranslationParams(issue.params))}
        </p>
        {place ? <p className="truncate text-xs text-muted-foreground">{place.name}</p> : null}
      </div>
      {item ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2"
          onClick={() => onSelectItem?.(item.id, item.placeId)}
        >
          {t("view")}
        </Button>
      ) : null}
    </div>
  );
}

function ScheduleRow({
  suggestion,
  itemById,
  placeMap,
  onSelectItem
}: {
  suggestion: PlanningScheduleSuggestionDto;
  itemById: Map<string, ItineraryItem>;
  placeMap: Map<string, PlaceDto>;
  onSelectItem?: ((itemId: string, placeId?: string) => void) | undefined;
}) {
  const t = useTranslations("trip.editor.insights");
  const item = suggestion.itemId ? itemById.get(suggestion.itemId) : undefined;
  const place = item ? placeMap.get(item.placeId) : undefined;

  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-md px-2 py-1.5 text-sm">
      <div className="min-w-0">
        <p className="truncate">{t(`schedule.reasons.${suggestion.reasonCode}`)}</p>
        <p className="truncate text-xs text-muted-foreground">
          {place?.name ?? t(`schedule.types.${suggestion.type}`)}
          {suggestion.recommendedDurationMinutes
            ? ` · ${t("schedule.duration", { count: suggestion.recommendedDurationMinutes })}`
            : ""}
        </p>
      </div>
      {item ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2"
          onClick={() => onSelectItem?.(item.id, item.placeId)}
        >
          {t("view")}
        </Button>
      ) : null}
    </div>
  );
}

function SeverityBadge({ severity }: { severity: PlanningIssueSeverityDto }) {
  const t = useTranslations("trip.editor.insights");

  return (
    <span
      className={cn(
        "inline-flex h-6 min-w-16 items-center justify-center rounded-md px-2 text-xs font-medium",
        severity === "CRITICAL" && "bg-destructive/10 text-destructive",
        severity === "WARNING" && "bg-warning/15 text-warning-foreground",
        severity === "INFO" && "bg-muted text-muted-foreground"
      )}
    >
      {t(`severity.${severity}`)}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-medium">{value}</p>
    </div>
  );
}

function EmptyLine({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
      {icon}
      <span>{children}</span>
    </div>
  );
}

function getScoreClassName(score: number) {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-warning-foreground";
  return "text-destructive";
}

function formatDistance(meters: number, locale: string) {
  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1
  }).format(meters / 1000)} km`;
}

function formatDuration(minutes: number, t: ReturnType<typeof useTranslations>) {
  return t("durationMinutes", { count: Math.round(minutes) });
}

function formatCurrency(amount: number, currency: string | null, locale: string) {
  if (!currency) {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(amount);
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(amount);
}

function toTranslationParams(params: Record<string, string | number | boolean>) {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [
      key,
      typeof value === "boolean" ? String(value) : value
    ])
  ) as Record<string, string | number>;
}

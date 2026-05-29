"use client";

import { AlertTriangle, CheckCircle2, Info, Route } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

import type { PlannerInsight } from "../../utils/planner-workspace.utils";

type PlannerInsightsProps = {
  insights: PlannerInsight[];
};

const severityIcons = {
  info: Info,
  warning: Route,
  critical: AlertTriangle
} satisfies Record<PlannerInsight["severity"], typeof Info>;

export function PlannerInsights({ insights }: PlannerInsightsProps) {
  const locale = useLocale();
  const t = useTranslations("trip.editor.insights");

  return (
    <section className="rounded-md border bg-card p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{t("title")}</h2>
        <span className="text-xs text-muted-foreground">{t("count", { count: insights.length })}</span>
      </div>

      {insights.length > 0 ? (
        <div className="grid gap-1.5">
          {insights.map((insight) => {
            const Icon = severityIcons[insight.severity];

            return (
              <div
                key={insight.id}
                className={cn(
                  "grid grid-cols-[auto_1fr] gap-2 rounded-md border px-2 py-1.5 text-xs",
                  insight.severity === "critical" && "border-destructive/40 bg-destructive/5",
                  insight.severity === "warning" && "border-amber-500/40 bg-amber-500/5"
                )}
              >
                <Icon className="mt-0.5 size-3.5 text-muted-foreground" aria-hidden="true" />
                <span className="min-w-0">
                  {t(`items.${insight.kind}`, {
                    count: insight.count,
                    minutes: insight.minutes ?? 0,
                    amount:
                      insight.amount !== undefined
                        ? new Intl.NumberFormat(locale, {
                            currency: insight.currency,
                            maximumFractionDigits: 0,
                            style: insight.currency ? "currency" : "decimal"
                          }).format(insight.amount)
                        : ""
                  })}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-md bg-muted px-2 py-2 text-xs text-muted-foreground">
          <CheckCircle2 className="size-4" aria-hidden="true" />
          {t("empty")}
        </div>
      )}
    </section>
  );
}

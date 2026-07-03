"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, GitMerge, RefreshCw, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { expenseKeys } from "@/modules/expenses/queries/expense.queries";
import { itineraryKeys } from "@/modules/itinerary/queries/itinerary.queries";
import { noteKeys } from "@/modules/notes/queries/note.queries";
import { placeKeys } from "@/modules/places/queries/place.queries";
import { reconcileRevisionGap } from "@/modules/sync/reconciliation/reconciliation";
import { tripKeys } from "@/modules/trips/queries/trip.queries";
import { semanticColorClassNames } from "@/theme";

import { dismissRevisionConflict } from "../conflict.store";
import { useActiveRevisionConflict } from "../hooks/use-conflict";

const ignoredPayloadFields = new Set([
  "clientMutationId",
  "deviceId",
  "expectedRevision",
  "expectedVersion"
]);

export function ConflictDialog({ tripId }: { tripId: string }) {
  const t = useTranslations("trip.editor.conflict");
  const queryClient = useQueryClient();
  const conflict = useActiveRevisionConflict(tripId);
  const [isReloading, setIsReloading] = useState(false);
  const differences = useMemo(() => buildConflictDifferences(conflict), [conflict]);

  if (!conflict) {
    return null;
  }

  async function reloadLatest() {
    if (!conflict) {
      return;
    }

    setIsReloading(true);
    try {
      await reconcileRevisionGap(queryClient, conflict.tripId, conflict.details.currentRevision);
      invalidateConflictQueries(queryClient, conflict.tripId, conflict.entityType);
      dismissRevisionConflict(conflict.id);
    } finally {
      setIsReloading(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && dismissRevisionConflict(conflict.id)}>
      <DialogContent closeLabel={t("close")} className="max-w-2xl">
        <DialogHeader>
          <div
            className={cn(
              "mb-1 inline-flex w-fit items-center gap-2 rounded-md border px-2 py-1 text-xs font-medium",
              semanticColorClassNames.warningSubtle
            )}
          >
            <AlertTriangle className="size-3.5" aria-hidden="true" />
            {t("badge")}
          </div>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground sm:grid-cols-2">
            <p>{t("currentRevision", { value: conflict.details.currentRevision })}</p>
            <p>{t("latestRevision", { value: conflict.details.latestTripRevision })}</p>
          </div>

          {differences.length > 0 ? (
            <div className="max-h-[45vh] overflow-y-auto rounded-md border">
              <div className="grid grid-cols-[8rem_minmax(0,1fr)_minmax(0,1fr)] border-b bg-muted/40 text-xs font-medium text-muted-foreground">
                <span className="px-3 py-2">{t("field")}</span>
                <span className="px-3 py-2">{t("yours")}</span>
                <span className="px-3 py-2">{t("latest")}</span>
              </div>
              {differences.map((difference) => (
                <div
                  key={difference.field}
                  className="grid grid-cols-[8rem_minmax(0,1fr)_minmax(0,1fr)] border-b text-sm last:border-b-0"
                >
                  <span className="min-w-0 px-3 py-2 font-medium">
                    {formatFieldLabel(difference.field, t)}
                  </span>
                  <span className="min-w-0 whitespace-pre-wrap px-3 py-2 text-muted-foreground">
                    {difference.local}
                  </span>
                  <span className="min-w-0 whitespace-pre-wrap px-3 py-2 text-foreground">
                    {difference.latest}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
              {t("noFieldDiff")}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            disabled={isReloading}
            onClick={() => dismissRevisionConflict(conflict.id)}
          >
            <X aria-hidden="true" />
            {t("cancel")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isReloading}
            onClick={() => dismissRevisionConflict(conflict.id)}
          >
            {t("keepEditing")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isReloading}
            onClick={() => dismissRevisionConflict(conflict.id)}
          >
            <GitMerge aria-hidden="true" />
            {t("mergeManually")}
          </Button>
          <Button type="button" disabled={isReloading} onClick={() => void reloadLatest()}>
            <RefreshCw className={cn(isReloading && "animate-spin")} aria-hidden="true" />
            {t("reloadLatest")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function buildConflictDifferences(
  conflict: ReturnType<typeof useActiveRevisionConflict>
): Array<{ field: string; local: string; latest: string }> {
  if (!conflict?.localPayload || !conflict.details.latestEntity) {
    return [];
  }

  return Object.entries(conflict.localPayload)
    .filter(([field]) => !ignoredPayloadFields.has(field))
    .map(([field, localValue]) => {
      const latestValue = conflict.details.latestEntity?.[field];

      return {
        field,
        local: formatConflictValue(localValue),
        latest: formatConflictValue(latestValue)
      };
    })
    .filter((difference) => difference.local !== difference.latest);
}

function formatConflictValue(value: unknown) {
  if (value === undefined) {
    return "-";
  }

  if (value === null) {
    return "null";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value, null, 2);
}

function formatFieldLabel(field: string, t: ReturnType<typeof useTranslations>) {
  const fieldKeyByName: Record<string, string> = {
    amount: "amount",
    attachments: "attachments",
    body: "body",
    categoryId: "category",
    currency: "currency",
    durationMinutes: "duration",
    itineraryItemId: "linkedStop",
    metadata: "metadata",
    notes: "notes",
    placeId: "place",
    spentAt: "spentAt",
    startsAt: "startsAt",
    status: "status",
    summary: "summary",
    timezone: "timezone",
    title: "title",
    totalLimit: "totalLimit",
    types: "types"
  };
  const fieldKey = fieldKeyByName[field];

  return fieldKey ? t(`fields.${fieldKey}`) : t("fieldUnknown", { field });
}

function invalidateConflictQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  tripId: string,
  entityType: string
) {
  void queryClient.invalidateQueries({ queryKey: tripKeys.detail(tripId) });

  if (entityType === "ITINERARY_ITEM") {
    void queryClient.invalidateQueries({ queryKey: itineraryKeys.items(tripId) });
    void queryClient.invalidateQueries({ queryKey: itineraryKeys.routeItems(tripId) });
    void queryClient.invalidateQueries({ queryKey: placeKeys.byTrip(tripId) });
  }

  if (entityType === "NOTE") {
    void queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
  }

  if (entityType === "EXPENSE" || entityType === "BUDGET") {
    void queryClient.invalidateQueries({ queryKey: expenseKeys.byTrip(tripId) });
  }
}

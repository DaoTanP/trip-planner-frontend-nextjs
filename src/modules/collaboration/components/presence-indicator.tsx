"use client";

import { Eye, PencilLine } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { collaborationColorClassNames } from "@/theme";

import type { PresenceEntry } from "../types/presence.types";
import { PresenceTooltip } from "./presence-tooltip";

export function ViewingBadge({
  name,
  className
}: {
  name: string;
  className?: string | undefined;
}) {
  const t = useTranslations("trip.editor.collaboration");
  const label = t("viewing", { name });

  return (
    <PresenceTooltip label={label}>
      <span
        className={cn(
          "inline-flex min-w-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs",
          collaborationColorClassNames.presencePill,
          className
        )}
      >
        <Eye className="size-3 shrink-0" aria-hidden="true" />
        <span className="truncate">{label}</span>
      </span>
    </PresenceTooltip>
  );
}

export function EditingBadge({
  name,
  replying = false,
  className
}: {
  name: string;
  replying?: boolean | undefined;
  className?: string | undefined;
}) {
  const t = useTranslations("trip.editor.collaboration");
  const label = replying ? t("replying", { name }) : t("editing", { name });

  return (
    <PresenceTooltip label={label}>
      <span
        className={cn(
          "inline-flex min-w-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs",
          collaborationColorClassNames.presencePill,
          className
        )}
      >
        <PencilLine className="size-3 shrink-0" aria-hidden="true" />
        <span className="truncate">{label}</span>
      </span>
    </PresenceTooltip>
  );
}

export function PresenceIndicator({
  entries,
  className
}: {
  entries: PresenceEntry[];
  className?: string | undefined;
}) {
  const t = useTranslations("trip.editor.collaboration");
  const primaryEntry = entries[0];

  if (!primaryEntry) {
    return null;
  }

  const remainingCount = Math.max(0, entries.length - 1);
  const primaryLabel =
    primaryEntry.state === "REPLYING"
      ? t("replying", { name: primaryEntry.userName })
      : primaryEntry.state === "EDITING"
        ? t("editing", { name: primaryEntry.userName })
        : t("viewing", { name: primaryEntry.userName });
  const label =
    remainingCount > 0 ? `${primaryLabel} / ${t("more", { count: remainingCount })}` : primaryLabel;
  const Icon = primaryEntry.state === "VIEWING" ? Eye : PencilLine;

  return (
    <PresenceTooltip label={label} className={className}>
      <span
        className={cn(
          "inline-flex min-w-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs",
          collaborationColorClassNames.presencePill
        )}
      >
        <Icon className="size-3 shrink-0" aria-hidden="true" />
        <span className="truncate">{label}</span>
      </span>
    </PresenceTooltip>
  );
}

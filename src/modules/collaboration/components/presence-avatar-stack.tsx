"use client";

import { cn } from "@/lib/utils";

import type { PresenceEntry } from "../types/presence.types";

export function PresenceAvatarStack({
  entries,
  max = 3,
  className
}: {
  entries: PresenceEntry[];
  max?: number;
  className?: string | undefined;
}) {
  const visibleEntries = entries.slice(0, max);
  const hiddenCount = Math.max(0, entries.length - visibleEntries.length);

  if (entries.length === 0) {
    return null;
  }

  return (
    <span className={cn("inline-flex items-center", className)}>
      {visibleEntries.map((entry, index) => (
        <span
          key={entry.userId}
          title={entry.userName}
          className={cn(
            "flex size-7 items-center justify-center rounded-full border-2 border-card bg-primary text-[0.65rem] font-semibold text-primary-foreground shadow-sm",
            index > 0 && "-ml-2"
          )}
        >
          {getInitials(entry.userName)}
        </span>
      ))}
      {hiddenCount > 0 ? (
        <span className="-ml-2 flex size-7 items-center justify-center rounded-full border-2 border-card bg-muted text-[0.65rem] font-semibold text-muted-foreground shadow-sm">
          +{hiddenCount}
        </span>
      ) : null}
    </span>
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";

  return `${first}${second}`.toUpperCase();
}

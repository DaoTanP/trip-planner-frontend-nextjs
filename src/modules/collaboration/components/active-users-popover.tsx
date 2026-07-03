"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, LocateFixed, PencilLine, Users } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

import { getUniquePresenceUsers } from "../hooks/use-presence";
import type { PresenceEntry } from "../types/presence.types";
import { PresenceAvatarStack } from "./presence-avatar-stack";

export function ActiveUsersPopover({
  entries,
  followedUserId,
  onFollowUser,
  className
}: {
  entries: PresenceEntry[];
  followedUserId?: string | undefined;
  onFollowUser?: ((userId?: string) => void) | undefined;
  className?: string | undefined;
}) {
  const t = useTranslations("trip.editor.collaboration");
  const rootRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const users = useMemo(() => getUniquePresenceUsers(entries), [entries]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (target instanceof Node && !rootRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (users.length === 0) {
    return null;
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        className="inline-flex min-w-0 items-center gap-2 rounded-md px-1 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={t("activeUsersLabel", { count: users.length })}
        onClick={() => setIsOpen((current) => !current)}
      >
        <PresenceAvatarStack entries={users} />
        <span className="max-w-40 truncate">{formatPresenceSummary(users, t)}</span>
      </button>

      {isOpen ? (
        <div
          role="dialog"
          aria-label={t("activeUsersTitle")}
          className="absolute right-0 top-full z-50 mt-1 grid w-72 gap-1 rounded-md border bg-popover p-2 text-sm text-popover-foreground shadow-md"
        >
          <div className="flex items-center gap-2 border-b px-2 py-1.5 text-xs font-medium text-muted-foreground">
            <Users className="size-3.5" aria-hidden="true" />
            {t("activeUsersTitle")}
          </div>
          <div className="grid gap-1">
            {users.map((entry) => {
              const isEditing = entry.state === "EDITING" || entry.state === "REPLYING";
              const Icon = isEditing ? PencilLine : Eye;

              return (
                <div
                  key={entry.userId}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-md px-2 py-1.5"
                >
                  <PresenceAvatarStack entries={[entry]} max={1} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{entry.userName}</p>
                    <p className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                      <Icon className="size-3 shrink-0" aria-hidden="true" />
                      <span className="truncate">{formatPresenceAction(entry, t)}</span>
                    </p>
                  </div>
                  {onFollowUser ? (
                    <button
                      type="button"
                      className={cn(
                        "inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-xs font-medium transition-colors focus-visible:outline-2",
                        followedUserId === entry.userId
                          ? "bg-accent text-accent-foreground hover:bg-accent/90"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                      aria-pressed={followedUserId === entry.userId}
                      aria-label={
                        followedUserId === entry.userId
                          ? t("follow.stop", { name: entry.userName })
                          : t("follow.start", { name: entry.userName })
                      }
                      onClick={() =>
                        onFollowUser(followedUserId === entry.userId ? undefined : entry.userId)
                      }
                    >
                      <LocateFixed className="size-3" aria-hidden="true" />
                      <span>
                        {followedUserId === entry.userId
                          ? t("follow.following")
                          : t("follow.follow")}
                      </span>
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatPresenceSummary(entries: PresenceEntry[], t: ReturnType<typeof useTranslations>) {
  const visibleNames = entries
    .slice(0, 2)
    .map((entry) => entry.userName)
    .join(" / ");
  const hiddenCount = Math.max(0, entries.length - 2);

  return hiddenCount > 0
    ? t("summaryWithMore", { names: visibleNames, count: hiddenCount })
    : t("summary", { names: visibleNames });
}

function formatPresenceAction(entry: PresenceEntry, t: ReturnType<typeof useTranslations>) {
  if (entry.state === "REPLYING") {
    return t("replyingOn", { entity: t(`entityTypes.${entry.entityType}`) });
  }

  if (entry.state === "EDITING") {
    return t("editingOn", { entity: t(`entityTypes.${entry.entityType}`) });
  }

  return t("viewingOn", { entity: t(`entityTypes.${entry.entityType}`) });
}

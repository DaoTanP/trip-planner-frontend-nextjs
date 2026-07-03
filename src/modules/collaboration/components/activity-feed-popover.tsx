"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Clock, Move, PencilLine, Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import type { MutationEventDto } from "@/services/api/contracts";

import { useActivityFeed } from "../hooks/use-activity-feed";
import type { PresenceEntry } from "../types/presence.types";

export function ActivityFeedPopover({
  tripId,
  currentUserId,
  presenceEntries,
  className
}: {
  tripId: string;
  currentUserId?: string | undefined;
  presenceEntries?: PresenceEntry[] | undefined;
  className?: string | undefined;
}) {
  const t = useTranslations("trip.editor.collaboration.activity");
  const locale = useLocale();
  const rootRef = useRef<HTMLDivElement>(null);
  const events = useActivityFeed(tripId);
  const [isOpen, setIsOpen] = useState(false);
  const actorNameById = useMemo(() => {
    const names = new Map<string, string>();

    for (const entry of presenceEntries ?? []) {
      names.set(entry.userId, entry.userName);
    }

    return names;
  }, [presenceEntries]);

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

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        className="inline-flex h-8 min-w-0 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={t("label", { count: events.length })}
        onClick={() => setIsOpen((current) => !current)}
      >
        <Activity className="size-3.5" aria-hidden="true" />
        <span>{events.length}</span>
      </button>

      {isOpen ? (
        <div
          role="dialog"
          aria-label={t("title")}
          className="absolute right-0 top-full z-50 mt-1 grid w-80 gap-1 rounded-md border bg-popover p-2 text-sm text-popover-foreground shadow-md"
        >
          <div className="flex items-center gap-2 border-b px-2 py-1.5 text-xs font-medium text-muted-foreground">
            <Activity className="size-3.5" aria-hidden="true" />
            {t("title")}
          </div>
          {events.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <div className="grid max-h-80 gap-1 overflow-y-auto">
              {events.slice(0, 20).map((event) => (
                <ActivityFeedItem
                  key={event.id}
                  event={event}
                  locale={locale}
                  currentUserId={currentUserId}
                  actorName={event.actorId ? actorNameById.get(event.actorId) : undefined}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function ActivityFeedItem({
  event,
  locale,
  currentUserId,
  actorName
}: {
  event: MutationEventDto;
  locale: string;
  currentUserId?: string | undefined;
  actorName?: string | undefined;
}) {
  const t = useTranslations("trip.editor.collaboration.activity");
  const operation = getOperationKey(event.operation);
  const entity = getEntityLabel(event.entityType, t);
  const actor =
    event.actorId === currentUserId
      ? t("actors.you")
      : (actorName ?? (event.actorId ? t("actors.someone") : t("actors.system")));
  const createdAt = new Date(event.createdAt);
  const timestamp = Number.isNaN(createdAt.getTime())
    ? ""
    : new Intl.DateTimeFormat(locale, {
        hour: "2-digit",
        minute: "2-digit"
      }).format(createdAt);

  return (
    <div className="grid grid-cols-[auto_1fr] gap-2 rounded-md px-2 py-1.5">
      <span className="mt-0.5 inline-flex size-6 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {renderOperationIcon(operation)}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm">
          {t(`operations.${operation}`, {
            actor,
            entity
          })}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="size-3" aria-hidden="true" />
          <span>{timestamp || t("timeUnknown")}</span>
          <span aria-hidden="true">{"\u00b7"}</span>
          <span>{t("revision", { value: event.revision })}</span>
        </p>
      </div>
    </div>
  );
}

function getOperationKey(operation: string) {
  if (operation === "ENTITY_CREATED") {
    return "created";
  }

  if (operation === "ENTITY_DELETED") {
    return "deleted";
  }

  if (operation === "ENTITY_MOVED" || operation === "ENTITY_REBALANCED") {
    return "reordered";
  }

  return "updated";
}

function renderOperationIcon(operation: ReturnType<typeof getOperationKey>) {
  if (operation === "created") {
    return <Plus className="size-3.5" aria-hidden="true" />;
  }

  if (operation === "deleted") {
    return <Trash2 className="size-3.5" aria-hidden="true" />;
  }

  if (operation === "reordered") {
    return <Move className="size-3.5" aria-hidden="true" />;
  }

  return <PencilLine className="size-3.5" aria-hidden="true" />;
}

function getEntityLabel(entityType: string, t: ReturnType<typeof useTranslations>) {
  if (entityType === "TRIP") {
    return t("entityTypes.TRIP");
  }

  if (entityType === "ITINERARY_ITEM") {
    return t("entityTypes.ITINERARY_ITEM");
  }

  if (entityType === "TRIP_ROUTE_PREFERENCE") {
    return t("entityTypes.TRIP_ROUTE_PREFERENCE");
  }

  if (entityType === "NOTE") {
    return t("entityTypes.NOTE");
  }

  if (entityType === "EXPENSE") {
    return t("entityTypes.EXPENSE");
  }

  if (entityType === "BUDGET") {
    return t("entityTypes.BUDGET");
  }

  if (entityType === "COLLABORATOR") {
    return t("entityTypes.COLLABORATOR");
  }

  return t("entityTypes.UNKNOWN");
}

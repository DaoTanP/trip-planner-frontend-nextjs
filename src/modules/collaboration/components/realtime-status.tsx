"use client";

import { CheckCircle2, RefreshCw, Users, WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { semanticColorClassNames } from "@/theme";

import { usePresenceConnectionStatus } from "../hooks/use-presence";

export function RealtimeStatus({
  tripId,
  className
}: {
  tripId: string;
  className?: string | undefined;
}) {
  const t = useTranslations("trip.editor.collaboration.realtime");
  const { status, transport } = usePresenceConnectionStatus(tripId);
  const isReconnecting = status === "connecting" || status === "reconnecting";
  const label =
    status === "idle"
      ? t("idle")
      : transport === "local"
        ? t("local")
        : isReconnecting
          ? t("reconnecting")
          : status === "connected"
            ? t("connected")
            : t("idle");
  const Icon =
    status === "idle"
      ? WifiOff
      : transport === "local"
        ? Users
        : isReconnecting
          ? RefreshCw
          : CheckCircle2;

  return (
    <span
      title={label}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs text-muted-foreground",
        transport === "websocket" && isReconnecting && semanticColorClassNames.warningSubtle,
        className
      )}
    >
      <Icon
        className={cn("size-3.5 shrink-0", isReconnecting && "animate-spin")}
        aria-hidden="true"
      />
      <span className="truncate">{label}</span>
    </span>
  );
}

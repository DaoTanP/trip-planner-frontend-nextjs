"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function PresenceTooltip({
  label,
  children,
  className
}: {
  label: string;
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <span
      tabIndex={0}
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex min-w-0 focus-visible:outline-2 focus-visible:outline-offset-2",
        className
      )}
    >
      {children}
    </span>
  );
}

import { semanticColorClassNames } from "./semantic-colors";

export const syncColorClassNames = {
  conflictFrame: "border-destructive ring-2 ring-destructive/20",
  conflictBadge: "bg-destructive/10 text-destructive",
  failed: semanticColorClassNames.errorSubtle,
  retrying: semanticColorClassNames.infoSubtle,
  sending: semanticColorClassNames.infoSubtle,
  queued: "border-muted bg-muted text-muted-foreground"
} as const;

export const syncStateBadgeClassNames = {
  conflicted: syncColorClassNames.conflictBadge,
  failed: syncColorClassNames.failed,
  retrying: syncColorClassNames.retrying,
  sending: syncColorClassNames.sending,
  queued: syncColorClassNames.queued
} as const;

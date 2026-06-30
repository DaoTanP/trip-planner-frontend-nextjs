export const uiStateColorClassNames = {
  brandMark: "bg-primary text-primary-foreground",
  primaryAction: "bg-accent text-accent-foreground hover:bg-accent/90",
  outlineAction: "border border-input bg-background hover:bg-muted hover:text-foreground",
  secondaryAction: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghostAction: "hover:bg-muted hover:text-foreground",
  linkAction: "h-auto px-0 py-0 text-primary underline-offset-4 hover:underline",
  defaultBadge: "border-transparent bg-primary text-primary-foreground",
  secondaryBadge: "border-transparent bg-secondary text-secondary-foreground",
  outlineBadge: "text-foreground",
  selectedControl: "bg-secondary text-secondary-foreground hover:bg-secondary",
  selectedControlText: "text-secondary-foreground",
  heroGlow: "bg-yellow-500/20"
} as const;

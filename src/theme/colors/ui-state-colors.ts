export const uiStateColorClassNames = {
  brandMark: "bg-primary text-primary-foreground",
  primaryAction: "bg-primary text-primary-foreground hover:bg-primary/90",
  outlineAction: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
  secondaryAction: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghostAction: "hover:bg-accent hover:text-accent-foreground",
  linkAction: "h-auto px-0 py-0 text-primary underline-offset-4 hover:underline",
  defaultBadge: "border-transparent bg-primary text-primary-foreground",
  secondaryBadge: "border-transparent bg-secondary text-secondary-foreground",
  outlineBadge: "text-foreground",
  selectedControl: "bg-primary text-primary-foreground hover:bg-primary",
  selectedControlText: "text-primary-foreground",
  heroGlow: "bg-yellow-500/20"
} as const;

export const tripStateColors = {
  default: {
    css: "var(--trip-state-default)",
    hex: "#2563eb"
  },
  selected: {
    css: "var(--trip-state-selected)",
    hex: "#d4537e"
  },
  active: {
    css: "var(--trip-state-active)",
    hex: "#f97316"
  },
  hover: {
    css: "var(--trip-state-hover)",
    hex: "#0f766e"
  },
  focused: {
    css: "var(--trip-state-focused)",
    hex: "#0f766e"
  },
  inactive: {
    css: "var(--trip-state-inactive)",
    hex: "#64748b"
  }
} as const;

export const tripStateColorClassNames = {
  selectedFrame: "border-accent bg-accent-subtle ring-2 ring-accent/20",
  hoverFrame: "border-trip-state-hover ring-1 ring-trip-state-hover/30",
  focusedSurface: "bg-trip-state-focused/10",
  selectedResultFrame: "border-primary ring-1 ring-primary/30",
  insertionIndicator: "before:bg-trip-state-active"
} as const;

import { tripStateColors } from "./trip-state-colors";

export const markerColors = {
  default: tripStateColors.default,
  selected: tripStateColors.selected,
  hover: tripStateColors.hover,
  focused: tripStateColors.focused,
  cluster: tripStateColors.hover,
  label: {
    css: "var(--marker-label)",
    hex: "#ffffff"
  },
  stroke: {
    css: "var(--marker-stroke)",
    hex: "#ffffff"
  },
  shadow: {
    css: "var(--marker-shadow)",
    hex: "#000000"
  }
} as const;

export const markerColorClassNames = {
  default: "bg-marker-default text-marker-label",
  active: "border-marker-focused bg-marker-focused/10 text-marker-focused",
  selectedBadge: "border-marker-selected bg-marker-selected text-marker-label",
  selected: "bg-marker-selected text-marker-label",
  hover: "bg-marker-hover text-marker-label"
} as const;

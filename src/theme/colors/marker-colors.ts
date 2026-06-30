import { tripStateColors } from "./trip-state-colors";

export type MarkerColorMode = "light" | "dark";

export const markerPalettes = {
  light: {
    selected: "#d4537e",
    muted: "#64748b",
    label: "#ffffff",
    stroke: "#ffffff",
    halo: "#d4537e",
    shadow: "#000000"
  },
  dark: {
    selected: "#ed93b1",
    muted: "#94a3b8",
    label: "#0f172a",
    stroke: "#0f172a",
    halo: "#ed93b1",
    shadow: "#000000"
  }
} as const;

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

export function getMarkerPalette(mode: MarkerColorMode) {
  return markerPalettes[mode];
}

import { tripStateColors } from "./trip-state-colors";

export const routeColors = {
  default: tripStateColors.default,
  active: tripStateColors.active,
  hover: tripStateColors.hover,
  focused: tripStateColors.focused,
  inactive: tripStateColors.inactive
} as const;

export const routeColorClassNames = {
  focusedSegment: "bg-route-focused/10 text-foreground ring-1 ring-route-focused/40",
  activeModeOption: "bg-route-focused/10 text-foreground",
  activeModeCheck: "text-route-active"
} as const;

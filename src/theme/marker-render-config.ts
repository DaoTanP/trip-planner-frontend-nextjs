export type MarkerVisualState = "default" | "emphasis" | "selected";

export const markerRenderConfig = {
  google: {
    anchor: {
      x: 12,
      y: 24
    },
    labelFontSize: "11px",
    labelFontWeight: "700",
    path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z",
    scale: {
      default: 1.55,
      emphasis: 1.65,
      selected: 1.75
    },
    strokeWeight: 2,
    selectedStrokeWeight: 4,
    zIndex: {
      default: 10,
      emphasis: 20,
      selected: 30
    }
  },
  mapLibre: {
    clusterCircleRadius: ["step", ["get", "point_count"], 18, 20, 24, 60, 30] as [
      "step",
      ["get", string],
      number,
      number,
      number,
      number,
      number
    ],
    clusterMaxZoom: 16,
    clusterRadius: 24,
    clusterStrokeWidth: 3,
    labelFont: ["Open Sans Bold", "Arial Unicode MS Bold"] as string[],
    labelTextSize: ["case", ["get", "isSelected"], 18, 15] as [
      "case",
      ["get", string],
      number,
      number
    ],
    markerCircleRadius: ["case", ["get", "isSelected"], 18, ["get", "isHovered"], 16, 15] as [
      "case",
      ["get", string],
      number,
      ["get", string],
      number,
      number
    ],
    markerHaloFillColor: "rgba(0, 0, 0, 0)",
    markerHaloCircleRadius: 24,
    markerHaloStrokeWidth: 3,
    markerStrokeWidth: ["case", ["get", "isSelected"], 4, ["get", "isFocused"], 4, 3] as [
      "case",
      ["get", string],
      number,
      ["get", string],
      number,
      number
    ],
    shadowBlur: 0.2,
    shadowCircleRadius: ["case", ["get", "isSelected"], 24, ["get", "isHovered"], 22, 19] as [
      "case",
      ["get", string],
      number,
      ["get", string],
      number,
      number
    ],
    shadowOpacity: ["case", ["get", "isSelected"], 0.28, ["get", "isHovered"], 0.24, 0.18] as [
      "case",
      ["get", string],
      number,
      ["get", string],
      number,
      number
    ]
  },
  osm: {
    emphasizedScaleClassName: "scale-105",
    selectedScaleClassName: "scale-110"
  }
};

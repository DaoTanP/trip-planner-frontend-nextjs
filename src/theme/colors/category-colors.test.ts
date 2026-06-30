import { describe, expect, it } from "vitest";

import {
  categoryColors,
  type CategoryColorMode,
  getItineraryItemTypeCategoryKey,
  getPlaceCategoryKey,
  ITINERARY_ITEM_TYPE_TO_CATEGORY_KEY,
  PLACE_CATEGORY_TO_CATEGORY_KEY
} from "./category-colors";

const colorModes = ["light", "dark"] satisfies CategoryColorMode[];
const accentHexValues = new Set(["#d4537e", "#ed93b1"]);

describe("category color taxonomy", () => {
  it("maps every itinerary item type to a canonical category color", () => {
    for (const categoryKey of Object.values(ITINERARY_ITEM_TYPE_TO_CATEGORY_KEY)) {
      expect(categoryColors[categoryKey]).toBeDefined();
    }

    expect(getItineraryItemTypeCategoryKey("FOOD")).toBe("food");
    expect(getItineraryItemTypeCategoryKey("TRANSPORTATION")).toBe("transportation");
  });

  it("maps place categories into the shared planning taxonomy", () => {
    for (const categoryKey of Object.values(PLACE_CATEGORY_TO_CATEGORY_KEY)) {
      expect(categoryColors[categoryKey]).toBeDefined();
    }

    expect(getPlaceCategoryKey("restaurant")).toBe("food");
    expect(getPlaceCategoryKey("Cafe")).toBe("food");
    expect(getPlaceCategoryKey("food market")).toBe("food");
    expect(getPlaceCategoryKey("airport")).toBe("transportation");
    expect(getPlaceCategoryKey("museum")).toBe("culture");
    expect(getPlaceCategoryKey("unknown")).toBe("other");
  });

  it("keeps category badge pairs at AA contrast in every theme mode", () => {
    for (const categoryColor of Object.values(categoryColors)) {
      for (const mode of colorModes) {
        const { background, text } = categoryColor.badgeHex[mode];

        expect(getContrastRatio(background, text)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("keeps category marker colors distinct from the accent pair", () => {
    for (const categoryColor of Object.values(categoryColors)) {
      for (const mode of colorModes) {
        expect(accentHexValues.has(categoryColor.markerHex[mode])).toBe(false);
      }
    }
  });
});

function getContrastRatio(leftHex: string, rightHex: string) {
  const left = getRelativeLuminance(leftHex);
  const right = getRelativeLuminance(rightHex);
  const lighter = Math.max(left, right);
  const darker = Math.min(left, right);

  return (lighter + 0.05) / (darker + 0.05);
}

function getRelativeLuminance(hex: string) {
  const [red, green, blue] = parseHexColor(hex);
  const normalizeChannel = (channel: number) => {
    const normalized = channel / 255;

    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };

  return (
    0.2126 * normalizeChannel(red) +
    0.7152 * normalizeChannel(green) +
    0.0722 * normalizeChannel(blue)
  );
}

function parseHexColor(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");

  if (normalized.length !== 6) {
    throw new Error(`Expected a 6-digit hex color, received ${hex}`);
  }

  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16)
  ];
}

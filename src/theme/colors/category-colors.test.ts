import { describe, expect, it } from "vitest";

import {
  categoryColors,
  getItineraryItemTypeCategoryKey,
  getPlaceCategoryKey,
  ITINERARY_ITEM_TYPE_TO_CATEGORY_KEY,
  PLACE_CATEGORY_TO_CATEGORY_KEY
} from "./category-colors";

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
});

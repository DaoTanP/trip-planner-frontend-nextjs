import type { ItineraryItemTypeDto } from "@/services/api/contracts";

export type CategoryColorKey =
  | "activity"
  | "lodging"
  | "food"
  | "shopping"
  | "transportation"
  | "culture"
  | "other";

export type CategoryColorMode = "light" | "dark";

export const categoryColors = {
  activity: {
    badgeClassName: "bg-category-activity-bg text-category-activity-fg",
    badgeHex: {
      light: { background: "#e1f5ee", text: "#085041" },
      dark: { background: "#085041", text: "#9fe1cb" }
    },
    markerClassName: "bg-category-activity-marker",
    markerHex: {
      light: "#085041",
      dark: "#9fe1cb"
    }
  },
  lodging: {
    badgeClassName: "bg-category-lodging-bg text-category-lodging-fg",
    badgeHex: {
      light: { background: "#eeedfe", text: "#3c3489" },
      dark: { background: "#3c3489", text: "#cecbf6" }
    },
    markerClassName: "bg-category-lodging-marker",
    markerHex: {
      light: "#3c3489",
      dark: "#cecbf6"
    }
  },
  food: {
    badgeClassName: "bg-category-food-bg text-category-food-fg",
    badgeHex: {
      light: { background: "#faece7", text: "#712b13" },
      dark: { background: "#712b13", text: "#f5c4b3" }
    },
    markerClassName: "bg-category-food-marker",
    markerHex: {
      light: "#712b13",
      dark: "#f5c4b3"
    }
  },
  shopping: {
    badgeClassName: "bg-category-shopping-bg text-category-shopping-fg",
    badgeHex: {
      light: { background: "#ecf7e8", text: "#2f5d1e" },
      dark: { background: "#2f5d1e", text: "#bde5ad" }
    },
    markerClassName: "bg-category-shopping-marker",
    markerHex: {
      light: "#2f5d1e",
      dark: "#bde5ad"
    }
  },
  transportation: {
    badgeClassName: "bg-category-transportation-bg text-category-transportation-fg",
    badgeHex: {
      light: { background: "#e7f0ff", text: "#164a8b" },
      dark: { background: "#164a8b", text: "#b9d5ff" }
    },
    markerClassName: "bg-category-transportation-marker",
    markerHex: {
      light: "#164a8b",
      dark: "#b9d5ff"
    }
  },
  culture: {
    badgeClassName: "bg-category-culture-bg text-category-culture-fg",
    badgeHex: {
      light: { background: "#fff3d8", text: "#6b4b00" },
      dark: { background: "#6b4b00", text: "#f7d78e" }
    },
    markerClassName: "bg-category-culture-marker",
    markerHex: {
      light: "#6b4b00",
      dark: "#f7d78e"
    }
  },
  other: {
    badgeClassName: "bg-category-other-bg text-category-other-fg",
    badgeHex: {
      light: { background: "#f1f5f9", text: "#334155" },
      dark: { background: "#334155", text: "#e2e8f0" }
    },
    markerClassName: "bg-category-other-marker",
    markerHex: {
      light: "#64748b",
      dark: "#94a3b8"
    }
  }
} satisfies Record<
  CategoryColorKey,
  {
    badgeClassName: string;
    badgeHex: Record<CategoryColorMode, { background: string; text: string }>;
    markerClassName: string;
    markerHex: Record<CategoryColorMode, string>;
  }
>;

export const ITINERARY_ITEM_TYPE_TO_CATEGORY_KEY = {
  ACTIVITY: "activity",
  LODGING: "lodging",
  FOOD: "food",
  SHOPPING: "shopping",
  TRANSPORTATION: "transportation",
  OTHER: "other"
} satisfies Record<ItineraryItemTypeDto, CategoryColorKey>;

export const PLACE_CATEGORY_TO_CATEGORY_KEY: Record<string, CategoryColorKey> = {
  airport: "transportation",
  art_gallery: "culture",
  attraction: "activity",
  bakery: "food",
  bar: "food",
  cafe: "food",
  food_market: "food",
  gallery: "culture",
  lodging: "lodging",
  meal_takeaway: "food",
  museum: "culture",
  park: "activity",
  restaurant: "food",
  shopping_mall: "shopping",
  store: "shopping",
  tourist_attraction: "activity",
  train_station: "transportation",
  transit_station: "transportation"
};

export function getCategoryColor(categoryKey: CategoryColorKey) {
  return categoryColors[categoryKey];
}

export function getCategoryMarkerHex(categoryKey: CategoryColorKey, mode: CategoryColorMode) {
  return getCategoryColor(categoryKey).markerHex[mode];
}

export function getItineraryItemTypeCategoryKey(type: ItineraryItemTypeDto) {
  return ITINERARY_ITEM_TYPE_TO_CATEGORY_KEY[type];
}

export function getItineraryItemTypeCategoryColor(type: ItineraryItemTypeDto) {
  return getCategoryColor(getItineraryItemTypeCategoryKey(type));
}

export function getPlaceCategoryKey(category: string) {
  const normalizedCategory = category.trim().toLowerCase().replaceAll(" ", "_");

  return PLACE_CATEGORY_TO_CATEGORY_KEY[normalizedCategory] ?? "other";
}

export function getPlaceCategoryColor(category: string) {
  return getCategoryColor(getPlaceCategoryKey(category));
}

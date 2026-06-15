import type { ItineraryItemTypeDto } from "@/services/api/contracts";

export type CategoryColorKey =
  | "activity"
  | "lodging"
  | "food"
  | "shopping"
  | "transportation"
  | "culture"
  | "other";

export const categoryColors = {
  activity: {
    badgeClassName: "bg-sky-500/10 text-sky-700 dark:text-sky-300"
  },
  lodging: {
    badgeClassName: "bg-violet-500/10 text-violet-700 dark:text-violet-300"
  },
  food: {
    badgeClassName: "bg-amber-500/10 text-amber-700 dark:text-amber-300"
  },
  shopping: {
    badgeClassName: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
  },
  transportation: {
    badgeClassName: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
  },
  culture: {
    badgeClassName: "bg-violet-500/10 text-violet-700 dark:text-violet-300"
  },
  other: {
    badgeClassName: "bg-muted text-muted-foreground"
  }
} satisfies Record<CategoryColorKey, { badgeClassName: string }>;

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

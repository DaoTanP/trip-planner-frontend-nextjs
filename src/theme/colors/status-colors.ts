import type {
  ItineraryItemStatusDto,
  TripStatusDto,
  TripVisibilityDto
} from "@/services/api/contracts";

import { semanticColorClassNames } from "./semantic-colors";

export const statusColorClassNames = {
  itineraryItem: {
    PLANNED: semanticColorClassNames.neutralBadge,
    BOOKED: semanticColorClassNames.infoSubtle,
    COMPLETED: semanticColorClassNames.successBadge,
    CANCELLED: semanticColorClassNames.warningSubtle
  } satisfies Record<ItineraryItemStatusDto, string>,
  trip: {
    DRAFT: semanticColorClassNames.neutralBadge,
    PLANNED: semanticColorClassNames.infoSubtle,
    ACTIVE: semanticColorClassNames.infoSubtle,
    COMPLETED: semanticColorClassNames.successBadge,
    ARCHIVED: semanticColorClassNames.neutralBadge
  } satisfies Record<TripStatusDto, string>,
  visibility: {
    PRIVATE: semanticColorClassNames.neutralBadge,
    SHARED: semanticColorClassNames.infoSubtle,
    PUBLIC: semanticColorClassNames.successBadge
  } satisfies Record<TripVisibilityDto, string>
} as const;

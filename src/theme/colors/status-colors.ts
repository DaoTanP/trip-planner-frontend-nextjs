import { semanticColorClassNames } from "./semantic-colors";

export const statusColorClassNames = {
  trip: {
    COMPLETED: semanticColorClassNames.successBadge,
    DEFAULT: "border-transparent bg-secondary text-secondary-foreground"
  }
} as const;

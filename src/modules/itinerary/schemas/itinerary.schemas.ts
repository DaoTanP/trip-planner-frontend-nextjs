import { z } from "zod";

type ValidationValues = Record<string, string | number | Date>;
type ValidationT = (key: string, values?: ValidationValues) => string;

export function createItineraryItemSchema(t: ValidationT) {
  return z.object({
    placeId: z.string().optional(),
    title: z.string().min(1, t("required")),
    description: z
      .string()
      .max(5000, t("maxLength", { max: 5000 }))
      .optional()
  });
}

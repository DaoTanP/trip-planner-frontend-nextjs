import { z } from "zod";

type ValidationValues = Record<string, string | number | Date>;
type ValidationT = (key: string, values?: ValidationValues) => string;

export function createItineraryStopSchema(t: ValidationT) {
  return z.object({
    placeId: z.string().min(1, t("required")),
    day: z.number().int().min(1),
    notes: z
      .string()
      .max(500, t("maxLength", { max: 500 }))
      .optional()
  });
}

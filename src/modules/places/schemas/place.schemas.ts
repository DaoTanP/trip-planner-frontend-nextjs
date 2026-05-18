import { z } from "zod";

type ValidationValues = Record<string, string | number | Date>;
type ValidationT = (key: string, values?: ValidationValues) => string;

export function createPlaceSearchSchema(t: ValidationT) {
  return z.object({
    query: z
      .string()
      .min(1, t("required"))
      .max(120, t("maxLength", { max: 120 }))
  });
}

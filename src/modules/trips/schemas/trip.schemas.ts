import { z } from "zod";

type ValidationValues = Record<string, string | number | Date>;
type ValidationT = (key: string, values?: ValidationValues) => string;

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export function createTripSchema(t: ValidationT) {
  return z
    .object({
      title: z
        .string()
        .min(1, t("required"))
        .max(180, t("maxLength", { max: 180 })),
      description: z.preprocess(
        emptyToUndefined,
        z.string().max(5000, t("maxLength", { max: 5000 })).optional()
      ),
      startDate: z.preprocess(emptyToUndefined, z.string().optional()),
      endDate: z.preprocess(emptyToUndefined, z.string().optional())
    })
    .refine((values) => !values.startDate || !values.endDate || values.endDate >= values.startDate, {
      message: t("dateOrder"),
      path: ["endDate"]
    });
}

export type CreateTripFormValues = z.infer<ReturnType<typeof createTripSchema>>;

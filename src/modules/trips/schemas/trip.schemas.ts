import { z } from "zod";

type ValidationValues = Record<string, string | number | Date>;
type ValidationT = (key: string, values?: ValidationValues) => string;

export function createTripSchema(t: ValidationT) {
  return z
    .object({
      title: z
        .string()
        .min(1, t("required"))
        .max(180, t("maxLength", { max: 180 })),
      startDate: z.string().optional(),
      endDate: z.string().optional()
    })
    .refine(
      (values) => !values.startDate || !values.endDate || values.endDate >= values.startDate,
      {
        message: t("dateOrder"),
        path: ["endDate"]
      }
    );
}

export type CreateTripFormValues = z.infer<ReturnType<typeof createTripSchema>>;

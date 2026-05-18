import { z } from "zod";

type ValidationValues = Record<string, string | number | Date>;
type ValidationT = (key: string, values?: ValidationValues) => string;

export function createTripSchema(t: ValidationT) {
  return z
    .object({
      name: z
        .string()
        .min(1, t("required"))
        .max(120, t("maxLength", { max: 120 })),
      destination: z
        .string()
        .min(1, t("required"))
        .max(120, t("maxLength", { max: 120 })),
      startDate: z.string().min(1, t("required")),
      endDate: z.string().min(1, t("required"))
    })
    .refine((values) => new Date(values.endDate) >= new Date(values.startDate), {
      message: t("dateOrder"),
      path: ["endDate"]
    });
}

export type CreateTripFormValues = z.infer<ReturnType<typeof createTripSchema>>;

import { z } from "zod";

type ValidationValues = Record<string, string | number | Date>;
type ValidationT = (key: string, values?: ValidationValues) => string;

export function createLoginSchema(t: ValidationT) {
  return z.object({
    email: z.string().min(1, t("required")).email(t("email")),
    password: z
      .string()
      .min(1, t("required"))
      .min(8, t("minLength", { min: 8 }))
  });
}

export function createRegisterSchema(t: ValidationT) {
  return createLoginSchema(t).extend({
    name: z
      .string()
      .min(1, t("required"))
      .max(80, t("maxLength", { max: 80 }))
  });
}

export type LoginFormValues = z.infer<ReturnType<typeof createLoginSchema>>;
export type RegisterFormValues = z.infer<ReturnType<typeof createRegisterSchema>>;

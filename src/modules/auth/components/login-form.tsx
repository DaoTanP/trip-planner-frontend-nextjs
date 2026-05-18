"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { useForm } from "react-hook-form";

import { FieldError } from "@/components/shared/field-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useLoginMutation } from "../mutations/use-login-mutation";
import { createLoginSchema, type LoginFormValues } from "../schemas/auth.schemas";

export function LoginForm() {
  const tAuth = useTranslations("auth");
  const tValidation = useTranslations("validation");
  const loginMutation = useLoginMutation();
  const schema = useMemo(() => createLoginSchema(tValidation), [tValidation]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  return (
    <form
      className="grid gap-5"
      onSubmit={form.handleSubmit((values) => loginMutation.mutate(values))}
    >
      <div className="grid gap-2">
        <Label htmlFor="email">{tAuth("login.emailLabel")}</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder={tAuth("login.emailPlaceholder")}
          aria-invalid={Boolean(form.formState.errors.email)}
          aria-describedby="email-error"
          {...form.register("email")}
        />
        <FieldError id="email-error" message={form.formState.errors.email?.message} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="password">{tAuth("login.passwordLabel")}</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder={tAuth("login.passwordPlaceholder")}
          aria-invalid={Boolean(form.formState.errors.password)}
          aria-describedby="password-error"
          {...form.register("password")}
        />
        <FieldError id="password-error" message={form.formState.errors.password?.message} />
      </div>

      <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
        <LogIn aria-hidden="true" />
        {tAuth("login.submit")}
      </Button>
    </form>
  );
}

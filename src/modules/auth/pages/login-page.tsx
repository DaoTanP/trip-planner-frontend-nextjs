import { getTranslations } from "next-intl/server";

import { LoginForm } from "../components/login-form";

export async function LoginPage() {
  const t = await getTranslations("auth");

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-md border bg-card p-6 shadow-sm">
        <div className="mb-6 space-y-2">
          <h1 className="text-2xl font-semibold tracking-normal">{t("login.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("login.description")}</p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}

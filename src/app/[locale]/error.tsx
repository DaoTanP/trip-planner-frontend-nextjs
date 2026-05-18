"use client";

import { useTranslations } from "next-intl";

import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl items-center px-4 py-10">
      <ErrorState
        title={t("errors.page.title")}
        description={t("errors.page.description")}
        action={
          <Button type="button" onClick={reset}>
            {t("actions.retry")}
          </Button>
        }
      />
    </main>
  );
}

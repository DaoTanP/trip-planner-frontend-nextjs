import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { routes } from "@/constants/routes";

export default async function NotFoundPage() {
  const t = await getTranslations("common");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-normal">{t("errors.notFound.title")}</h1>
        <p className="text-muted-foreground">{t("errors.notFound.description")}</p>
      </div>
      <Button asChild>
        <Link href={routes.home}>{t("nav.home")}</Link>
      </Button>
    </main>
  );
}

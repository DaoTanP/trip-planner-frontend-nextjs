import { MapPinned } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { routes } from "@/constants/routes";

interface AppShellProps {
  children: ReactNode;
}

export async function AppShell({ children }: AppShellProps) {
  const t = await getTranslations("common");

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href={routes.home} className="flex min-w-0 items-center gap-2 font-semibold">
            <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <MapPinned className="size-5" aria-hidden="true" />
            </span>
            <span className="truncate">{t("app.name")}</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label={t("app.name")}>
            <Button asChild variant="ghost" size="sm">
              <Link href={routes.trips}>{t("nav.trips")}</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={routes.profile}>{t("nav.profile")}</Link>
            </Button>
          </nav>

          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}

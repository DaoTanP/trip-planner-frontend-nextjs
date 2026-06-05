import { ArrowRight, ListOrdered, MapPinned, Route } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { routes } from "@/constants/routes";

export default async function HomePage() {
  const t = await getTranslations("common");

  return (
    <main className="min-h-dvh bg-background">
      <header className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href={routes.home} className="flex min-w-0 items-center gap-2 font-semibold">
          <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <MapPinned className="size-5" aria-hidden="true" />
          </span>
          <span className="truncate">{t("app.name")}</span>
        </Link>
        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-12">
        <div className="flex flex-col justify-center gap-6">
          <div className="space-y-4">
            <p className="text-sm font-medium text-primary">{t("home.eyebrow")}</p>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-normal sm:text-5xl">
              {t("home.title")}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground">
              {t("home.description")}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href={routes.trips}>
                {t("home.primaryAction")}
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href={routes.login}>{t("home.secondaryAction")}</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 rounded-md border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold">{t("home.mapTitle")}</h2>
              <p className="text-sm text-muted-foreground">{t("home.mapSubtitle")}</p>
            </div>
            <Route className="size-5 text-primary" aria-hidden="true" />
          </div>

          <div className="relative min-h-80 overflow-hidden rounded-md border bg-secondary/40">
            <div className="absolute inset-x-6 top-10 h-40 rounded-full border-2 border-dashed border-primary/50" />
            <div className="absolute left-[16%] top-[26%] size-4 rounded-full bg-primary shadow-[0_0_0_6px_color-mix(in_oklab,var(--primary)_20%,transparent)]" />
            <div className="absolute left-[48%] top-[54%] size-4 rounded-full bg-accent shadow-[0_0_0_6px_color-mix(in_oklab,var(--accent)_25%,transparent)]" />
            <div className="absolute right-[18%] top-[32%] size-4 rounded-full bg-primary shadow-[0_0_0_6px_color-mix(in_oklab,var(--primary)_20%,transparent)]" />
            <div className="absolute bottom-4 left-4 right-4 grid gap-3 sm:grid-cols-3">
              {[1, 2, 3].map((stop) => (
                <div key={stop} className="rounded-md border bg-background/90 p-3 backdrop-blur">
                  <p className="text-xs text-muted-foreground">{t("home.stopLabel", { stop })}</p>
                  <p className="text-sm font-medium">{t("home.workspace.title")}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Metric
              icon={<MapPinned className="size-4" aria-hidden="true" />}
              value="18"
              label={t("home.stats.places")}
            />
            <Metric
              icon={<ListOrdered className="size-4" aria-hidden="true" />}
              value="14"
              label={t("home.stats.stops")}
            />
            <Metric
              icon={<Route className="size-4" aria-hidden="true" />}
              value="840"
              label={t("home.stats.distance")}
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function Metric({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border bg-card p-3">
      <span className="flex size-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
        {icon}
      </span>
      <div>
        <p className="text-base font-semibold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

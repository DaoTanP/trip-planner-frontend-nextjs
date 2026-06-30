import { Home, Route, UserRound } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { routes } from "@/constants/routes";
import { Link } from "@/i18n/routing";

export default async function NotFoundPage() {
  const t = await getTranslations("common");
  const linkCards = [
    { href: routes.home, label: t("nav.home"), Icon: Home },
    { href: routes.trips, label: t("nav.trips"), Icon: Route },
    { href: routes.profile, label: t("nav.profile"), Icon: UserRound }
  ] as const;

  return (
    <main className="min-h-dvh bg-background px-5 py-10 sm:px-8 xl:px-10">
      <section className="mx-auto grid min-h-[calc(100dvh-5rem)] w-full max-w-7xl gap-12 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] xl:gap-16">
        <div className="flex min-h-[28rem] items-center xl:min-h-[42rem]">
          <div className="w-full max-w-xl">
            <h1 className="text-5xl font-semibold leading-[1.05] tracking-normal text-accent sm:text-6xl xl:text-7xl">
              404
              <span className="block text-3xl sm:text-4xl xl:text-5xl">
                {t("errors.notFound.title")}
              </span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">
              {t("errors.notFound.description")}
            </p>

            <nav
              aria-label={t("errors.notFound.title")}
              className="mt-12 grid max-w-md grid-cols-3 gap-3"
            >
              {linkCards.map(({ href, label, Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex h-24 min-w-0 flex-col items-center justify-center gap-3 rounded-md border bg-card px-3 text-center text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
                  <span className="w-full truncate">{label}</span>
                </Link>
              ))}
            </nav>
          </div>
        </div>

        <div className="flex min-h-[22rem] items-center justify-center xl:min-h-[42rem]">
          <Image
            src="/images/404-error.svg"
            alt=""
            width={750}
            height={500}
            priority
            className="h-auto w-full max-w-[36rem] xl:max-w-none"
          />
        </div>
      </section>
    </main>
  );
}

import { ArrowRight, CalendarDays, ListOrdered, MapPinned, Route } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { routes } from "@/constants/routes";
import { uiStateColorClassNames } from "@/theme";
import Image from "next/image";

export default async function HomePage() {
  const t = await getTranslations("common");

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <Image src="/images/hero2.jpg" alt="" className="h-full w-full object-cover" fill />

        <div className="absolute inset-0 bg-black/5" />

        <div className="absolute inset-0 bg-linear-to-b from-black/20 via-black/30 to-black/70" />
      </div>

      {/* Header */}
      <header className="relative z-20 mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href={routes.home} className="flex items-center gap-3 text-white">
          <div className="flex size-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
            <MapPinned className="size-5" />
          </div>

          <span className="text-lg font-semibold truncate">{t("app.name")}</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-white/80 md:flex">
          <a href="#features">Features</a>
          <a href="#planner">Planner</a>
          <a href="#pricing">Pricing</a>
        </nav>

        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 flex min-h-[calc(100vh-5rem)] items-center">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center px-4 text-center sm:px-6 lg:px-8">
          {/* Badge */}
          <div className="mb-8 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white backdrop-blur">
            ✈️ Smart itinerary planning powered by AI
          </div>

          {/* Heading */}
          <h1 className="max-w-5xl text-5xl tracking-tight text-white md:text-7xl">
            Plan your next
            <div className="relative mt-2 inline-block">
              <div
                className={`absolute left-1/2 top-1/2 -z-10 h-full w-[110%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[0.5em] ${uiStateColorClassNames.heroGlow}`}
              />

              <span className="bg-linear-to-r from-orange-300 to-yellow-200 bg-clip-text px-2 font-bold italic text-transparent">
                unforgettable journey
              </span>
            </div>
          </h1>

          {/* Description */}
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/75 md:text-xl">
            Build itineraries, optimize routes, organize stops, manage travel budgets, and
            collaborate with friends from a single platform.
          </p>

          {/* Search CTA */}
          <div className="mt-10 flex w-full max-w-2xl flex-col gap-3 rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur md:flex-row">
            <input
              placeholder="Where do you want to go?"
              className="h-14 flex-1 rounded-xl bg-white px-5 text-black outline-none"
            />

            <Button size="lg" className="h-14 rounded-xl px-8">
              Start Planning
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </div>

          {/* Stats */}
          <div className="my-16 grid grid-cols-2 gap-6 text-white md:grid-cols-4">
            <div>
              <p className="text-3xl font-bold">10k+</p>
              <p className="text-sm text-white/60">Trips Planned</p>
            </div>

            <div>
              <p className="text-3xl font-bold">120+</p>
              <p className="text-sm text-white/60">Countries</p>
            </div>

            <div>
              <p className="text-3xl font-bold">50k+</p>
              <p className="text-sm text-white/60">Destinations</p>
            </div>

            <div>
              <p className="text-3xl font-bold">99%</p>
              <p className="text-sm text-white/60">Satisfaction</p>
            </div>
          </div>
        </div>
      </section>

      {/* Floating Feature Cards */}
      <section id="features" className="relative z-20 -mt-24 pb-24">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 md:grid-cols-3">
          <div className="rounded-3xl border bg-background/95 p-8 shadow-xl backdrop-blur">
            <Route className="mb-4 size-10 text-primary" />

            <h3 className="mb-2 text-xl font-semibold">Route Optimization</h3>

            <p className="text-muted-foreground">
              Automatically find the most efficient route between destinations.
            </p>
          </div>

          <div className="rounded-3xl border bg-background/95 p-8 shadow-xl backdrop-blur">
            <ListOrdered className="mb-4 size-10 text-primary" />

            <h3 className="mb-2 text-xl font-semibold">Smart Itineraries</h3>

            <p className="text-muted-foreground">
              Organize attractions, hotels, restaurants, and activities in one timeline.
            </p>
          </div>

          <div className="rounded-3xl border bg-background/95 p-8 shadow-xl backdrop-blur">
            <CalendarDays className="mb-4 size-10 text-primary" />

            <h3 className="mb-2 text-xl font-semibold">Trip Scheduling</h3>

            <p className="text-muted-foreground">
              Plan every day of your trip with drag-and-drop scheduling tools.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

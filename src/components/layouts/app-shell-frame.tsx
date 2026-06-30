"use client";

import { MapPinned } from "lucide-react";
import type { ReactNode } from "react";

import { routes } from "@/constants/routes";
import { Link, usePathname } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { uiStateColorClassNames } from "@/theme";

import { LocaleSwitcher } from "../shared/locale-switcher";
import { ThemeToggle } from "../shared/theme-toggle";
import { Button } from "../ui/button";

interface AppShellFrameProps {
  children: ReactNode;
  labels: {
    appName: string;
    trips: string;
    profile: string;
  };
}

export function AppShellFrame({ children, labels }: AppShellFrameProps) {
  const pathname = usePathname();
  const normalizedPathname = pathname.replace(/^\/(en|vi)(?=\/|$)/, "") || "/";
  const isTripEditorRoute =
    normalizedPathname === "/trips/[tripId]/edit" ||
    /^\/trips\/[^/]+\/edit$/.test(normalizedPathname);

  return (
    <div className="min-h-dvh bg-background">
      {!isTripEditorRoute ? (
        <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
          <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <Link href={routes.home} className="flex min-w-0 items-center gap-2 font-semibold">
              <span
                className={`flex size-9 items-center justify-center rounded-md ${uiStateColorClassNames.brandMark}`}
              >
                <MapPinned className="size-5" aria-hidden="true" />
              </span>
              <span className="truncate">{labels.appName}</span>
            </Link>

            <nav className="hidden items-center gap-1 md:flex" aria-label={labels.appName}>
              <Button asChild variant="ghost" size="sm">
                <Link href={routes.trips}>{labels.trips}</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href={routes.profile}>{labels.profile}</Link>
              </Button>
            </nav>

            <div className="flex items-center gap-2">
              <LocaleSwitcher />
              <ThemeToggle />
            </div>
          </div>
        </header>
      ) : null}

      <main
        className={cn(
          "w-full",
          isTripEditorRoute ? "max-w-none px-0 py-0" : "mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
        )}
      >
        {children}
      </main>
    </div>
  );
}

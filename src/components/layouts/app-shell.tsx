import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { AppShellFrame } from "./app-shell-frame";

interface AppShellProps {
  children: ReactNode;
}

export async function AppShell({ children }: AppShellProps) {
  const t = await getTranslations("common");

  return (
    <AppShellFrame
      labels={{
        appName: t("app.name"),
        trips: t("nav.trips"),
        profile: t("nav.profile")
      }}
    >
      {children}
    </AppShellFrame>
  );
}

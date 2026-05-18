import type { ReactNode } from "react";

import { AppShell } from "@/components/layouts/app-shell";
import type { Locale } from "@/i18n/routing";
import { requireAuth } from "@/modules/auth/services/session.server";

export default async function ProtectedLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAuth(locale as Locale);

  return <AppShell>{children}</AppShell>;
}

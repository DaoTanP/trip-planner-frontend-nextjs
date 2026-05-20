import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/routing";
import { LoginPage } from "@/modules/auth/pages/login-page";
import { redirectIfAuthenticated } from "@/modules/auth/services/session.server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");

  return {
    title: t("login.title")
  };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await redirectIfAuthenticated(locale as Locale);

  return <LoginPage />;
}

import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import "@/app/globals.css";
import { RootProviders } from "@/providers/root-providers";
import { routing, type Locale } from "@/i18n/routing";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plus-jakarta-sans",
  display: "swap"
});

interface LocaleLayoutProps {
  children: ReactNode;
  params: Promise<{
    locale: string;
  }>;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LocaleLayoutProps): Promise<Metadata> {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "common" });

  return {
    title: {
      default: t("metadata.title"),
      template: `%s | ${t("app.name")}`
    },
    description: t("metadata.description"),
    alternates: {
      languages: Object.fromEntries(routing.locales.map((item) => [item, `/${item}`]))
    }
  };
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale as Locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${plusJakartaSans.variable} min-h-screen font-sans antialiased`}>
        <NextIntlClientProvider>
          <RootProviders>{children}</RootProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

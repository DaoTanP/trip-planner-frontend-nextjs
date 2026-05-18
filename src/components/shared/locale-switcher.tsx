"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { routing, usePathname, useRouter, type Locale } from "@/i18n/routing";

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("common");

  function switchLocale(nextLocale: Locale) {
    router.replace(pathname, { locale: nextLocale });
  }

  return (
    <div className="flex items-center gap-1" aria-label={t("locale.label")}>
      <Languages className="size-4 text-muted-foreground" aria-hidden="true" />
      {routing.locales.map((item) => (
        <Button
          key={item}
          type="button"
          variant={item === locale ? "secondary" : "ghost"}
          size="sm"
          aria-pressed={item === locale}
          onClick={() => switchLocale(item)}
        >
          {t(`locale.${item}`)}
        </Button>
      ))}
    </div>
  );
}

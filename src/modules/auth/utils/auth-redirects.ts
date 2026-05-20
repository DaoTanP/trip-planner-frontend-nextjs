import { routes } from "@/constants/routes";

export function getSafeAuthRedirectTarget(value: string | null, locale: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return `/${locale}${routes.trips}`;
  }

  if (value === `/${locale}` || value.startsWith(`/${locale}/`)) {
    return value;
  }

  return `/${locale}${value}`;
}

import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { authCookies } from "./constants/cookies";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);
const protectedRoutePrefixes = ["/trips", "/profile"];
const guestOnlyRoutes = ["/login"];

function getLocale(pathname: string) {
  return routing.locales.find(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );
}

function stripLocale(pathname: string, locale: string) {
  const stripped = pathname.slice(locale.length + 1);

  return stripped ? `/${stripped}` : "/";
}

export default function proxy(request: NextRequest) {
  const locale = getLocale(request.nextUrl.pathname);

  if (!locale) {
    return intlMiddleware(request);
  }

  const pathWithoutLocale = stripLocale(request.nextUrl.pathname, locale);
  const hasAccessCookie = Boolean(request.cookies.get(authCookies.accessToken)?.value);
  const isProtectedRoute = protectedRoutePrefixes.some((prefix) =>
    pathWithoutLocale.startsWith(prefix)
  );
  const isGuestOnlyRoute = guestOnlyRoutes.includes(pathWithoutLocale);

  if (isProtectedRoute && !hasAccessCookie) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = `/${locale}/login`;
    loginUrl.searchParams.set("redirectTo", pathWithoutLocale);

    return NextResponse.redirect(loginUrl);
  }

  if (isGuestOnlyRoute && hasAccessCookie) {
    const appUrl = request.nextUrl.clone();
    appUrl.pathname = `/${locale}/trips`;
    appUrl.search = "";

    return NextResponse.redirect(appUrl);
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)"
};

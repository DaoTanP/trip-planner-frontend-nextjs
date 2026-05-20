import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { apiConfig } from "@/config/api";
import { authCookies } from "@/constants/cookies";
import { routes } from "@/constants/routes";
import type { Locale } from "@/i18n/routing";
import type { ApiResponse } from "@/types/api";

import type { AuthSession } from "../types/auth.types";

export async function getServerAccessToken() {
  const cookieStore = await cookies();

  return cookieStore.get(authCookies.accessToken)?.value ?? null;
}

export async function getServerSession(locale: Locale) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(authCookies.accessToken)?.value;

  if (!accessToken) {
    return null;
  }

  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${encodeURIComponent(cookie.value)}`)
    .join("; ");

  const response = await fetch(`${apiConfig.serverBaseUrl}${apiConfig.auth.mePath}`, {
    headers: {
      cookie: cookieHeader,
      "x-locale": locale
    },
    cache: "no-store"
  }).catch(() => null);

  if (!response?.ok) {
    return null;
  }

  const body = (await response.json()) as ApiResponse<AuthSession>;

  return body.data;
}

export async function requireAuth(locale: Locale) {
  const session = await getServerSession(locale);

  if (!session) {
    redirect(`/${locale}/login`);
  }

  return session;
}

export async function redirectIfAuthenticated(locale: Locale) {
  const session = await getServerSession(locale);

  if (session) {
    redirect(`/${locale}${routes.trips}`);
  }
}

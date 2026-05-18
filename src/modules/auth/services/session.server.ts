import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { authCookies } from "@/constants/cookies";
import type { Locale } from "@/i18n/routing";

export async function getServerAccessToken() {
  const cookieStore = await cookies();

  return cookieStore.get(authCookies.accessToken)?.value ?? null;
}

export async function requireAuth(locale: Locale) {
  const accessToken = await getServerAccessToken();

  if (!accessToken) {
    redirect(`/${locale}/login`);
  }
}

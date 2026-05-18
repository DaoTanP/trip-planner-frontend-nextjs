import type { Locale } from "@/i18n/routing";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  locale: Locale;
  timeZone: string;
  avatarUrl?: string;
}

export interface UpdateProfilePayload {
  name?: string;
  locale?: Locale;
  timeZone?: string;
}

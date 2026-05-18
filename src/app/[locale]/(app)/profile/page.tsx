import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ProfileSummary } from "@/modules/profile/components/profile-summary";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("profile");

  return {
    title: t("title")
  };
}

export default function Page() {
  return <ProfileSummary />;
}

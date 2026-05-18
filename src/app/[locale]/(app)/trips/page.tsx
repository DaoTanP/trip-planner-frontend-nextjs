import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { TripsPage } from "@/modules/trips/pages/trips-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("trip");

  return {
    title: t("metadata.title")
  };
}

export default function Page() {
  return <TripsPage />;
}

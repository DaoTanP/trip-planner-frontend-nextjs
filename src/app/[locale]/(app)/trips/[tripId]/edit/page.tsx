import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { TripEditorPage } from "@/modules/trips/pages/trip-editor-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("trip.editor");

  return {
    title: t("metadataTitle")
  };
}

export default async function Page({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;

  return <TripEditorPage tripId={tripId} />;
}

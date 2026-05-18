import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/shared/page-header";

import { CreateTripForm } from "../components/create-trip-form";
import { TripList } from "../components/trip-list";

export async function TripsPage() {
  const t = await getTranslations("trip");

  return (
    <div className="grid gap-8">
      <PageHeader title={t("title")} description={t("description")} />
      <div className="grid gap-6 lg:grid-cols-[minmax(18rem,24rem)_1fr] lg:items-start">
        <CreateTripForm />
        <TripList />
      </div>
    </div>
  );
}

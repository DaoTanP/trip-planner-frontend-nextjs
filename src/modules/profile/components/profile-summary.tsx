import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/shared/page-header";

export async function ProfileSummary() {
  const t = await getTranslations("profile");

  return <PageHeader title={t("title")} description={t("description")} />;
}

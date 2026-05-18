"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";

import type { ApiError } from "@/services/api/errors";

import { getErrorTranslationKey } from "./error-translation";

export function useErrorToast() {
  const t = useTranslations("common");

  return (error: ApiError) => {
    toast.error(t(getErrorTranslationKey(error)));
  };
}

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { authKeys } from "../queries/auth.queries";
import { login } from "../services/auth.service";
import type { LoginPayload } from "../types/auth.types";
import { getSafeAuthRedirectTarget } from "../utils/auth-redirects";

export function useLoginMutation() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations("auth");

  return useMutation({
    mutationFn: (payload: LoginPayload) => login(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authKeys.all });
      toast.success(t("login.success"));
      router.replace(
        getSafeAuthRedirectTarget(searchParams.get("redirectTo"), locale) as Parameters<
          typeof router.replace
        >[0]
      );
    },
    onError: () => {
      toast.error(t("login.error"));
    }
  });
}

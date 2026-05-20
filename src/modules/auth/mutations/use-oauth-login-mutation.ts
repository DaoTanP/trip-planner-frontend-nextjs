"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { authKeys } from "../queries/auth.queries";
import { loginWithOAuth } from "../services/auth.service";
import type { OAuthLoginPayload, OAuthProvider } from "../types/auth.types";
import { getSafeAuthRedirectTarget } from "../utils/auth-redirects";

function getTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

export function useOAuthLoginMutation(provider: OAuthProvider) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations("auth");

  return useMutation({
    mutationFn: (payload: Pick<OAuthLoginPayload, "credential">) =>
      loginWithOAuth(provider, {
        ...payload,
        locale,
        timezone: getTimeZone()
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authKeys.all });
      toast.success(t("login.success"));
      router.replace(getSafeAuthRedirectTarget(searchParams.get("redirectTo"), locale));
    },
    onError: () => {
      toast.error(t("errors.oauth_failed"));
    }
  });
}

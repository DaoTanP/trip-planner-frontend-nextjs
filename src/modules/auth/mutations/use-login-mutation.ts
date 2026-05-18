"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { useRouter } from "@/i18n/routing";
import { routes } from "@/constants/routes";

import { authKeys } from "../queries/auth.queries";
import { login } from "../services/auth.service";
import type { LoginPayload } from "../types/auth.types";

export function useLoginMutation() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const t = useTranslations("auth");

  return useMutation({
    mutationFn: (payload: LoginPayload) => login(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authKeys.all });
      toast.success(t("login.success"));
      router.replace(routes.trips);
    },
    onError: () => {
      toast.error(t("login.error"));
    }
  });
}

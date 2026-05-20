import { apiGet, apiPatch } from "@/services/api/request";
import { apiEndpoints } from "@/services/api/endpoints";
import type { ApiSuccessResponse } from "@/types/api";

import type { UpdateProfilePayload, UserProfile } from "../types/profile.types";

export async function getProfile(signal?: AbortSignal) {
  const response = await apiGet<ApiSuccessResponse<{ user: UserProfile }>>(
    apiEndpoints.users.me,
    signal
  );

  return response.data.user;
}

export async function updateProfile(payload: UpdateProfilePayload) {
  const response = await apiPatch<ApiSuccessResponse<{ user: UserProfile }>, UpdateProfilePayload>(
    apiEndpoints.users.me,
    payload
  );

  return response.data.user;
}

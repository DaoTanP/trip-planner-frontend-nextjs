import { apiGet, apiPatch } from "@/services/api/request";
import type { ApiResponse } from "@/types/api";

import type { UpdateProfilePayload, UserProfile } from "../types/profile.types";

export async function getProfile(signal?: AbortSignal) {
  const response = await apiGet<ApiResponse<UserProfile>>("/profile", signal);

  return response.data;
}

export async function updateProfile(payload: UpdateProfilePayload) {
  const response = await apiPatch<ApiResponse<UserProfile>, UpdateProfilePayload>(
    "/profile",
    payload
  );

  return response.data;
}

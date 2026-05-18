import { queryOptions } from "@tanstack/react-query";

import { getProfile } from "../services/profile.service";

export const profileKeys = {
  all: ["profile"] as const,
  detail: () => [...profileKeys.all, "detail"] as const
};

export function profileQueryOptions() {
  return queryOptions({
    queryKey: profileKeys.detail(),
    queryFn: ({ signal }) => getProfile(signal)
  });
}

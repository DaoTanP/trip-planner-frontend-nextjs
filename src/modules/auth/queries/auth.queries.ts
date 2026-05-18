import { queryOptions } from "@tanstack/react-query";

import { getSession } from "../services/auth.service";

export const authKeys = {
  all: ["auth"] as const,
  session: () => [...authKeys.all, "session"] as const
};

export function sessionQueryOptions() {
  return queryOptions({
    queryKey: authKeys.session(),
    queryFn: ({ signal }) => getSession(signal)
  });
}

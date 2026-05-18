"use client";

import { useQuery } from "@tanstack/react-query";

import { sessionQueryOptions } from "../queries/auth.queries";

export function useSession() {
  return useQuery(sessionQueryOptions());
}

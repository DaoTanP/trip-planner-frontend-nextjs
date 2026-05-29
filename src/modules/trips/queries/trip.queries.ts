import { queryOptions } from "@tanstack/react-query";

import {
  getTrip,
  getTripCollaborators,
  getTripExpenses,
  getTripMutationEvents,
  getTrips
} from "../services/trips.service";

export const tripKeys = {
  all: ["trips"] as const,
  lists: () => [...tripKeys.all, "list"] as const,
  list: (filters?: Record<string, unknown>) => [...tripKeys.lists(), filters ?? {}] as const,
  detail: (tripId: string) => [...tripKeys.all, "detail", tripId] as const,
  collaborators: (tripId: string) => [...tripKeys.detail(tripId), "collaborators"] as const,
  expenses: (tripId: string) => [...tripKeys.detail(tripId), "expenses"] as const,
  mutationEvents: (tripId: string, afterRevision?: string) =>
    [...tripKeys.detail(tripId), "mutation-events", afterRevision ?? "0"] as const
};

export function tripsQueryOptions() {
  return queryOptions({
    queryKey: tripKeys.list(),
    queryFn: ({ signal }) => getTrips(signal)
  });
}

export function tripDetailQueryOptions(tripId: string) {
  return queryOptions({
    queryKey: tripKeys.detail(tripId),
    queryFn: ({ signal }) => getTrip(tripId, signal),
    staleTime: 30_000
  });
}

export function tripCollaboratorsQueryOptions(tripId: string) {
  return queryOptions({
    queryKey: tripKeys.collaborators(tripId),
    queryFn: ({ signal }) => getTripCollaborators(tripId, signal),
    staleTime: 30_000
  });
}

export function tripExpensesQueryOptions(tripId: string) {
  return queryOptions({
    queryKey: tripKeys.expenses(tripId),
    queryFn: ({ signal }) => getTripExpenses(tripId, signal),
    staleTime: 30_000
  });
}

export function tripMutationEventsQueryOptions(tripId: string, afterRevision?: string) {
  return queryOptions({
    queryKey: tripKeys.mutationEvents(tripId, afterRevision),
    queryFn: ({ signal }) =>
      getTripMutationEvents(
        tripId,
        afterRevision === undefined ? undefined : { afterRevision },
        signal
      ),
    enabled: afterRevision !== undefined,
    staleTime: 5_000
  });
}

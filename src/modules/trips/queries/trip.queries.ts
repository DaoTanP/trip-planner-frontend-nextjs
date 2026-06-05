import { queryOptions } from "@tanstack/react-query";

import {
  getTrip,
  getTripCollaborators,
  getTripMutationEvents,
  getTrips
} from "../services/trips.service";

export const tripKeys = {
  all: ["trips"] as const,
  lists: () => [...tripKeys.all, "list"] as const,
  list: (filters?: Record<string, unknown>) => [...tripKeys.lists(), filters ?? {}] as const,
  detail: (tripId: string) => [...tripKeys.all, "detail", tripId] as const,
  collaborators: (tripId: string) => [...tripKeys.detail(tripId), "collaborators"] as const,
  mutationEvents: (tripId: string, sinceRevision?: string) =>
    [...tripKeys.detail(tripId), "mutation-events", sinceRevision ?? "0"] as const
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

export function tripMutationEventsQueryOptions(tripId: string, sinceRevision?: string) {
  return queryOptions({
    queryKey: tripKeys.mutationEvents(tripId, sinceRevision),
    queryFn: ({ signal }) =>
      getTripMutationEvents(
        tripId,
        sinceRevision === undefined ? undefined : { sinceRevision },
        signal
      ),
    enabled: sinceRevision !== undefined,
    staleTime: 5_000
  });
}

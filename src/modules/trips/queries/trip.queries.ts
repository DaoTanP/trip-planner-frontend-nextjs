import { queryOptions } from "@tanstack/react-query";

import {
  getTrip,
  getTripCollaborators,
  getTripExpenses,
  getTripNotes,
  getTrips
} from "../services/trips.service";

export const tripKeys = {
  all: ["trips"] as const,
  lists: () => [...tripKeys.all, "list"] as const,
  list: (filters?: Record<string, unknown>) => [...tripKeys.lists(), filters ?? {}] as const,
  detail: (tripId: string) => [...tripKeys.all, "detail", tripId] as const,
  notes: (tripId: string) => [...tripKeys.detail(tripId), "notes"] as const,
  collaborators: (tripId: string) => [...tripKeys.detail(tripId), "collaborators"] as const,
  expenses: (tripId: string) => [...tripKeys.detail(tripId), "expenses"] as const
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

export function tripNotesQueryOptions(tripId: string) {
  return queryOptions({
    queryKey: tripKeys.notes(tripId),
    queryFn: ({ signal }) => getTripNotes(tripId, signal),
    staleTime: 15_000
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

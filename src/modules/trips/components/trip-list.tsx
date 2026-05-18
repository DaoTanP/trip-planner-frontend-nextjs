"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { tripsQueryOptions } from "../queries/trip.queries";
import { TripCard } from "./trip-card";

export function TripList() {
  const tTrip = useTranslations("trip");
  const tCommon = useTranslations("common");
  const tripsQuery = useQuery(tripsQueryOptions());

  if (tripsQuery.isPending) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Skeleton className="h-52" />
        <Skeleton className="h-52" />
        <Skeleton className="h-52" />
      </div>
    );
  }

  if (tripsQuery.isError) {
    return (
      <ErrorState
        title={tCommon("states.error")}
        description={tCommon("errors.page.description")}
        action={
          <Button type="button" variant="outline" onClick={() => void tripsQuery.refetch()}>
            {tCommon("actions.retry")}
          </Button>
        }
      />
    );
  }

  if (tripsQuery.data.length === 0) {
    return (
      <EmptyState
        title={tTrip("empty.title")}
        description={tTrip("empty.description")}
        action={
          <Button type="button" variant="secondary">
            <Plus aria-hidden="true" />
            {tTrip("create")}
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {tripsQuery.data.map((trip) => (
        <TripCard key={trip.id} trip={trip} />
      ))}
    </div>
  );
}

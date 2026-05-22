import { Skeleton } from "@/components/ui/skeleton";

export function TripEditorSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(24rem,42rem)_minmax(26rem,1fr)]">
      <div className="grid gap-4">
        <Skeleton className="h-72 rounded-md" />
        <Skeleton className="h-36 rounded-md" />
        <Skeleton className="h-96 rounded-md" />
      </div>
      <Skeleton className="min-h-[calc(100dvh-8rem)] rounded-md" />
    </div>
  );
}

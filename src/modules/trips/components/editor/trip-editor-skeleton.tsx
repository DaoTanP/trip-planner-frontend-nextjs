import { Skeleton } from "@/components/ui/skeleton";

export function TripEditorSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(26rem,45rem)_minmax(28rem,1fr)]">
      <div className="grid gap-3">
        <Skeleton className="h-80 rounded-md" />
        <Skeleton className="h-28 rounded-md" />
        <Skeleton className="h-[36rem] rounded-md" />
      </div>
      <Skeleton className="hidden min-h-[calc(100dvh-8rem)] rounded-md lg:block" />
    </div>
  );
}

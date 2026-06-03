import { Skeleton } from "@/components/ui/skeleton";

export function TripEditorSkeleton() {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,7fr)_minmax(20rem,3fr)]">
      <div className="grid gap-2">
        <Skeleton className="h-24 rounded-md" />
        <Skeleton className="h-[36rem] rounded-md" />
      </div>
      <Skeleton className="hidden min-h-[calc(100dvh-8rem)] rounded-md lg:block" />
    </div>
  );
}

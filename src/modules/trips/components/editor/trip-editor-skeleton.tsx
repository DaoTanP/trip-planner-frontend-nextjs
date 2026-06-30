import { Skeleton } from "@/components/ui/skeleton";

export function TripEditorSkeleton() {
  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 overflow-x-hidden pb-0 lg:h-dvh lg:overflow-hidden">
      <div className="grid w-full gap-0 lg:h-full lg:grid-cols-[minmax(0,2fr)_0.75rem_minmax(20rem,1fr)] lg:items-start">
        <div className="flex flex-col gap-2 px-3 pb-4 sm:px-4 lg:h-dvh lg:min-h-0 lg:overflow-hidden lg:px-5">
          <div className="sticky top-0 z-30 bg-background py-2 lg:static lg:z-auto">
            <div className="grid gap-2 border-b pb-2">
              <Skeleton className="h-6 w-32 rounded-sm" />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Skeleton className="h-8 w-64 rounded-sm" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-20 rounded-sm" />
                  <Skeleton className="h-8 w-8 rounded-sm" />
                </div>
              </div>
              <Skeleton className="h-5 w-full max-w-xl rounded-sm" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-b">
            <Skeleton className="h-9 w-20 rounded-sm" />
            <Skeleton className="h-9 w-12 rounded-sm lg:hidden" />
            <Skeleton className="h-9 w-16 rounded-sm" />
            <Skeleton className="h-9 w-14 rounded-sm" />
          </div>
          <div className="min-w-0 px-1 pt-1 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain lg:pr-2">
            <div className="flex flex-wrap items-center gap-2 border-b pb-2">
              <Skeleton className="h-8 min-w-48 flex-1 rounded-sm sm:max-w-80" />
              <Skeleton className="h-8 w-36 rounded-sm" />
              <Skeleton className="h-8 w-24 rounded-sm" />
              <Skeleton className="ml-auto h-8 w-32 rounded-sm" />
            </div>
            <div className="grid gap-1">
              {Array.from({ length: 7 }).map((_, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex w-8 shrink-0 flex-col items-center">
                    <Skeleton className="h-7 w-px rounded-none" />
                    <Skeleton className="size-7 rounded-md" />
                    <Skeleton className="min-h-5 w-px flex-1 rounded-none" />
                  </div>
                  <div className="min-w-0 flex-1 pt-1">
                    <Skeleton className="h-14 rounded-sm" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <Skeleton className="hidden h-dvh rounded-none lg:block" />
        <Skeleton className="hidden min-h-dvh rounded-none lg:block" />
      </div>
    </div>
  );
}

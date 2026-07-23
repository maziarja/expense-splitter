import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

export function GroupDashboardSkeleton() {
  return (
    <main className="flex flex-1 flex-col gap-6 bg-bg-primary p-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-8 w-48 md:h-9" />
            <div className="flex -space-x-2">
              <Skeleton className="size-10 rounded-full ring-2 ring-bg-primary" />
              <Skeleton className="size-10 rounded-full ring-2 ring-bg-primary" />
              <Skeleton className="size-10 rounded-full ring-2 ring-bg-primary" />
            </div>
          </div>
          <Skeleton className="h-4 w-40" />
        </header>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Skeleton className="h-12 w-full rounded-md" />
            <Separator />
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-16" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-4 w-36" />
            </div>
            <Separator />
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="flex items-center gap-2">
                    <Skeleton className="size-10 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </span>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-col divide-y divide-border-subtle">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-3">
                  <Skeleton className="size-4 shrink-0 rounded-sm md:size-5" />
                  <div className="min-w-0 flex-1 flex-col gap-1.5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="mt-1.5 h-3.5 w-1/2" />
                  </div>
                  <Skeleton className="h-5 w-14 shrink-0" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-col divide-y divide-border-subtle">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2 py-2.5 md:py-3"
                >
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-14" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

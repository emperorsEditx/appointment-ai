import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="flex min-h-screen bg-muted/20">
      <div className="hidden h-screen w-72 shrink-0 border-r border-border/60 bg-background/80 md:block">
        <div className="flex h-full flex-col p-4">
          <div className="mb-6 flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>

          <div className="space-y-3">
            {[...Array(4)].map((_, index) => (
              <Skeleton key={index} className="h-10 w-full rounded-xl" />
            ))}
          </div>

          <div className="mt-auto border-t border-border/60 pt-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="h-16 border-b border-border/60 bg-background/80 backdrop-blur-xl">
          <div className="flex h-full items-center justify-between px-6">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="hidden h-6 w-24 rounded-full md:block" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
        </div>

        <main className="flex-1 p-6 md:p-8">
          <div className="mx-auto w-full max-w-5xl space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-72" />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
                <Skeleton className="mb-4 h-6 w-32" />
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
                <Skeleton className="mb-4 h-6 w-28" />
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full rounded-xl" />
                  <Skeleton className="h-10 w-full rounded-xl" />
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

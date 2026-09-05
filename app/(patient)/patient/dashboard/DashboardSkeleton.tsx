// Skeleton shown instantly while DB queries run in the background
export function DashboardSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 animate-pulse">
      {/* Header actions skeleton */}
      <div className="md:col-span-2 flex justify-end gap-2 -mt-12 pb-2">
        <div className="h-9 w-32 rounded-md bg-muted" />
        <div className="h-9 w-32 rounded-md bg-muted" />
      </div>

      {/* Health Alerts skeleton */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="h-5 w-32 rounded bg-muted" />
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-3/4 rounded bg-muted" />
        <div className="h-4 w-5/6 rounded bg-muted" />
      </div>

      {/* Share button skeleton */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="h-5 w-40 rounded bg-muted" />
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-2/3 rounded bg-muted" />
      </div>

      {/* 90-Day Summary skeleton */}
      <div className="md:col-span-2 rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="h-5 w-48 rounded bg-muted" />
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-5/6 rounded bg-muted" />
        <div className="h-4 w-4/5 rounded bg-muted" />
      </div>

      {/* Recent Reports skeleton */}
      <div className="md:col-span-2 rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="h-5 w-36 rounded bg-muted" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between border-b pb-3 last:border-0">
            <div className="space-y-1.5">
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="h-3 w-24 rounded bg-muted" />
            </div>
            <div className="h-6 w-20 rounded-full bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}

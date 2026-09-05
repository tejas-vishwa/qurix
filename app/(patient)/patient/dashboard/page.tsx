import { Suspense } from "react"
import { DashboardSkeleton } from "./DashboardSkeleton"
import { DashboardContent } from "./DashboardContent"

// No async, no await — this shell renders and streams to the browser INSTANTLY
// Data loads inside <Suspense> in the background without blocking the page
export default function PatientDashboard() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header renders immediately */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, here is your health overview.</p>
        </div>
      </div>

      {/* Data streams in — user sees skeleton immediately, content appears ~0.5s later */}
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  )
}

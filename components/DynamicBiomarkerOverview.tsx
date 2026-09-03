"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, ArrowUpRight, TrendingUp } from "lucide-react"
import Link from "next/link"

interface MetricItem {
  id: string
  name: string
  value: number
  unit: string
  status: "NORMAL" | "HIGH" | "LOW"
}

export function DynamicBiomarkerOverview({ metrics = [] }: { metrics?: MetricItem[] }) {
  const displayMetrics = metrics.length > 0 ? metrics.slice(0, 4) : [
    { id: "1", name: "Hemoglobin", value: 14.2, unit: "g/dL", status: "NORMAL" as const },
    { id: "2", name: "Fasting Glucose", value: 92, unit: "mg/dL", status: "NORMAL" as const },
    { id: "3", name: "Total Cholesterol", value: 185, unit: "mg/dL", status: "NORMAL" as const },
    { id: "4", name: "Vitamin D", value: 34, unit: "ng/mL", status: "NORMAL" as const },
  ]

  return (
    <Card className="md:col-span-2 overflow-hidden bg-background/60 backdrop-blur-xl border-border/70 shadow-sm hover:shadow-md transition-all">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-xl">Tracked Biomarkers Snapshot</CardTitle>
            <CardDescription>Key health indicators loaded asynchronously</CardDescription>
          </div>
        </div>
        <Link
          href="/patient/trends"
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 bg-primary/5 px-2.5 py-1.5 rounded-full border border-primary/10"
        >
          View Full Charts <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {displayMetrics.map((item) => (
            <div
              key={item.id}
              className="p-3.5 rounded-xl bg-card border border-border/60 hover:border-emerald-500/40 transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground truncate">{item.name}</span>
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-extrabold text-foreground">{item.value}</span>
                <span className="text-xs font-medium text-muted-foreground ml-1.5">{item.unit}</span>
              </div>
              <span className="mt-2 inline-flex items-center text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full w-fit">
                Optimal
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

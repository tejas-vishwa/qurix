"use client"

import dynamic from "next/dynamic"
import { ChartLoadingSkeleton } from "@/components/ChartLoadingSkeleton"

export const DynamicPatientTrendsDashboard = dynamic(
  () => import("@/components/PatientTrendsDashboard").then((mod) => mod.PatientTrendsDashboard),
  {
    ssr: false,
    loading: () => <ChartLoadingSkeleton title="Loading Clinical Biomarker Trends..." />,
  }
)

import { getAuthSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, FileText, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ShareCodeButton } from "./ShareCodeButton"
import { DeleteReportButton } from "@/components/DeleteReportButton"

export const dynamic = "force-dynamic"

export default async function PatientDashboard() {
  const session = await getAuthSession()
  const userId = session?.user.id

  if (!userId) {
    redirect("/login")
  }

  let reports: any[] = []
  let recentMetrics: any[] = []
  let activeCode: any = null

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  try {
    const [reportsResult, metricsResult, codeResult] = await Promise.allSettled([
      prisma.report.findMany({
        where: { patientId: userId },
        orderBy: { reportDate: 'desc' },
        take: 5
      }),
      prisma.extractedMetric.findMany({
        where: {
          report: {
            patientId: userId,
            reportDate: { gte: ninetyDaysAgo }
          }
        },
        include: {
          biomarker: true,
          report: true
        },
        orderBy: {
          report: { reportDate: 'desc' }
        }
      }),
      prisma.doctorAccessCode.findFirst({
        where: { patientId: userId, expiresAt: { gt: new Date() }, isRevoked: false },
        orderBy: { createdAt: 'desc' }
      })
    ])

    if (reportsResult.status === "fulfilled") reports = reportsResult.value
    if (metricsResult.status === "fulfilled") recentMetrics = metricsResult.value
    if (codeResult.status === "fulfilled") activeCode = codeResult.value
  } catch (err) {
    console.error("[PatientDashboard] Error fetching dashboard data:", err)
  }

  let overallStatus = "NORMAL"
  const standardIssues: any[] = []
  const criticalAlerts: any[] = []

  // Only evaluate the LATEST result for each biomarker in the last 90 days
  const latestMetricsMap = new Map<string, any>()
  recentMetrics.forEach(m => {
    if (!latestMetricsMap.has(m.biomarkerId)) {
      latestMetricsMap.set(m.biomarkerId, m)
    }
  })

  let patientSummaryText = "Based on your recent lab reports from the last 90 days, all your tracked biomarkers are currently within standard reference ranges."

  latestMetricsMap.forEach(m => {
    const unit = (m.unit === 'Titer' || m.biomarker?.code === 'ANA') ? 'IU/mL' : m.unit
    if (m.refMin !== null && m.refMax !== null) {
      const range = m.refMax - m.refMin
      const criticalThreshold = range * 0.15 // 15% deviation for CRITICAL
      
      const isLow = m.value < m.refMin
      const isHigh = m.value > m.refMax
      
      const isCriticalLow = m.value < (m.refMin - criticalThreshold)
      const isCriticalHigh = m.value > (m.refMax + criticalThreshold)

      if (isCriticalLow || isCriticalHigh) {
        overallStatus = "CRITICAL"
        criticalAlerts.push({
          test_name: m.biomarker.displayName,
          result: `${m.value} ${unit}`,
          urgent_warning: `URGENT: Your ${m.biomarker.displayName} is critically ${isCriticalLow ? 'low' : 'high'}. Please consult a doctor immediately.`
        })
      } else if (isLow || isHigh) {
        if (overallStatus !== "CRITICAL") overallStatus = "ATTENTION_NEEDED"
        standardIssues.push({
          test_name: m.biomarker.displayName,
          result: `${m.value} ${unit}`,
          advice: `Your ${m.biomarker.displayName} is slightly ${isLow ? 'low' : 'high'}. Discuss this at your next checkup.`
        })
      }
    } else if (m.isAbnormal) {
      if (overallStatus !== "CRITICAL") overallStatus = "ATTENTION_NEEDED"
      standardIssues.push({
        test_name: m.biomarker.displayName,
        result: `${m.value} ${unit}`,
        advice: `Your ${m.biomarker.displayName} is flagged as abnormal. Discuss this at your next checkup.`
      })
    }
  })

  if (overallStatus === "CRITICAL") {
    patientSummaryText = "We have detected critically abnormal values in your recent lab results. Please review the alerts below and seek medical advice immediately."
  } else if (overallStatus === "ATTENTION_NEEDED") {
    patientSummaryText = "Some of your recent lab results are slightly out of the standard reference ranges. It is recommended to discuss these with your doctor."
  } else if (latestMetricsMap.size === 0) {
    patientSummaryText = "No test results found in the last 90 days. Please upload a recent report to get an automated health summary."
  }


  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, here is your health overview.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/patient/upload">
            <Button>Upload Report</Button>
          </Link>
          <ShareCodeButton initialCode={activeCode?.code} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Alerts Panel */}
        <Card className={`border-t-4 ${overallStatus === 'CRITICAL' ? 'border-t-red-600 animate-pulse bg-red-50 dark:bg-red-950/20' : overallStatus === 'ATTENTION_NEEDED' ? 'border-t-amber-500' : 'border-t-green-500'}`}>
          <CardHeader className="pb-3">
            <div className={`flex items-center space-x-2 ${overallStatus === 'CRITICAL' ? 'text-red-600 dark:text-red-500' : overallStatus === 'ATTENTION_NEEDED' ? 'text-amber-600 dark:text-amber-500' : 'text-green-600 dark:text-green-500'}`}>
              <AlertCircle className="h-5 w-5" />
              <CardTitle className="text-xl">Health Alerts</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {overallStatus === 'NORMAL' ? (
              <p className="text-sm text-green-700 dark:text-green-400 font-medium">All clear! No active alerts in the last 90 days. You are doing great!</p>
            ) : (
              <ul className="space-y-4">
                {criticalAlerts.map((alert, i) => (
                  <li key={`crit-${i}`} className="bg-red-100 dark:bg-red-900/40 p-3 rounded-md text-sm border border-red-200 dark:border-red-800">
                    <span className="font-bold text-red-700 dark:text-red-400">{alert.urgent_warning}</span> <br/>
                    <span className="text-muted-foreground mt-1 block">Result: {alert.result}</span>
                  </li>
                ))}
                {standardIssues.map((alert, i) => (
                  <li key={`std-${i}`} className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-md text-sm border border-amber-100 dark:border-amber-900">
                    <span className="font-semibold text-amber-800 dark:text-amber-400">Attention needed:</span> {alert.advice} <br/>
                    <span className="text-muted-foreground mt-1 block">Result: {alert.result}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Latest Health Summary */}
        <Card className={`md:col-span-2 ${overallStatus === 'CRITICAL' ? 'bg-red-50/50 border-red-200' : 'bg-primary/5 border-primary/20'}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <FileText className={`h-5 w-5 ${overallStatus === 'CRITICAL' ? 'text-red-600' : 'text-primary'}`} />
              <CardTitle className="text-xl">90-Day Health Summary</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
             <p className="text-sm leading-relaxed">{patientSummaryText}</p>
          </CardContent>
        </Card>

        {/* Recent Reports */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle className="text-xl">Recent Reports</CardTitle>
              </div>
              <Link href="/patient/trends" className="text-sm text-primary hover:underline">
                View Trends →
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground mb-4">You haven&apos;t uploaded any reports yet.</p>
                <Link href="/patient/upload">
                  <Button variant="outline" size="sm">Upload First Report</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div key={report.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium text-sm">{report.labName || "Lab Report"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Tested on: {report.reportDate ? new Date(report.reportDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Unknown date'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-primary/10 text-primary">
                        {report.status}
                      </span>
                      <a
                        href={report.fileUrl || `/api/reports/${report.id}/file`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-indigo-600 hover:underline font-medium ml-2"
                      >
                        View PDF
                      </a>
                      <DeleteReportButton reportId={report.id} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

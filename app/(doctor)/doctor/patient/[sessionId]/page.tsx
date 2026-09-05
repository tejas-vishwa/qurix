import { notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, User, FileText, Eye, Pill, Thermometer, HeartPulse } from "lucide-react"
import { PatientTrendsDashboard } from "@/components/PatientTrendsDashboard"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export default async function DoctorPatientView({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId: code } = await params

  // Validate the code
  const accessCode = await prisma.doctorAccessCode.findUnique({
    where: { code },
    include: { patient: true }
  })

  if (!accessCode || accessCode.isRevoked || accessCode.expiresAt < new Date()) {
    notFound()
  }

  const patientId = accessCode.patientId
  const patient = accessCode.patient

  // Fetch 6 months of reports
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const reports = await prisma.report.findMany({
    where: { patientId, reportDate: { gte: sixMonthsAgo } },
    orderBy: { reportDate: 'desc' }
  })

  const metrics = await prisma.extractedMetric.findMany({
    where: {
      report: { patientId, reportDate: { gte: sixMonthsAgo } }
    },
    include: { biomarker: true, report: true },
    orderBy: { report: { reportDate: 'desc' } }
  })

  // Fetch AI extracted health records
  const healthRecords = await prisma.userHealthRecord.findMany({
    where: { patientId },
    include: { report: true },
    orderBy: { createdAt: 'desc' }
  })

  // Fetch patient prescriptions
  const prescriptions = await prisma.prescription.findMany({
    where: { patientId },
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-lg border border-emerald-100 dark:border-emerald-900">
        <div className="flex items-center space-x-4">
          <div className="bg-emerald-100 dark:bg-emerald-800 p-3 rounded-full">
            <User className="h-8 w-8 text-emerald-600 dark:text-emerald-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{patient.name}</h1>
            <p className="text-muted-foreground text-sm">{patient.email} | Shared via Access Code</p>
          </div>
        </div>
        <div className="text-right text-sm text-emerald-700 dark:text-emerald-400 font-medium">
          Session expires: {new Date(accessCode.expiresAt).toLocaleString()}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <AlertCircle className="mr-2 h-5 w-5 text-destructive" /> Abnormal Flags (Last 6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.filter(m => m.isAbnormal).length === 0 ? (
              <p className="text-muted-foreground">No abnormal biomarkers found.</p>
            ) : (
              <ul className="space-y-3">
                {metrics.filter(m => m.isAbnormal).map(m => {
                  const unit = (m.unit === 'Titer' || m.biomarker?.code === 'ANA') ? 'IU/mL' : m.unit
                  return (
                    <li key={m.id} className="flex justify-between items-center border-b pb-2 last:border-0">
                      <div>
                        <span className="font-medium">{m.biomarker.displayName}</span>
                        <p className="text-xs text-muted-foreground">{new Date(m.report.reportDate!).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-destructive">{m.value} {unit}</span>
                        <p className="text-xs text-muted-foreground">Ref: {m.refMin}-{m.refMax}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Latest Health Summary */}
      <Card className="bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900">
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <FileText className="mr-2 h-5 w-5 text-emerald-600 dark:text-emerald-400" /> Latest Health Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reports[0]?.aiSummary ? (
            <p className="text-sm leading-relaxed">{reports[0].aiSummary}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No AI summary available.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <FileText className="mr-2 h-5 w-5 text-primary" /> Reports History
            </CardTitle>
          </CardHeader>
          <CardContent>
             {reports.length === 0 ? (
              <p className="text-muted-foreground">No reports found.</p>
            ) : (
              <ul className="space-y-3">
                {reports.map(r => (
                  <li key={r.id} className="flex justify-between items-center border-b pb-2 last:border-0">
                    <div>
                      <span className="font-medium text-sm">{r.labName || "Lab Report"}</span>
                      <p className="text-xs text-muted-foreground">{r.reportDate ? new Date(r.reportDate).toLocaleDateString() : 'Unknown date'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        Available
                      </span>
                      <a
                        href={r.fileUrl || `/api/reports/${r.id}/file`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-md transition-colors border border-indigo-200 dark:border-indigo-800"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        View PDF
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Prescriptions History for Doctor */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <Pill className="mr-2 h-5 w-5 text-emerald-600 dark:text-emerald-400" /> Prescriptions History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {prescriptions.length === 0 ? (
              <p className="text-muted-foreground">No prescriptions uploaded.</p>
            ) : (
              <ul className="space-y-4">
                {prescriptions.map(p => {
                  const meds = p.medicinesJson ? JSON.parse(p.medicinesJson) : []
                  const vitals = p.vitalsJson ? JSON.parse(p.vitalsJson) : {}
                  return (
                    <li key={p.id} className="border-b pb-3 last:border-0 space-y-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-semibold text-sm">{p.fileName}</span>
                          <p className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleDateString()}</p>
                        </div>
                        <a
                          href={p.fileUrl || `/api/prescriptions/${p.id}/file`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 rounded border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100"
                        >
                          <Eye className="h-3 w-3 mr-1" /> View Original
                        </a>
                      </div>

                      {/* Extracted medicines summary */}
                      {meds.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {meds.map((m: any, idx: number) => (
                            <span key={idx} className="text-[11px] font-semibold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded">
                              {m.name} ({m.dosage})
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Vitals summary */}
                      {vitals.temperature && (
                        <p className="text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1">
                          <Thermometer className="h-3 w-3" /> Body Temp: {vitals.temperature}
                        </p>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Clinical Recharts View for Doctor */}
      <Card>
        <CardHeader>
          <CardTitle>Biomarker Trends Overview</CardTitle>
          <CardDescription>Clinical visualizations of patient biomarker history.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 border-0 bg-transparent shadow-none">
          <PatientTrendsDashboard accessCode={code} />
        </CardContent>
      </Card>

    </div>
  )
}

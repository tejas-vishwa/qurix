import { NextResponse } from "next/server"
import { getServerSession, authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

function generateGaugePosition(value: number, refMin: number | null, refMax: number | null): number {
  const min = refMin ?? 0
  const max = refMax ?? value * 2
  const trackMin = Math.min(min * 0.5, value * 0.5)
  const trackMax = Math.max(max * 1.3, value * 1.3)
  const range = trackMax - trackMin
  if (range === 0) return 50
  const pos = ((value - trackMin) / range) * 100
  return Math.min(95, Math.max(5, pos))
}

function getTrackClass(refMin: number | null, refMax: number | null): string {
  if (refMin !== null && refMax !== null) return "track-low-high"
  if (refMax !== null) return "track-high-bad"
  if (refMin !== null) return "track-low-bad"
  return "track-high-bad"
}

function getStatusClass(value: number, refMin: number | null, refMax: number | null): string {
  if (refMax !== null && value > refMax) return "val-critical"
  if (refMin !== null && value < refMin) return "val-critical"
  return ""
}

function formatRef(refMin: number | null, refMax: number | null): string {
  if (refMin !== null && refMax !== null) return `Ref: ${refMin} – ${refMax}`
  if (refMax !== null) return `Ref: &lt; ${refMax}`
  if (refMin !== null) return `Ref: &gt; ${refMin}`
  return ""
}

function getGaugeLabels(value: number, refMin: number | null, refMax: number | null): string {
  const min = refMin ?? 0
  const max = refMax ?? value * 2
  const trackMin = Math.floor(Math.min(min * 0.5, value * 0.5))
  const trackMax = Math.ceil(Math.max(max * 1.3, value * 1.3))
  return `<span>${trackMin}</span><span>${min ?? ""}</span><span>${max}</span><span>${trackMax}</span>`
}

function categoryIcon(category: string): string {
  const icons: Record<string, string> = {
    "Hematology": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`,
    "Endocrinology": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
    "Cardiac": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"/></svg>`,
    "Lipids": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
    "Renal": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="12" rx="10" ry="6"/><path d="M12 6v12"/></svg>`,
    "Vitamins": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>`,
    "Metabolic": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
    "Immunology": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  }
  return icons[category] ?? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
}

type AbnormalMetric = {
  name: string
  category: string
  value: number
  unit: string
  refMin: number | null
  refMax: number | null
  severity: "CRITICAL" | "WARNING"
}

function biomarkerRowHTML(m: AbnormalMetric): string {
  const gaugePos = generateGaugePosition(m.value, m.refMin, m.refMax)
  const trackClass = getTrackClass(m.refMin, m.refMax)
  const valClass = getStatusClass(m.value, m.refMin, m.refMax)
  const nodeClass = m.severity === "CRITICAL" ? "node-critical" : "node-warning"
  const refText = formatRef(m.refMin, m.refMax)
  const gaugeLabels = getGaugeLabels(m.value, m.refMin, m.refMax)

  return `
    <div class="biomarker-row">
      <div class="biomarker-info">
        <div class="bm-name">${m.name}</div>
        <div class="bm-meta">${refText}</div>
      </div>
      <div class="biomarker-value-box">
        <div class="bm-value ${valClass}">${m.value}</div>
        <div class="bm-unit">${m.unit}</div>
      </div>
      <div class="gauge-container">
        <div class="gauge-labels">${gaugeLabels}</div>
        <div class="gauge-track ${trackClass}">
          <div class="gauge-node ${nodeClass}" style="left: ${gaugePos}%;"></div>
        </div>
      </div>
    </div>`
}

function categoryHTML([cat, items]: [string, AbnormalMetric[]]): string {
  const hasCritical = items.some(i => i.severity === "CRITICAL")
  const iconBg = hasCritical ? "var(--primary-dark)" : "var(--warning)"
  const titleColor = hasCritical ? "var(--primary-dark)" : "var(--warning)"
  return `
  <div class="system-group">
    <div class="system-header">
      <div class="system-icon" style="background: ${iconBg};">
        ${categoryIcon(cat)}
      </div>
      <div class="system-title" style="color: ${titleColor};">${cat}</div>
    </div>
    ${items.map(biomarkerRowHTML).join("")}
  </div>`
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const userId = session.user.id

    // Fetch user profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, age: true, gender: true }
    })

    const userName = user?.name ?? "Patient"
    const patientId = `QX-${userId.replace(/-/g, "").substring(0, 6).toUpperCase()}`
    const dateGenerated = new Date().toLocaleDateString("en-IN", {
      day: "numeric", month: "long", year: "numeric"
    })

    // Fetch all extracted metrics for this user (all time)
    const metrics = await prisma.extractedMetric.findMany({
      where: { report: { patientId: userId } },
      include: {
        biomarker: true,
        report: { select: { reportDate: true } }
      },
      orderBy: { report: { reportDate: "desc" } }
    })

    // Deduplicate: keep only the latest reading per biomarker
    const latestByCode = new Map<string, typeof metrics[0]>()
    for (const m of metrics) {
      if (!latestByCode.has(m.biomarker.code)) {
        latestByCode.set(m.biomarker.code, m)
      }
    }

    const allMetrics = Array.from(latestByCode.values())
    const totalCount = allMetrics.length

    // Classify metrics
    const abnormals: AbnormalMetric[] = []
    let criticalCount = 0
    let warningCount = 0

    for (const m of allMetrics) {
      if (!m.isAbnormal) continue
      const refMin = m.refMin ?? m.biomarker.refMin ?? null
      const refMax = m.refMax ?? m.biomarker.refMax ?? null

      let severity: "CRITICAL" | "WARNING" = "WARNING"
      if (refMax !== null && m.value > refMax) {
        severity = (m.value - refMax) / refMax > 0.2 ? "CRITICAL" : "WARNING"
      } else if (refMin !== null && m.value < refMin && refMin > 0) {
        severity = (refMin - m.value) / refMin > 0.2 ? "CRITICAL" : "WARNING"
      }

      if (severity === "CRITICAL") criticalCount++
      else warningCount++

      abnormals.push({
        name: m.biomarker.displayName,
        category: m.biomarker.category ?? "General",
        value: m.value,
        unit: m.unit || m.biomarker.unit,
        refMin,
        refMax,
        severity
      })
    }

    const optimalCount = totalCount - criticalCount - warningCount
    const noAbnormals = abnormals.length === 0

    // Group by category, critical categories first
    const byCategory = new Map<string, AbnormalMetric[]>()
    for (const a of abnormals) {
      if (!byCategory.has(a.category)) byCategory.set(a.category, [])
      byCategory.get(a.category)!.push(a)
    }
    const sortedCategories = Array.from(byCategory.entries()).sort(([, a], [, b]) =>
      b.filter(x => x.severity === "CRITICAL").length - a.filter(x => x.severity === "CRITICAL").length
    )

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>QURIX Health Report — ${userName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary-dark: #0f172a; --primary-teal: #0d9488; --bg-light: #f8fafc;
      --surface: #ffffff; --text-main: #334155; --text-muted: #64748b;
      --critical: #E63946; --warning: #F59E0B; --optimal: #00A68A;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #e2e8f0; color: var(--text-main); -webkit-font-smoothing: antialiased; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    @page { size: A4; margin: 0mm; }
    .a4-page { width: 210mm; min-height: 297mm; background: var(--bg-light); margin: 0 auto; position: relative; box-shadow: 0 10px 30px rgba(0,0,0,0.1); display: flex; flex-direction: column; }
    @media print { body { background-color: white; } .a4-page { box-shadow: none; margin: 0; width: 100%; height: 100%; page-break-after: always; } .no-break { page-break-inside: avoid; } }
    .header { background: var(--primary-dark); color: white; padding: 12mm 15mm; display: flex; justify-content: space-between; align-items: center; border-bottom: 4px solid var(--primary-teal); }
    .header-logo { display: flex; align-items: center; gap: 10px; }
    .header-logo svg { width: 32px; height: 32px; color: var(--primary-teal); }
    .brand-title { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
    .brand-subtitle { font-size: 10px; color: var(--primary-teal); text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; }
    .patient-meta { text-align: right; }
    .patient-meta h2 { font-size: 18px; font-weight: 700; margin-bottom: 2px; }
    .patient-meta p { font-size: 11px; color: #94a3b8; }
    .footer { background: var(--surface); border-top: 1px solid #e2e8f0; padding: 8mm 15mm; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: var(--text-muted); margin-top: auto; }
    .content { padding: 15mm; flex: 1; }
    .report-title { font-size: 22px; font-weight: 800; color: var(--primary-dark); margin-bottom: 5px; }
    .report-desc { font-size: 12px; color: var(--text-muted); margin-bottom: 10mm; max-width: 80%; line-height: 1.5; }
    .triage-summary { display: flex; gap: 15px; margin-bottom: 10mm; }
    .triage-card { flex: 1; background: var(--surface); border-radius: 8px; padding: 15px; border-left: 4px solid #ccc; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .triage-card.critical { border-color: var(--critical); }
    .triage-card.warning { border-color: var(--warning); }
    .triage-card.optimal { border-color: var(--optimal); }
    .triage-value { font-size: 28px; font-weight: 800; line-height: 1; margin-bottom: 5px; }
    .critical .triage-value { color: var(--critical); }
    .warning .triage-value { color: var(--warning); }
    .optimal .triage-value { color: var(--optimal); }
    .triage-label { font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text-muted); }
    .system-group { margin-bottom: 8mm; page-break-inside: avoid; }
    .system-header { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
    .system-icon { width: 24px; height: 24px; background: var(--primary-dark); color: white; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
    .system-icon svg { width: 14px; height: 14px; }
    .system-title { font-size: 16px; font-weight: 700; color: var(--primary-dark); }
    .biomarker-row { display: flex; align-items: center; background: var(--surface); border-radius: 8px; padding: 12px 15px; margin-bottom: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.02); border: 1px solid #f1f5f9; }
    .biomarker-info { width: 140px; flex-shrink: 0; }
    .bm-name { font-size: 13px; font-weight: 700; color: var(--primary-dark); margin-bottom: 2px; }
    .bm-meta { font-size: 10px; color: var(--text-muted); }
    .biomarker-value-box { width: 80px; text-align: right; padding-right: 20px; }
    .bm-value { font-size: 16px; font-weight: 800; }
    .val-critical { color: var(--critical); }
    .val-warning { color: var(--warning); }
    .bm-unit { font-size: 9px; color: var(--text-muted); font-weight: 500; }
    .gauge-container { flex: 1; position: relative; height: 30px; display: flex; align-items: center; }
    .gauge-track { width: 100%; height: 6px; border-radius: 10px; position: relative; }
    .track-low-high { background: linear-gradient(90deg, #FEE2E2 0%, #D1FAE5 20%, #D1FAE5 80%, #FEE2E2 100%); }
    .track-high-bad { background: linear-gradient(90deg, #D1FAE5 0%, #D1FAE5 70%, #FEF3C7 80%, #FEE2E2 100%); }
    .track-low-bad { background: linear-gradient(90deg, #FEE2E2 0%, #FEF3C7 20%, #D1FAE5 30%, #D1FAE5 100%); }
    .gauge-node { position: absolute; top: 50%; width: 12px; height: 12px; border-radius: 50%; background: white; transform: translate(-50%, -50%); box-shadow: 0 0 0 3px currentColor, 0 2px 4px rgba(0,0,0,0.2); }
    .node-critical { color: var(--critical); z-index: 10; }
    .node-warning { color: var(--warning); z-index: 10; }
    .gauge-labels { position: absolute; top: -14px; width: 100%; display: flex; justify-content: space-between; font-size: 8px; color: #94a3b8; font-weight: 600; }
    .all-clear { text-align: center; padding: 20mm 0; }
    .all-clear-icon { font-size: 48px; margin-bottom: 10px; }
    .all-clear h2 { font-size: 20px; font-weight: 800; color: var(--optimal); margin-bottom: 8px; }
    .all-clear p { font-size: 13px; color: var(--text-muted); }
    .action-button { display: inline-flex; align-items: center; gap: 5px; background: var(--primary-dark); color: white !important; padding: 10px 20px; border-radius: 6px; font-size: 12px; font-weight: 600; text-decoration: none; margin-top: 10mm; }
  </style>
</head>
<body>
  <div class="a4-page">
    <div class="header no-break">
      <div class="header-logo">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
        </svg>
        <div>
          <div class="brand-title">QURIX Plus</div>
          <div class="brand-subtitle">Executive Health Passport</div>
        </div>
      </div>
      <div class="patient-meta">
        <h2>${userName}</h2>
        <p>ID: ${patientId}</p>
        <p>Generated: ${dateGenerated}</p>
      </div>
    </div>

    <div class="content">
      <h1 class="report-title">Biomarker Exception Report</h1>
      <p class="report-desc">
        This executive summary isolates critical and warning analytes from your uploaded reports.
        Values plotted outside the green safe zone require medical review.
      </p>

      <div class="triage-summary no-break">
        <div class="triage-card critical">
          <div class="triage-value">${criticalCount}</div>
          <div class="triage-label">Critical Alerts</div>
        </div>
        <div class="triage-card warning">
          <div class="triage-value">${warningCount}</div>
          <div class="triage-label">Warning Alerts</div>
        </div>
        <div class="triage-card optimal">
          <div class="triage-value">${optimalCount}</div>
          <div class="triage-label">Optimal Biomarkers</div>
        </div>
      </div>

      ${noAbnormals
        ? `<div class="all-clear">
            <div class="all-clear-icon">✅</div>
            <h2>All Clear!</h2>
            <p>No abnormal biomarkers detected in your uploaded reports.<br>Keep up the great work, ${userName}!</p>
          </div>`
        : sortedCategories.map(categoryHTML).join("")
      }

      <a href="https://qurix.netlify.app/patient/dashboard" class="action-button no-break" target="_blank">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
          <polyline points="15 3 21 3 21 9"></polyline>
          <line x1="10" y1="14" x2="21" y2="3"></line>
        </svg>
        View Live Dashboard on QURIX Portal
      </a>
    </div>

    <div class="footer no-break">
      <div>Auto-generated by the QURIX Intelligence Engine for <strong>${userName}</strong>.</div>
      <div>${patientId} &middot; ${dateGenerated}</div>
    </div>
  </div>
  <script>
    window.onload = function() { setTimeout(function() { window.print(); }, 600); };
  </script>
</body>
</html>`

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html" }
    })
  } catch (error) {
    console.error("Failed to generate QURIX report:", error)
    return new NextResponse("Error generating report", { status: 500 })
  }
}


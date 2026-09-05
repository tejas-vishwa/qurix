import { NextResponse } from "next/server"
import { getServerSession, authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { extractMedicalData } from "@/lib/gemini-ocr"
import { BIOMARKERS_100 } from "@/lib/biomarkers100"

export const dynamic = "force-dynamic"
export const maxDuration = 60 // Allow longer execution time for Vercel Serverless

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized. Please sign in to upload reports." }, { status: 401 })
    }

    // Verify or auto-create the user in Prisma database (prevents foreign key errors)
    let userExists = await prisma.user.findFirst({
      where: {
        OR: [
          { id: session.user.id },
          { email: session.user.email ? session.user.email.toLowerCase().trim() : "" },
        ],
      },
    })

    if (!userExists) {
      userExists = await prisma.user.create({
        data: {
          id: session.user.id,
          email: session.user.email || `${session.user.id}@clerk.user`,
          name: session.user.name || "Patient",
          passwordHash: "clerk_managed_auth",
          role: "PATIENT",
        },
      }).catch(() => null)
    }

    const patientId = userExists ? userExists.id : session.user.id

    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const mimeType = file.type || "application/pdf"

    // Process medical document using structured OCR
    const extractedData = await extractMedicalData(buffer, mimeType)

    // Helper function to strip salutations
    const cleanSalutationsAndTitles = (str: string): string => {
      return str
        .replace(/\b(mr\.|mrs\.|ms\.|smt\.|shri\.|dr\.|master\.|miss\.|mr|mrs|ms|smt|shri|dr|master|miss)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim()
    }

    // Identity Verification (only if user has a custom name set, not default "Patient" or raw ID)
    const extractedPatientName = extractedData.patient?.name || null
    const sessionUserName = session.user.name || ""
    const isCustomName =
      sessionUserName &&
      !sessionUserName.startsWith("user_") &&
      sessionUserName.toLowerCase() !== "patient"

    if (extractedPatientName && isCustomName) {
      const cleanReportName = cleanSalutationsAndTitles(extractedPatientName.toLowerCase())
      const accountPatientName = cleanSalutationsAndTitles(sessionUserName.toLowerCase())

      if (cleanReportName && accountPatientName) {
        const accountTokens = accountPatientName.split(/[\s\.]+/).filter((t: string) => t.length > 2)
        const reportTokens = cleanReportName.split(/[\s\.]+/).filter((t: string) => t.length > 2)

        const isMatch =
          accountTokens.some((token: string) => cleanReportName.includes(token)) ||
          reportTokens.some((token: string) => accountPatientName.includes(token))

        if (!isMatch && reportTokens.length > 0 && accountTokens.length > 0) {
          return NextResponse.json(
            {
              error: `Identity mismatch. The report belongs to "${extractedPatientName}", but this account belongs to "${sessionUserName}". For security, this upload was blocked.`,
            },
            { status: 403 }
          )
        }
      }
    }

    // Generate clinical summary
    const biomarkersList = extractedData.biomarkers || []
    let aiSummary = ""
    if (biomarkersList.length > 0) {
      const abnormalCount = biomarkersList.filter(
        (b) => b.status === "high" || b.status === "low" || b.status === "critical"
      ).length
      aiSummary = `Successfully extracted ${biomarkersList.length} health metrics. ${
        abnormalCount > 0
          ? `${abnormalCount} biomarker(s) flagged outside reference range.`
          : "All extracted biomarkers are within normal reference ranges."
      } Key metrics: ${biomarkersList
        .slice(0, 5)
        .map((b) => `${b.testName} (${b.value} ${b.unit || ""})`)
        .join(", ")}.`
    } else if (extractedData.medications && extractedData.medications.length > 0) {
      aiSummary = `Extracted prescription with ${extractedData.medications.length} medication(s): ${extractedData.medications.map((m) => m.name).join(", ")}.`
    } else {
      aiSummary = `Processed medical document classified as ${extractedData.documentType || "lab_report"}.`
    }

    const base64Data = buffer.toString("base64")

    const parseValidDate = (dateStr: string | null | undefined): Date => {
      if (!dateStr) return new Date()
      const parts = dateStr.split(/[\/\-\.]/)
      if (parts.length === 3 && parts[0].length <= 2 && parseInt(parts[1]) <= 12) {
        const year = parseInt(parts[2].length === 2 ? `20${parts[2]}` : parts[2])
        const d = new Date(year, parseInt(parts[1]) - 1, parseInt(parts[0]))
        if (!isNaN(d.getTime())) return d
      }
      const d = new Date(dateStr)
      return isNaN(d.getTime()) ? new Date() : d
    }

    // 1. Create Report in Turso database
    const report = await prisma.report.create({
      data: {
        patientId,
        fileName: file.name,
        fileUrl: "/placeholder.pdf",
        fileData: base64Data,
        fileType: mimeType,
        status: "PARSED",
        parsedJson: JSON.stringify(extractedData),
        aiSummary: aiSummary,
        labName:
          extractedData.labName ||
          (extractedData.documentType === "lab_report" ? "Extracted Lab Report" : "Medical Document"),
        reportDate: parseValidDate(extractedData.testDate || extractedData.doctor?.date),
      },
    })

    // Set fileUrl to internal streaming endpoint
    await prisma.report.update({
      where: { id: report.id },
      data: { fileUrl: `/api/reports/${report.id}/file` },
    }).catch(() => {})

    // 2. High-performance biomarker batching (avoids 100+ sequential network queries)
    let hr_hemoglobin: number | null = null
    let hr_fasting_blood_sugar: number | null = null
    let hr_total_cholesterol: number | null = null
    let hr_ldl_cholesterol: number | null = null
    let hr_thyroid_tsh: number | null = null
    let hr_vitamin_d: number | null = null
    let hr_vitamin_b12: number | null = null
    let hr_calcium: number | null = null

    if (biomarkersList.length > 0) {
      // Pre-fetch all definitions in 1 fast query instead of 100 queries in a loop
      const existingDefs = await prisma.biomarkerDefinition.findMany().catch(() => [])
      const defMap = new Map<string, any>()
      existingDefs.forEach((d) => defMap.set(d.code.toUpperCase(), d))

      const metricsToInsert: any[] = []

      for (const b of biomarkersList) {
        if (!b.testName || b.value === null || b.value === undefined) continue

        const matchedDef = BIOMARKERS_100.find(
          (def) =>
            def.name.toLowerCase() === b.testName.toLowerCase() ||
            def.code.toLowerCase() === b.testName.toLowerCase().replace(/[^a-z0-9]/g, "_")
        )

        const rawCode = (matchedDef ? matchedDef.code : b.testName.toUpperCase().replace(/[^A-Z0-9]/g, "_")).slice(0, 50)
        const code = rawCode || "BIOMARKER"
        const displayName = (matchedDef ? matchedDef.name : b.testName).slice(0, 100)
        const unit = (b.unit || (matchedDef ? matchedDef.unit : "") || "").slice(0, 30)

        let biomarkerDef = defMap.get(code)
        if (!biomarkerDef) {
          try {
            biomarkerDef = await prisma.biomarkerDefinition.upsert({
              where: { code },
              update: { displayName, unit },
              create: {
                code,
                displayName,
                unit,
                category: matchedDef ? matchedDef.category : "Extracted",
                refMin: matchedDef ? matchedDef.refMin : null,
                refMax: matchedDef ? matchedDef.refMax : null,
              },
            })
            defMap.set(code, biomarkerDef)
          } catch (defErr) {
            console.warn("Biomarker definition upsert note:", defErr)
            continue
          }
        }

        const numVal = typeof b.value === "number" ? b.value : parseFloat(b.value)
        if (isNaN(numVal)) continue

        const isAbnormal = b.status === "high" || b.status === "low" || b.status === "critical"

        metricsToInsert.push({
          reportId: report.id,
          biomarkerId: biomarkerDef.id,
          value: numVal,
          unit,
          refMin: biomarkerDef.refMin,
          refMax: biomarkerDef.refMax,
          isAbnormal,
        })

        if (code === "HEMOGLOBIN") hr_hemoglobin = numVal
        if (code === "GLUCOSE_FASTING") hr_fasting_blood_sugar = numVal
        if (code === "CHOLESTEROL_TOTAL") hr_total_cholesterol = numVal
        if (code === "LDL") hr_ldl_cholesterol = numVal
        if (code === "TSH") hr_thyroid_tsh = numVal
        if (code === "VITAMIN_D") hr_vitamin_d = numVal
        if (code === "VITAMIN_B12") hr_vitamin_b12 = numVal
        if (code === "CALCIUM") hr_calcium = numVal
      }

      // Batch insert metrics
      if (metricsToInsert.length > 0) {
        try {
          await prisma.extractedMetric.createMany({
            data: metricsToInsert,
          })
        } catch (cmErr) {
          // Fallback if createMany encounters driver limitation
          for (const metric of metricsToInsert) {
            await prisma.extractedMetric.create({ data: metric }).catch(() => {})
          }
        }
      }
    }

    // 3. Optional legacy UserHealthRecord (non-fatal)
    let healthRecord = null
    try {
      healthRecord = await prisma.userHealthRecord.create({
        data: {
          reportId: report.id,
          patientId,
          hemoglobin: hr_hemoglobin,
          fasting_blood_sugar: hr_fasting_blood_sugar,
          thyroid_tsh: hr_thyroid_tsh,
          ldl_cholesterol: hr_ldl_cholesterol,
          vitamin_d: hr_vitamin_d,
          vitamin_b12: hr_vitamin_b12,
        },
      })
    } catch (hrErr) {
      console.warn("UserHealthRecord legacy note:", hrErr)
    }

    return NextResponse.json({
      success: true,
      report,
      healthRecord,
      extractedData,
    })
  } catch (error: any) {
    console.error("Extraction error:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to process medical report. Please try again." },
      { status: 500 }
    )
  }
}

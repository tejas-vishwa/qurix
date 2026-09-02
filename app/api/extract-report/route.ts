import { NextResponse } from "next/server"
import { getServerSession, authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma"
import { extractMedicalData } from "@/lib/gemini-ocr"
import { BIOMARKERS_100 } from "@/lib/biomarkers100"

export const dynamic = "force-dynamic"
export const maxDuration = 60 // Allow longer execution time for Vercel Serverless

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify the user still exists in the database (handles stale JWT cookies after a DB reset)
    const userExists = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!userExists) {
      return NextResponse.json({ error: "Your session is invalid or the account was deleted. Please log out and log back in." }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const mimeType = file.type || "application/pdf"

    // Process medical document using Gemini Structured Outputs (with local OCR fallback)
    const extractedData = await extractMedicalData(buffer, mimeType)

    // Helper function to strip salutations (Mr., Mrs., Ms., Smt., Shri., Dr., Master, Miss)
    const cleanSalutationsAndTitles = (str: string): string => {
      return str
        .replace(/\b(mr\.|mrs\.|ms\.|smt\.|shri\.|dr\.|master\.|miss\.|mr|mrs|ms|smt|shri|dr|master|miss)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim()
    }

    // Identity Verification if patient name is extracted
    const extractedPatientName = extractedData.patient?.name || null
    if (extractedPatientName && session.user.name) {
      const cleanReportName = cleanSalutationsAndTitles(extractedPatientName.toLowerCase())
      const accountPatientName = cleanSalutationsAndTitles(session.user.name.toLowerCase())

      if (cleanReportName && accountPatientName) {
        const accountTokens = accountPatientName.split(/[\s\.]+/).filter((t: string) => t.length > 2)
        const reportTokens = cleanReportName.split(/[\s\.]+/).filter((t: string) => t.length > 2)

        const isMatch = accountTokens.some((token: string) => cleanReportName.includes(token)) ||
                        reportTokens.some((token: string) => accountPatientName.includes(token))

        if (!isMatch && reportTokens.length > 0) {
          return NextResponse.json({ 
            error: `Identity mismatch. The report belongs to "${extractedPatientName}", but this account belongs to "${session.user.name}". For security, this upload was blocked.` 
          }, { status: 403 })
        }
      }
    }

    // Generate clinical summary
    const biomarkersList = extractedData.biomarkers || []
    let aiSummary = ""
    if (biomarkersList.length > 0) {
      const abnormalCount = biomarkersList.filter(b => b.status === "high" || b.status === "low" || b.status === "critical").length
      aiSummary = `Successfully extracted ${biomarkersList.length} health metrics using Gemini Structured Outputs. ${
        abnormalCount > 0 ? `${abnormalCount} biomarker(s) flagged outside reference range.` : "All extracted biomarkers are within normal reference ranges."
      } Key metrics: ${biomarkersList.slice(0, 5).map(b => `${b.testName} (${b.value} ${b.unit || ''})`).join(", ")}.`
    } else if (extractedData.medications && extractedData.medications.length > 0) {
      aiSummary = `Extracted prescription with ${extractedData.medications.length} medication(s): ${extractedData.medications.map(m => m.name).join(", ")}.`
    } else {
      aiSummary = `Processed medical document classified as ${extractedData.documentType}.`
    }

    const base64Data = buffer.toString("base64")
    const doctorName = extractedData.doctor?.name || null

    const parseValidDate = (dateStr: string | null | undefined): Date => {
      if (!dateStr) return new Date();
      // Try parsing Indian format DD/MM/YYYY
      const parts = dateStr.split(/[\/\-\.]/);
      if (parts.length === 3 && parts[0].length <= 2 && parseInt(parts[1]) <= 12) {
        // Assume DD/MM/YYYY
        const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        if (!isNaN(d.getTime())) return d;
      }
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? new Date() : d;
    };

    // Store PDF/Image binary directly in Turso database as Base64
    const report = await prisma.report.create({
      data: {
        patientId: session.user.id,
        fileName: file.name,
        fileUrl: "/placeholder.pdf",
        fileData: base64Data,
        fileType: mimeType,
        status: "PARSED",
        parsedJson: JSON.stringify(extractedData),
        aiSummary: aiSummary,
        labName: extractedData.labName || (extractedData.documentType === "lab_report" ? "Extracted Lab Report" : "Medical Document"),
        reportDate: parseValidDate(extractedData.testDate || extractedData.doctor?.date),
      },
    })

    // Update fileUrl to serve directly from Turso database endpoint
    await prisma.report.update({
      where: { id: report.id },
      data: { fileUrl: `/api/reports/${report.id}/file` }
    })

    // Variables for legacy UserHealthRecord table
    let hr_hemoglobin: number | null = null
    let hr_fasting_blood_sugar: number | null = null
    let hr_total_cholesterol: number | null = null
    let hr_ldl_cholesterol: number | null = null
    let hr_thyroid_tsh: number | null = null
    let hr_vitamin_d: number | null = null
    let hr_vitamin_b12: number | null = null
    let hr_calcium: number | null = null

    // Process & store extracted metrics
    for (const b of biomarkersList) {
      if (!b.testName || b.value === null || b.value === undefined) continue

      // Match against BIOMARKERS_100 canonical codes if possible
      const matchedDef = BIOMARKERS_100.find(
        def => def.name.toLowerCase() === b.testName.toLowerCase() ||
               def.code.toLowerCase() === b.testName.toLowerCase().replace(/[^a-z0-9]/g, '_')
      )

      const code = matchedDef ? matchedDef.code : b.testName.toUpperCase().replace(/[^A-Z0-9]/g, '_')
      const displayName = matchedDef ? matchedDef.name : b.testName
      const unit = b.unit || (matchedDef ? matchedDef.unit : "")

      let biomarkerDef = await prisma.biomarkerDefinition.findFirst({
        where: { code }
      })

      if (!biomarkerDef) {
        biomarkerDef = await prisma.biomarkerDefinition.create({
          data: {
            code,
            displayName,
            unit,
            category: matchedDef ? matchedDef.category : "Extracted",
            refMin: matchedDef ? matchedDef.refMin : null,
            refMax: matchedDef ? matchedDef.refMax : null
          }
        })
      }

      const isAbnormal = b.status === "high" || b.status === "low" || b.status === "critical"

      await prisma.extractedMetric.create({
        data: {
          reportId: report.id,
          biomarkerId: biomarkerDef.id,
          value: b.value,
          unit,
          refMin: biomarkerDef.refMin,
          refMax: biomarkerDef.refMax,
          isAbnormal,
        }
      })

      // Update legacy health record mappings
      if (code === 'HEMOGLOBIN') hr_hemoglobin = b.value
      if (code === 'GLUCOSE_FASTING') hr_fasting_blood_sugar = b.value
      if (code === 'CHOLESTEROL_TOTAL') hr_total_cholesterol = b.value
      if (code === 'LDL') hr_ldl_cholesterol = b.value
      if (code === 'TSH') hr_thyroid_tsh = b.value
      if (code === 'VITAMIN_D') hr_vitamin_d = b.value
      if (code === 'VITAMIN_B12') hr_vitamin_b12 = b.value
      if (code === 'CALCIUM') hr_calcium = b.value
    }

    const healthRecord = await prisma.userHealthRecord.create({
      data: {
        reportId: report.id,
        patientId: session.user.id,
        hemoglobin: hr_hemoglobin,
        fasting_blood_sugar: hr_fasting_blood_sugar,
        thyroid_tsh: hr_thyroid_tsh,
        ldl_cholesterol: hr_ldl_cholesterol,
        vitamin_d: hr_vitamin_d,
        vitamin_b12: hr_vitamin_b12
      },
    })

    return NextResponse.json({
      success: true,
      report,
      healthRecord,
      extractedData
    })
  } catch (error: any) {
    console.error("Extraction error:", error)
    return NextResponse.json({ error: "Failed to process medical report. Please try again." }, { status: 500 })
  }
}

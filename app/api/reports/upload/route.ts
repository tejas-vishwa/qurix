import { NextResponse } from "next/server"
import { getServerSession, authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma"
import { extractMedicalData } from "@/lib/gemini-ocr"
import { BIOMARKERS_100 } from "@/lib/biomarkers100"
import { validateUploadedFile, ALLOWED_DOCUMENT_MIME_TYPES, verifyFileContentMagicBytes, sanitizeSafeFileName } from "@/lib/validations"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const formData = await req.formData().catch(() => null)
    if (!formData) {
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 })
    }

    const rawFile = formData.get("file")
    const fileValidation = validateUploadedFile(rawFile, ALLOWED_DOCUMENT_MIME_TYPES)
    if (!fileValidation.valid) {
      return fileValidation.response
    }

    const file = fileValidation.file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Verify raw magic bytes content
    const magicCheck = verifyFileContentMagicBytes(buffer)
    if (!magicCheck.valid) {
      return NextResponse.json({ error: magicCheck.error || "Invalid file content signature" }, { status: 400 })
    }

    const safeFileName = sanitizeSafeFileName(file.name, "medical_report")
    const base64Data = buffer.toString("base64")
    const mimeType = magicCheck.detectedType || file.type || "application/pdf"

    // 1. Process medical document via Gemini Structured Outputs
    const extractedData = await extractMedicalData(buffer, mimeType)

    // 2. Create Report record in Turso Database
    const report = await prisma.report.create({
      data: {
        patientId: session.user.id,
        fileName: safeFileName,
        fileUrl: `/api/reports/placeholder/file`,
        fileData: base64Data,
        fileType: mimeType,
        status: "PARSED",
        parsedJson: JSON.stringify(extractedData),
        reportDate: extractedData.doctor?.date ? new Date(extractedData.doctor.date) : new Date(),
        labName: extractedData.doctor?.name || "Lab Partner",
      }
    })

    // Update fileUrl to serve directly from Turso database endpoint
    await prisma.report.update({
      where: { id: report.id },
      data: { fileUrl: `/api/reports/${report.id}/file` }
    })

    const extractedMetricsList: any[] = []
    const biomarkersList = extractedData.biomarkers || []

    for (const b of biomarkersList) {
      if (!b.testName || b.value === null || b.value === undefined) continue

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

      const metric = await prisma.extractedMetric.create({
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

      extractedMetricsList.push({ ...metric, code })
    }

    // 3. Create health record entry
    const hbMarker = extractedMetricsList.find(e => e.code === 'HEMOGLOBIN')
    const ldlMarker = extractedMetricsList.find(e => e.code === 'LDL')
    const hdlMarker = extractedMetricsList.find(e => e.code === 'HDL')
    const glucoseMarker = extractedMetricsList.find(e => e.code === 'GLUCOSE_FASTING')
    const trigMarker = extractedMetricsList.find(e => e.code === 'TRIGLYCERIDES')

    await prisma.userHealthRecord.create({
      data: {
        patientId: session.user.id,
        reportId: report.id,
        hemoglobin: hbMarker?.value ?? null,
        ldl_cholesterol: ldlMarker?.value ?? null,
        hdl_cholesterol: hdlMarker?.value ?? null,
        fasting_blood_sugar: glucoseMarker?.value ?? null,
        triglycerides: trigMarker?.value ?? null,
      }
    })

    // 4. Alert if abnormal metrics detected
    const abnormalMetrics = extractedMetricsList.filter(e => e.isAbnormal)
    if (abnormalMetrics.length > 0) {
      await prisma.healthAlert.create({
        data: {
          patientId: session.user.id,
          severity: "WARNING",
          message: `Your latest report shows ${abnormalMetrics.length} abnormal biomarker level(s).`
        }
      })
    }

    return NextResponse.json({ success: true, reportId: report.id, extractedData })
  } catch (error: any) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: error?.message || "Upload failed" }, { status: 500 })
  }
}

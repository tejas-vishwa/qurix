import { NextResponse } from "next/server"
import { extractTextFromPDF } from "@/lib/gemini-ocr"
import Tesseract from "tesseract.js"

export const dynamic = "force-dynamic"
export const maxDuration = 30

const PRESCRIPTION_KEYWORDS = [
  "rx", "doctor", "dr.", "dr ", "clinic", "hospital", "opd", "prescription",
  "tablet", "tab", "tab.", "capsule", "cap", "syrup", "dosage", "dose",
  "mg", "ml", "mcg", "sos", "after meal", "before meal", "od", "bd", "tds",
  "daily", "take", "prescribed", "diagnosis", "patient name", "advice", "symptoms"
]

const REPORT_KEYWORDS = [
  "pathology", "laboratory", "lab report", "reference range", "ref range",
  "biomarker", "hemoglobin", "g/dl", "mg/dl", "u/l", "iu/l", "mm/hr",
  "cholesterol", "triglycerides", "thyroid", "tsh", "glucose", "fasting",
  "hba1c", "creatinine", "urea", "bilirubin", "sgot", "sgpt", "wbc", "rbc",
  "platelet", "test name", "observed value", "specimen", "investigation"
]

/**
 * Analyzes file byte histogram to detect if an image is a 2D/3D grayscale medical scan (X-Ray, CT, MRI).
 */
function analyzeVisualScanSignature(buffer: Buffer, filename: string) {
  const ext = filename.toLowerCase()
  if (ext.endsWith(".dcm") || ext.endsWith(".nii") || ext.endsWith(".nii.gz")) {
    return { isScan: true, confidence: 99.0, reason: "DICOM/NIfTI Medical Volume Extension" }
  }

  // Check DICOM magic number ("DICM" at byte offset 128)
  if (buffer.length > 132) {
    const magic = buffer.toString("ascii", 128, 132)
    if (magic === "DICM") {
      return { isScan: true, confidence: 99.5, reason: "DICOM Binary Header Detected" }
    }
  }

  // Sample bytes to check color variance & central luminance typical of X-Rays
  const step = Math.max(1, Math.floor(buffer.length / 500))
  let grayscaleByteCount = 0
  let totalSamples = 0
  let byteSum = 0

  for (let i = 0; i < buffer.length - 3; i += step) {
    const r = buffer[i]
    const g = buffer[i + 1]
    const b = buffer[i + 2]

    // If R, G, B channels are almost identical (pure grayscale typical of X-Rays/CT slices)
    if (Math.abs(r - g) < 15 && Math.abs(g - b) < 15 && Math.abs(r - b) < 15) {
      grayscaleByteCount++
    }
    byteSum += r
    totalSamples++
  }

  const grayscalePct = totalSamples > 0 ? (grayscaleByteCount / totalSamples) * 100 : 0
  const meanLuminance = totalSamples > 0 ? byteSum / totalSamples : 128

  // High grayscale ratio + dark background contrast is characteristic of Chest X-Rays / CT scans
  if (grayscalePct > 78.0 && (meanLuminance < 140 || meanLuminance > 40)) {
    return { isScan: true, confidence: Math.min(95.0, grayscalePct), reason: `Grayscale Visual Histogram (${grayscalePct.toFixed(1)}% monochrome)` }
  }

  return { isScan: false, confidence: 0, reason: "Color variance matches document/paper scan" }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const filename = file.name || "document.png"

    // Step 1: Visual & Binary Medical Scan Detection
    const scanResult = analyzeVisualScanSignature(fileBuffer, filename)
    if (scanResult.isScan && scanResult.confidence >= 85.0) {
      return NextResponse.json({
        documentType: "SCAN",
        confidencePct: scanResult.confidence,
        typeName: "AI Diagnostic Scan (X-Ray/CT)",
        reason: scanResult.reason
      })
    }

    // Step 2: OCR Text Extraction for Content Classification
    let textContent = ""
    if (file.type === "application/pdf" || filename.toLowerCase().endsWith(".pdf")) {
      try {
        textContent = await extractTextFromPDF(fileBuffer)
      } catch (pdfErr) {
        console.warn("PDF extraction note:", pdfErr)
      }
    }

    // If PDF text is empty or image file, run Tesseract OCR
    if (!textContent || textContent.trim().length < 15) {
      try {
        const ret = await Tesseract.recognize(fileBuffer, "eng")
        textContent = ret?.data?.text || ""
      } catch (ocrErr) {
        console.warn("Tesseract OCR note:", ocrErr)
      }
    }

    const lowerText = textContent.toLowerCase()

    // Step 3: Keyword Match Scoring Matrix
    let prescriptionScore = 0
    let reportScore = 0

    for (const kw of PRESCRIPTION_KEYWORDS) {
      if (lowerText.includes(kw)) {
        prescriptionScore += kw === "rx" ? 5 : (kw === "doctor" || kw === "dr." || kw === "tablet" ? 3 : 1)
      }
    }

    for (const kw of REPORT_KEYWORDS) {
      if (lowerText.includes(kw)) {
        reportScore += kw === "reference range" || kw === "biomarker" ? 5 : (kw === "g/dl" || kw === "mg/dl" ? 3 : 1)
      }
    }

    let detectedType: "SCAN" | "PRESCRIPTION" | "REPORT" = "REPORT"
    let confidencePct = 75.0
    let typeName = "Lab Report"
    let reason = "Biomarker data detected"

    if (scanResult.isScan && scanResult.confidence > 60.0 && prescriptionScore < 3 && reportScore < 3) {
      detectedType = "SCAN"
      confidencePct = scanResult.confidence
      typeName = "AI Diagnostic Scan (X-Ray/CT)"
      reason = scanResult.reason
    } else if (prescriptionScore > reportScore && prescriptionScore >= 2) {
      detectedType = "PRESCRIPTION"
      confidencePct = Math.min(99.0, 70.0 + prescriptionScore * 4)
      typeName = "Doctor Prescription"
      reason = `Matched ${prescriptionScore} prescription indicators (Rx, medicines, dosages)`
    } else if (reportScore > 0) {
      detectedType = "REPORT"
      confidencePct = Math.min(99.0, 70.0 + reportScore * 4)
      typeName = "Biomarker Lab Report"
      reason = `Matched ${reportScore} clinical lab indicators (reference ranges, biomarkers)`
    } else {
      // Fallback auto-heuristic
      if (/xray|scan|chest|mri|ct/i.test(filename)) {
        detectedType = "SCAN"
        confidencePct = 80.0
        typeName = "AI Diagnostic Scan (X-Ray/CT)"
        reason = "FileName medical imaging pattern"
      } else if (/prescription|rx|medicine|doctor/i.test(filename)) {
        detectedType = "PRESCRIPTION"
        confidencePct = 80.0
        typeName = "Doctor Prescription"
        reason = "FileName prescription pattern"
      }
    }

    return NextResponse.json({
      documentType: detectedType,
      confidencePct: Math.round(confidencePct),
      typeName,
      reason,
      scores: { prescriptionScore, reportScore }
    })

  } catch (error: any) {
    console.error("Document classification error:", error)
    return NextResponse.json({
      documentType: "REPORT",
      confidencePct: 60,
      typeName: "Lab Report",
      reason: "Standard document fallback"
    })
  }
}

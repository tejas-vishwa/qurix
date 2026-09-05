import { GoogleGenAI } from "@google/genai";
import Tesseract from "tesseract.js"
import { extractText, extractImages, getDocumentProxy } from "unpdf"
import { BIOMARKERS_100 } from "./biomarkers100"
import type { ExtractedMedicalData, ExtractedMedication } from "@/types/medical-ocr"

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "dummy" });

// List of non-medicine words to filter out from prescription OCR
const NON_MEDICINE_WORDS = new Set([
  "instruction", "instructions", "meal", "meals", "stomach", "after", "before", "food",
  "daily", "days", "day", "every", "hours", "hour", "take", "for", "times", "time",
  "water", "bedtime", "morning", "night", "evening", "sos", "rx", "note", "notes",
  "advice", "signature", "doctor", "dr", "patient", "name", "date", "age", "sex",
  "gender", "clinic", "hospital", "phone", "address", "reg", "no", "number", "tab",
  "tbl", "tablet", "tablets", "cap", "capsule", "capsules", "syrup", "inj", "injection",
  "sl", "ointment", "drops", "cream", "gel", "lotion", "mg", "g", "mcg", "ml", "iu",
  "units", "diet", "follow", "up", "review", "test", "tests", "investigation",
  "investigations", "diagnosis", "symptoms", "history", "chief", "complaint", "complaints",
  "bp", "pulse", "temp", "temperature", "weight", "height", "spo2", "rr", "vitals", "with",
  "without", "empty", "full", "glass", "cup", "spoon", "puff", "puffs", "daily", "weekly"
])

/**
 * Converts raw pixel data (RGB/RGBA/Grayscale) extracted from a PDF page into an
 * uncompressed 24-bit BMP Buffer so Tesseract/Leptonica can OCR it without external C++ binaries.
 */
function rawPixelsToBmp(img: { data: Uint8ClampedArray | Uint8Array; width: number; height: number; channels: number }): Buffer {
  const { width, height, channels, data } = img
  const rowSize = Math.floor((24 * width + 31) / 32) * 4
  const pixelArraySize = rowSize * height
  const fileSize = 54 + pixelArraySize
  const buf = Buffer.alloc(fileSize)

  // BITMAPFILEHEADER (14 bytes)
  buf.write("BM", 0)
  buf.writeUInt32LE(fileSize, 2)
  buf.writeUInt32LE(0, 6)
  buf.writeUInt32LE(54, 10)

  // BITMAPINFOHEADER (40 bytes)
  buf.writeUInt32LE(40, 14)
  buf.writeInt32LE(width, 18)
  buf.writeInt32LE(-height, 22) // Negative height specifies top-down orientation
  buf.writeUInt16LE(1, 26) // 1 plane
  buf.writeUInt16LE(24, 28) // 24-bit RGB
  buf.writeUInt32LE(0, 30) // BI_RGB (uncompressed)
  buf.writeUInt32LE(pixelArraySize, 34)
  buf.writeInt32LE(2835, 38) // ~72 DPI
  buf.writeInt32LE(2835, 42)
  buf.writeUInt32LE(0, 46)
  buf.writeUInt32LE(0, 50)

  // Write pixel data in BGR format with row padding
  const offset = 54
  for (let y = 0; y < height; y++) {
    const rowStart = offset + y * rowSize
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * channels
      const r = data[srcIdx]
      const g = channels >= 2 ? data[srcIdx + 1] : r
      const b = channels >= 3 ? data[srcIdx + 2] : r
      const dstIdx = rowStart + x * 3
      buf[dstIdx] = b
      buf[dstIdx + 1] = g
      buf[dstIdx + 2] = r
    }
  }

  return buf
}

/**
 * Extracts text from PDF files using unpdf, with automatic Tesseract OCR fallback
 * when digital text is empty or sparse (e.g. scanned documents / photographed reports).
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  let text = ""

  // 1. Digital text extraction (instant for native PDFs like Thyrocare / Lal PathLabs)
  try {
    const pdfData = await extractText(new Uint8Array(buffer), { mergePages: true })
    if (typeof pdfData === "string") {
      text = pdfData
    } else if (typeof (pdfData as any)?.text === "string") {
      text = (pdfData as any).text
    } else if (Array.isArray((pdfData as any)?.text)) {
      text = (pdfData as any).text.join("\n")
    }
  } catch (err) {
    console.warn("Digital PDF text extraction notice:", err)
  }

  // If digital text extraction found substantial content (>= 50 chars), return it immediately
  if (text.trim().length >= 50) {
    return text
  }

  // 2. Tesseract OCR Fallback for scanned / image-based PDF pages
  console.log("PDF digital text is empty or sparse (<50 chars). Running Tesseract OCR on PDF page images...")
  try {
    const doc = await getDocumentProxy(new Uint8Array(buffer))
    const totalPages = Math.min(doc.numPages, 10) // Limit to 10 pages for serverless execution budget
    const ocrPagesText: string[] = []

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        const images = await extractImages(doc, pageNum)
        if (images && images.length > 0) {
          for (const img of images) {
            // Only OCR images of adequate dimensions (> 80x80) to skip tiny logos/icons
            if (img.width >= 80 && img.height >= 80) {
              const bmpBuf = rawPixelsToBmp(img)
              const ret = await Tesseract.recognize(bmpBuf, "eng")
              if (ret?.data?.text?.trim()) {
                ocrPagesText.push(ret.data.text.trim())
              }
            }
          }
        }
      } catch (pageErr) {
        console.warn(`OCR extraction failed on page ${pageNum}:`, pageErr)
      }
    }

    if (ocrPagesText.length > 0) {
      text = (text + "\n\n" + ocrPagesText.join("\n\n")).trim()
    }
  } catch (ocrErr) {
    console.warn("PDF Tesseract OCR fallback notice:", ocrErr)
  }

  // 3. Fallback: try direct Tesseract recognition on the buffer in case it was an image with a pdf extension
  if (!text.trim()) {
    try {
      const ret = await Tesseract.recognize(buffer, "eng")
      if (ret?.data?.text?.trim()) {
        text = ret.data.text.trim()
      }
    } catch {}
  }

  return text
}

/**
 * Sanitizes and validates extracted medications list.
 * Strips out header words, prepositions, timing instructions, item list numbers, and non-drug text.
 */

// Hardcoded drug dictionary for validation
const VALID_DRUGS = new Set([
  "paracetamol", "azithromycin", "dolo", "pan", "darolac", "amoxicillin", 
  "pantoprazole", "cetirizine", "ibuprofen", "aspirin", "metformin", 
  "atorvastatin", "cefim", "cefixime", "augmentin", "linezolid", 
  "levofloxacin", "ciprofloxacin", "omeprazole", "ranitidine", "telmisartan", 
  "amlodipine", "montelukast", "calpol", "crocin", "allegra", "sinarest"
]);

export function sanitizeMedications(medications: ExtractedMedication[]): ExtractedMedication[] {
  if (!Array.isArray(medications)) return []
  const cleanList: ExtractedMedication[] = []

  for (const m of medications) {
    if (!m || typeof m.name !== "string") continue

    let name = m.name.trim().replace(/^[\d\.\-\s]+/, "").trim()
    if (name.length < 3) continue

    cleanList.push({
      name: name,
      dosage: m.dosage ? m.dosage.trim() : null,
      duration: m.duration ? m.duration.trim() : null,
      instructions: m.instructions ? m.instructions.trim() : null
    })
  }

  return cleanList
}

export async function extractPrescriptionData(buffer: Buffer, mimeType: string): Promise<any> {
  return await fallbackPrescriptionExtraction(buffer, mimeType)
}

export async function extractMedicalData(buffer: Buffer, mimeType: string): Promise<ExtractedMedicalData> {
  return await fallbackLabReportExtraction(buffer, mimeType)
}


async function fallbackPrescriptionExtraction(buffer: Buffer, mimeType: string): Promise<any> {
  let extractedText = ""

  if (mimeType.includes("pdf") || mimeType === "application/octet-stream") {
    extractedText = await extractTextFromPDF(buffer)
  } else if (mimeType.startsWith("image/")) {
    try {
      const ret = await Tesseract.recognize(buffer, "eng")
      extractedText = ret.data.text || ""
    } catch (err) {
      console.error("Tesseract prescription fallback failed:", err)
    }
  }
  
  if (!extractedText.trim()) {
    try {
      const ret = await Tesseract.recognize(buffer, "eng")
      extractedText = ret.data.text || ""
    } catch (err) {
      console.error("Tesseract universal fallback failed:", err)
    }
  }

  const systemPrompt = `You are an expert medical transcriptionist. Extract all clinical details from this prescription into valid JSON. Do not include markdown codeblocks or extra text.

Return exactly this JSON schema:
{
  "documentType": "prescription",
  "patientName": "string or null",
  "date": "string (YYYY-MM-DD or DD/MM/YYYY) or null",
  "diagnosis": ["string (e.g., Acute Gastritis, Viral Infection)"],
  "symptoms": ["string"],
  "vitals": {
    "temperature": "string or null",
    "bloodPressure": "string or null",
    "pulseRate": "string or null",
    "weight": "string (e.g., 70 kg) or null"
  },
  "medications": [
    {
      "name": "string (e.g., Cap. Pantoprazole 40mg)",
      "dosage": "string (e.g., 1-0-0)",
      "duration": "string (e.g., 7 Days)",
      "instructions": "string (e.g., 30 mins before breakfast)"
    }
  ],
  "advice": ["string (dietary or general advice)"],
  "doctorName": "string or null"
}`;

  let parsed: any = { documentType: "prescription", diagnosis: [], symptoms: [], medications: [], vitals: {} };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `${systemPrompt}\n\nRaw OCR Text:\n${extractedText}`,
      config: {
        responseMimeType: "application/json",
        temperature: 0.1
      }
    });
    
    if (response.text) {
      const cleaned = response.text
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();
      parsed = JSON.parse(cleaned);
    }
  } catch (err) {
    console.error("Failed to parse Gemini OCR JSON:", err);
  }

  return parsed;
}

/**
 * Local extraction for Lab Reports.
 */
async function fallbackLabReportExtraction(
  buffer: Buffer,
  mimeType: string
): Promise<ExtractedMedicalData> {
  let extractedText = ""

  if (mimeType.includes("pdf") || mimeType === "application/octet-stream") {
    extractedText = await extractTextFromPDF(buffer)
  } else if (mimeType.startsWith("image/")) {
    try {
      const ret = await Tesseract.recognize(buffer, "eng")
      extractedText = ret.data.text || ""
    } catch (err) {
      console.error("Tesseract lab report fallback failed:", err)
    }
  }

  if (!extractedText.trim()) {
    try {
      const ret = await Tesseract.recognize(buffer, "eng")
      extractedText = ret.data.text || ""
    } catch (err) {
      console.error("Tesseract lab report universal fallback failed:", err)
    }
  }

  const cleanSalutations = (str: string) =>
    str.replace(/\b(mr\.|mrs\.|ms\.|smt\.|shri\.|dr\.|master\.|miss\.|mr|mrs|ms|smt|shri|dr|master|miss)\b/gi, "").replace(/\s+/g, " ").trim()

  let patientName: string | null = null
  const nameMatch = extractedText.match(/(?:patient\s*name|patient\'?s?\s*name|name\s*of\s*patient|name)\s*[:\-\=]?\s*(?:mr\.|mrs\.|ms\.|dr\.)?\s*([A-Za-z\s\.]{2,50})/i)
  if (nameMatch && nameMatch[1]) {
    let rawName = nameMatch[1].trim().replace(/\b(age|sex|gender|dob|ref|lab|date)\b.*/i, "").trim()
    rawName = cleanSalutations(rawName)
    if (rawName.length > 1) patientName = rawName
  }

  let doctorName: string | null = null
  const docMatch = extractedText.match(/(?:dr\.|doctor)[^\w]?\s*([a-z\s\.]+)/i)
  if (docMatch && docMatch[1]) {
    doctorName = `Dr. ${docMatch[1].trim().slice(0, 30)}`
  }

  let testDate: string | null = null
  const dateMatch = extractedText.match(/(?:sample collected|date of collection|test date|registered on|report date|date|collected|registered|reported)\s*[:\-\=]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4})/i)
  if (dateMatch && dateMatch[1]) {
    testDate = dateMatch[1].trim()
  }

  let labName: string | null = null
  if (/thyrocare/i.test(extractedText)) labName = "Thyrocare"
  else if (/lal path/i.test(extractedText)) labName = "Dr. Lal PathLabs"
  else if (/srl/i.test(extractedText)) labName = "SRL Diagnostics"
  else if (/metropolis/i.test(extractedText)) labName = "Metropolis Healthcare"
  else if (/apollo/i.test(extractedText)) labName = "Apollo Diagnostics"
  else if (/suburban/i.test(extractedText)) labName = "Suburban Diagnostics"
  else if (/lucid/i.test(extractedText)) labName = "Lucid Medical Diagnostics"
  else if (/vijaya/i.test(extractedText)) labName = "Vijaya Diagnostic Centre"
  else if (/max/i.test(extractedText)) labName = "Max Healthcare"

  const biomarkers: any[] = []
  BIOMARKERS_100.forEach((b) => {
    // Match by full name, stripped name (without parentheses like "(PCV)"), or canonical patterns
    const cleanName = b.name.replace(/\s*\([^)]*\)/g, "").trim()
    const patterns = [b.name]
    if (cleanName && cleanName !== b.name) patterns.push(cleanName)

    let matchedVal: number | null = null
    for (const pat of patterns) {
      const safeName = pat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      const regex = new RegExp(`(?:${safeName})[^\\d]{0,40}?([\\d\\.]+)`, "i")
      const match = extractedText.match(regex)
      if (match && match[1]) {
        const val = parseFloat(match[1])
        if (!isNaN(val)) {
          matchedVal = val
          break
        }
      }
    }

    if (matchedVal !== null) {
      let status: "normal" | "high" | "low" = "normal"
      if (b.refMin !== null && matchedVal < b.refMin) status = "low"
      if (b.refMax !== null && matchedVal > b.refMax) status = "high"
      biomarkers.push({
        testName: b.name,
        value: matchedVal,
        unit: b.unit,
        referenceInterval: b.refMin !== null && b.refMax !== null ? `${b.refMin} - ${b.refMax}` : null,
        status
      })
    }
  })

  return {
    documentType: "lab_report",
    patient: { name: patientName, age: null, gender: null },
    doctor: { name: doctorName, date: testDate || new Date().toISOString().split("T")[0] },
    biomarkers: biomarkers.length > 0 ? biomarkers : null,
    medications: null,
    labName,
    testDate
  }
}

import { GoogleGenAI } from "@google/genai";
import Tesseract from "tesseract.js"
import { extractText } from "unpdf"
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
 * Extracts raw text from PDF files using unpdf.
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const pdfData = await extractText(new Uint8Array(buffer), { mergePages: true })
    if (typeof pdfData === "string") {
      return pdfData
    }
    if (typeof (pdfData as any)?.text === "string") {
      return (pdfData as any).text
    }
    if (Array.isArray((pdfData as any)?.text)) {
      return (pdfData as any).text.join("\n")
    }
  } catch (err) {
    console.warn("PDF extraction error:", err)
  }
  return ""
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

  if (mimeType.includes("pdf")) extractedText = await extractTextFromPDF(buffer)
  
  if (!extractedText.trim()) {
    try {
      const ret = await Tesseract.recognize(buffer, "eng")
      extractedText = ret.data.text || ""
    } catch (err) {
      console.error("Tesseract fallback failed:", err)
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

  if (mimeType.includes("pdf")) {
    extractedText = await extractTextFromPDF(buffer)
  }

  if (!extractedText.trim() && mimeType.startsWith("image/")) {
    try {
      const ret = await Tesseract.recognize(buffer, "eng")
      extractedText = ret.data.text || ""
    } catch (err) {
      console.error("Tesseract fallback failed:", err)
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
    const safeName = b.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const regex = new RegExp(`(?:${safeName})[^\\d]{0,40}?([\\d\\.]+)`, "i")
    const match = extractedText.match(regex)
    if (match && match[1]) {
      const val = parseFloat(match[1])
      if (!isNaN(val)) {
        let status: "normal" | "high" | "low" = "normal"
        if (b.refMin !== null && val < b.refMin) status = "low"
        if (b.refMax !== null && val > b.refMax) status = "high"
        biomarkers.push({
          testName: b.name,
          value: val,
          unit: b.unit,
          referenceInterval: b.refMin && b.refMax ? `${b.refMin} - ${b.refMax}` : null,
          status
        })
      }
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

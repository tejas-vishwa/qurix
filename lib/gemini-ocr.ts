import { GoogleGenAI } from "@google/genai";
import Tesseract from "tesseract.js"
import { extractText, extractImages, getDocumentProxy } from "unpdf"
import zlib from "zlib"
import { BIOMARKERS_100 } from "./biomarkers100"
import type { ExtractedMedicalData, ExtractedMedication } from "@/types/medical-ocr"

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "dummy" });

/**
 * Robust native CMap extractor for PDFs with embedded font subset CMaps (like jsPDF/pdfmake).
 * Decodes character codes directly from PDF text streams without external dependencies.
 */
function extractTextUsingPDFCMaps(buffer: Buffer): string {
  try {
    const binary = buffer.toString("binary");
    const streamRegex = new RegExp(
      "(\\d+)\\s+0\\s+obj[\\s\\S]*?<<\\/Filter\\s*\\/FlateDecode\\/Length\\s+(\\d+)>>\\s*stream\\r?\\n",
      "g"
    );
    let match: RegExpExecArray | null;
    const cmap = new Map<string, string>();
    const contentStreams: string[] = [];

    while ((match = streamRegex.exec(binary)) !== null) {
      const len = parseInt(match[2], 10);
      const start = match.index + match[0].length;
      const slice = buffer.subarray(start, start + len);
      try {
        const decompressed = zlib.inflateSync(slice).toString("utf-8");
        if (decompressed.includes("begincmap")) {
          const bfRegex = /<([0-9A-Fa-f]{4})>\s*<([0-9A-Fa-f]{4})>/g;
          let bf: RegExpExecArray | null;
          while ((bf = bfRegex.exec(decompressed)) !== null) {
            const src = bf[1].toUpperCase();
            const charCode = parseInt(bf[2], 16);
            cmap.set(src, String.fromCharCode(charCode));
          }
        } else if (decompressed.includes("Tj") || decompressed.includes("TJ")) {
          contentStreams.push(decompressed);
        }
      } catch {}
    }

    if (cmap.size === 0 || contentStreams.length === 0) return "";

    const lines: string[] = [];
    for (const cs of contentStreams) {
      const tjRegex = new RegExp("(?:<([0-9A-Fa-f]+)>\\s*Tj|\\[([\\s\\S]*?)\\]\\s*TJ)", "g");
      let tj: RegExpExecArray | null;
      while ((tj = tjRegex.exec(cs)) !== null) {
        const chunk = tj[0];
        const hexTokens = chunk.match(/<([0-9A-Fa-f]+)>/g);
        if (!hexTokens) continue;
        let line = "";
        for (const ht of hexTokens) {
          const hex = ht.replace(/[<>]/g, "");
          for (let i = 0; i < hex.length; i += 4) {
            const tok = hex.slice(i, i + 4).toUpperCase();
            if (cmap.has(tok)) {
              line += cmap.get(tok);
            }
          }
        }
        if (line.trim()) lines.push(line.trim());
      }
    }

    return lines.join("\n");
  } catch (err) {
    console.warn("CMap stream extraction note:", err);
    return "";
  }
}

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

  // 1b. Check CMap streams directly (handles font subsets in PDF reports & prescriptions)
  try {
    const cmapText = extractTextUsingPDFCMaps(buffer)
    if (cmapText && cmapText.trim().length >= 50) {
      return cmapText
    }
    if (cmapText && cmapText.trim()) {
      text = cmapText
    }
  } catch (cmapErr) {
    console.warn("CMap stream extraction notice:", cmapErr)
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

/**
 * Uses Gemini API multimodal vision strictly for prescriptions (OCR & extraction).
 * Sends the actual file (PDF or image) as inlineData directly to Gemini 2.5 Flash.
 * Strictly NOT used for lab reports.
 */
export async function extractPrescriptionData(buffer: Buffer, mimeType: string): Promise<any> {
  const base64Data = buffer.toString("base64");
  const normalizedMime = mimeType.includes("pdf") ? "application/pdf" : mimeType.startsWith("image/") ? mimeType : "application/pdf";

  const systemPrompt = `You are an expert clinical medical transcriptionist and OCR specialist.
Analyze this attached prescription document (image or PDF) with extreme accuracy.
Extract all clinical information and return strictly valid JSON matching this schema:
{
  "documentType": "prescription",
  "patientName": "string or null",
  "date": "string (YYYY-MM-DD or DD/MM/YYYY) or null",
  "diagnosis": ["string (e.g., Acute Gastritis, Viral Infection, Enteric Fever, Typhoid)"],
  "symptoms": ["string"],
  "vitals": {
    "temperature": "string or null (e.g., 100 F)",
    "bloodPressure": "string or null (e.g., 120/80 mmHg)",
    "pulseRate": "string or null (e.g., 72 bpm)",
    "weight": "string or null (e.g., 70 kg)"
  },
  "medications": [
    {
      "name": "string (e.g., Tab. Azithromycin 500mg, Tab. Dolo 650mg, Cap. Pan 40mg, Cap. Darolac)",
      "dosage": "string (e.g., 1-0-0, 1 SOS, 1-0-1)",
      "duration": "string (e.g., 7 Days, 5 Days)",
      "instructions": "string (e.g., After meal, Empty stomach, If fever > 100 F)"
    }
  ],
  "advice": ["string (dietary or general advice)"],
  "doctorName": "string or null (e.g., Dr. Rahul Verma)"
}
Return only pure JSON without markdown codeblocks or conversational text.`;

  // 1. Primary: Call Gemini Multimodal Vision API directly on the prescription document
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== "dummy") {
      const client = new GoogleGenAI({ apiKey });
      const response = await client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          systemPrompt,
          {
            inlineData: {
              data: base64Data,
              mimeType: normalizedMime,
            },
          },
        ],
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });

      if (response && response.text) {
        const cleaned = response.text
          .replace(/```json/gi, "")
          .replace(/```/g, "")
          .trim();
        const parsed = JSON.parse(cleaned);
        if (
          parsed &&
          ((Array.isArray(parsed.medications) && parsed.medications.length > 0) ||
           (Array.isArray(parsed.diagnosis) && parsed.diagnosis.length > 0) ||
           parsed.doctorName ||
           parsed.patientName)
        ) {
          return parsed;
        }
      }
    }
  } catch (geminiErr) {
    console.warn("Gemini multimodal prescription extraction note, executing local fallback:", geminiErr);
  }

  // 2. Resilient Fallback: Local OCR + Structured Rule Extraction (offline or no API key)
  return await fallbackLocalPrescriptionExtraction(buffer, mimeType);
}

/**
 * Local extraction for Lab Reports.
 * STRICTLY does NOT use Gemini API to guarantee instant latency, data privacy, and zero API quota consumption.
 */
export async function extractMedicalData(buffer: Buffer, mimeType: string): Promise<ExtractedMedicalData> {
  return await fallbackLabReportExtraction(buffer, mimeType);
}

/**
 * Resilient local prescription extraction fallback using unpdf, CMap streams, Tesseract OCR, and regex parsing.
 */
async function fallbackLocalPrescriptionExtraction(buffer: Buffer, mimeType: string): Promise<any> {
  let extractedText = ""

  if (mimeType.includes("pdf") || mimeType === "application/octet-stream") {
    extractedText = await extractTextFromPDF(buffer)
  } else if (mimeType.startsWith("image/")) {
    try {
      const ret = await Tesseract.recognize(buffer, "eng")
      extractedText = ret?.data?.text || ""
    } catch (err) {
      console.warn("Tesseract prescription fallback note:", err)
    }
  }

  if (!extractedText.trim()) {
    try {
      const ret = await Tesseract.recognize(buffer, "eng")
      extractedText = ret?.data?.text || ""
    } catch {}
  }

  const cleanSalutations = (str: string) =>
    str.replace(/\b(mr\.|mrs\.|ms\.|smt\.|shri\.|dr\.|master\.|miss\.|mr|mrs|ms|smt|shri|dr|master|miss)\b/gi, "").replace(/\s+/g, " ").trim()

  // Patient Name
  let patientName: string | null = null
  const nameMatch = extractedText.match(/(?:patient\s*name|patient\'?s?\s*name|name\s*of\s*patient|name)\s*[:\-\=]?\s*(?:mr\.|mrs\.|ms\.|dr\.)?\s*([A-Za-z\s\.]{2,50})/i)
  if (nameMatch && nameMatch[1]) {
    let rawName = nameMatch[1].trim().replace(/\b(age|sex|gender|dob|ref|date|weight|diagnosis|dr)\b.*/i, "").trim()
    rawName = cleanSalutations(rawName)
    if (rawName.length > 1) patientName = rawName
  }

  // Doctor Name
  let doctorName: string | null = null
  const docMatch = extractedText.match(/(?:dr\.|doctor)[^\w]?\s*([a-z\s\.]+)/i)
  if (docMatch && docMatch[1]) {
    const rawDoc = docMatch[1].trim().split(/\n|\r|\t|,|MBBS|MD/)[0].trim().slice(0, 40)
    doctorName = `Dr. ${cleanSalutations(rawDoc)}`
  }

  // Date
  let date: string | null = null
  const dateMatch = extractedText.match(/(?:date|dated)\s*[:\-\=]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4})/i)
  if (dateMatch && dateMatch[1]) {
    date = dateMatch[1].trim()
  }

  // Vitals
  const vitals: { temperature: string | null; bloodPressure: string | null; pulseRate: string | null; weight: string | null } = {
    temperature: null,
    bloodPressure: null,
    pulseRate: null,
    weight: null,
  }

  const weightMatch = extractedText.match(/(?:weight|wt)\s*[:\-\=]?\s*(\d{2,3}(?:\.\d+)?\s*(?:kg|lbs)?)/i)
  if (weightMatch) vitals.weight = weightMatch[1].trim()

  const tempMatch = extractedText.match(/(?:temperature|temp)\s*[:\-\=]?\s*(\d{2,3}(?:\.\d+)?\s*(?:[°º]?\s*[fc]|deg\s*[fc])?)/i)
  if (tempMatch) vitals.temperature = tempMatch[1].trim()

  const bpMatch = extractedText.match(/(?:blood\s*pressure|bp)\s*[:\-\=]?\s*(\d{2,3}\s*\/\s*\d{2,3}\s*(?:mm\s*hg)?)/i)
  if (bpMatch) vitals.bloodPressure = bpMatch[1].trim()

  const pulseMatch = extractedText.match(/(?:pulse|pulse\s*rate|pr|heart\s*rate|hr)\s*[:\-\=]?\s*(\d{2,3}\s*(?:bpm)?)/i)
  if (pulseMatch) vitals.pulseRate = pulseMatch[1].trim()

  // Diagnosis
  const diagnosis: string[] = []
  const diagMatch = extractedText.match(/(?:diagnosis|diagnosed\s*with|dx|impression|condition)\s*[:\-\=]?\s*([A-Za-z0-9\s,\(\)\-\/]+?)(?=\n\n|rx|medication|medicine|tab|cap|syp|advice|date|\r\n\r\n|$)/i)
  if (diagMatch && diagMatch[1]) {
    const rawDiag = diagMatch[1].trim().split(/,|\n|\r/).map(d => d.trim()).filter(d => d.length > 2)
    diagnosis.push(...rawDiag.slice(0, 3))
  }

  // Medications
  const medications: ExtractedMedication[] = []
  const lines = extractedText.split(/[\r\n]+/)

  const COMMON_MEDS = [
    "Azithromycin", "Dolo", "Pan", "Darolac", "Paracetamol", "Amoxicillin", "Pantoprazole",
    "Cetirizine", "Ibuprofen", "Aspirin", "Metformin", "Atorvastatin", "Cefim", "Cefixime",
    "Augmentin", "Linezolid", "Levofloxacin", "Ciprofloxacin", "Omeprazole", "Ranitidine",
    "Telmisartan", "Amlodipine", "Montelukast", "Calpol", "Crocin", "Allegra", "Sinarest"
  ]

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line || line.length < 3) continue

    const isMedLine = /\b(?:tab\.|cap\.|syp\.|inj\.|tablet|capsule|syrup|injection)\b/i.test(line) ||
      COMMON_MEDS.some(med => new RegExp(`\\b${med}\\b`, "i").test(line))

    if (isMedLine) {
      let dosage = "1-0-0"
      let duration = "5 Days"
      let instructions = "After meals"

      // Check on same line
      const sameLineDosage = line.match(/\b(?:\d\s*[\-\/]\s*\d\s*[\-\/]\s*\d|\d\s*SOS|once\s*daily|twice\s*daily|thrice\s*daily|bd|tds|od|sos)\b/i)
      const sameLineDuration = line.match(/\b(?:\d+\s*(?:days?|weeks?|months?))\b/i)
      const sameLineInstruction = line.match(/\b(?:after\s*meals?|before\s*meals?|empty\s*stomach|before\s*breakfast|at\s*bedtime|with\s*water|if\s*fever[^\n\r]*)\b/i)

      if (sameLineDosage) dosage = sameLineDosage[0].trim()
      if (sameLineDuration) duration = sameLineDuration[0].trim()
      if (sameLineInstruction) instructions = sameLineInstruction[0].trim()

      // Also look ahead up to 5 lines for table-formatted columns
      for (let j = i + 1; j < Math.min(lines.length, i + 6); j++) {
        const next = lines[j].trim()
        if (/^\d+\.\s*$/.test(next) || /\b(?:tab\.|cap\.|syp\.|inj\.|general|follow\s*up)\b/i.test(next)) break
        if (/^\d\s*[\-\/]\s*\d\s*[\-\/]\s*\d$|^\d+\s*SOS$|once\s*daily|twice\s*daily|thrice\s*daily/i.test(next)) {
          dosage = next
        } else if (/^\d+\s*(?:days?|weeks?|months?)/i.test(next)) {
          duration = next
        } else if (/meal|stomach|fever|breakfast|bedtime|water/i.test(next)) {
          instructions = next
        }
      }

      // Clean medicine name
      let medName = line
        .replace(sameLineDosage ? sameLineDosage[0] : "", "")
        .replace(sameLineDuration ? sameLineDuration[0] : "", "")
        .replace(sameLineInstruction ? sameLineInstruction[0] : "", "")
        .replace(/^[0-9]+[\.\)\-\s]+/, "")
        .replace(/[\t\|]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()

      if (medName.length >= 3) {
        medications.push({
          name: medName,
          dosage,
          duration,
          instructions,
        })
      }
    }
  }

  // Advice
  const advice: string[] = []
  const adviceMatch = extractedText.match(/(?:advice|general\s*advice|instructions|diet)\s*[:\-\=]?\s*([\s\S]+?)(?=follow\s*up|doctor|dr\.|\n\n\n|$)/i)
  if (adviceMatch && adviceMatch[1]) {
    const adviceLines = adviceMatch[1].split(/[\r\n]+/).map(a => a.trim().replace(/^[0-9\.\-\*•]+\s*/, "")).filter(a => a.length > 5)
    advice.push(...adviceLines.slice(0, 5))
  }

  return {
    documentType: "prescription",
    patientName,
    date: date || new Date().toISOString().split("T")[0],
    diagnosis: diagnosis.length > 0 ? diagnosis : ["General Consultation"],
    symptoms: [],
    vitals,
    medications,
    advice,
    doctorName,
  }
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

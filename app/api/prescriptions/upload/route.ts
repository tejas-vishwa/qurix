import { NextResponse } from "next/server"
import { getServerSession, authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { extractPrescriptionData, sanitizeMedications } from "@/lib/gemini-ocr"
import { validateUploadedFile, ALLOWED_DOCUMENT_MIME_TYPES, verifyFileContentMagicBytes, sanitizeSafeFileName } from "@/lib/validations"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 })
    }

    // Verify or auto-provision patient user to prevent foreign key errors
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
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Verify raw magic bytes content
    const magicCheck = verifyFileContentMagicBytes(buffer)
    if (!magicCheck.valid) {
      return NextResponse.json({ error: magicCheck.error || "Invalid file content signature" }, { status: 400 })
    }

    const safeFileName = sanitizeSafeFileName(file.name, "prescription")
    const fileBase64 = buffer.toString("base64")
    const mimeType = magicCheck.detectedType || file.type || "application/pdf"

    // 1. Process prescription document via structured OCR
    const extractedData = await extractPrescriptionData(buffer, mimeType)

    const sanitizedMeds = sanitizeMedications(extractedData.medications || [])

    const medicines = sanitizedMeds.map((m) => ({
      name: m.name,
      dosage: m.dosage || "As directed",
      duration: m.duration || "As prescribed",
      instructions: m.instructions || "After meals",
    }))

    const doctorName = extractedData.doctorName || extractedData.doctor?.name || null
    const rawText = JSON.stringify({ ...extractedData, medications: sanitizedMeds })

    const combinedSymptoms = [
      ...(extractedData.diagnosis || []),
      ...(extractedData.symptoms || []),
      ...(extractedData.diagnoses_and_symptoms || []),
    ]

    const vitalsJson = extractedData.vitals || {}

    const prescription = await prisma.prescription.create({
      data: {
        patientId,
        fileName: safeFileName,
        fileData: fileBase64,
        fileType: mimeType,
        status: "PARSED",
        rawText: rawText,
        doctorName: doctorName,
        medicinesJson: JSON.stringify(medicines),
        symptomsJson: JSON.stringify(combinedSymptoms),
        vitalsJson: JSON.stringify(vitalsJson),
      },
    })

    return NextResponse.json({
      success: true,
      prescription: {
        id: prescription.id,
        fileName: prescription.fileName,
        doctorName: prescription.doctorName,
        medicines,
        symptoms: combinedSymptoms,
        vitals: vitalsJson,
        createdAt: prescription.createdAt,
      },
      extractedData: {
        ...extractedData,
        medications: sanitizedMeds,
      },
    })
  } catch (error: any) {
    console.error("Error uploading prescription:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to process prescription. Please try again." },
      { status: 500 }
    )
  }
}

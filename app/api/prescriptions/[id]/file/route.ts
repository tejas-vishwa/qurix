import { NextResponse } from "next/server"
import { getServerSession, authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma"
import { getSafeFileServingHeaders } from "@/lib/validations"

export const dynamic = "force-dynamic"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { id } = await params
    const prescription = await prisma.prescription.findUnique({
      where: { id }
    })

    if (!prescription) {
      return new NextResponse("Prescription not found", { status: 404 })
    }

    // IDOR Protection: Patient can only access their own prescriptions; Doctors & Admins can access patient prescriptions
    if (session.user.role !== "ADMIN" && session.user.role !== "DOCTOR" && prescription.patientId !== session.user.id) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    if (!prescription.fileData) {
      return new NextResponse("No file binary stored", { status: 404 })
    }

    const buffer = Buffer.from(prescription.fileData, "base64")
    const mimeType = prescription.fileType || "application/pdf"
    const headers = getSafeFileServingHeaders(mimeType, prescription.fileName)

    return new NextResponse(buffer, {
      status: 200,
      headers,
    })
  } catch (error: any) {
    console.error("Error serving prescription file:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

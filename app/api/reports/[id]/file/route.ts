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
    const report = await prisma.report.findUnique({
      where: { id }
    })

    if (!report) {
      return new NextResponse("Report not found", { status: 404 })
    }

    // IDOR Protection: Patient can only access their own reports; Doctors & Admins can access patient reports
    if (session.user.role !== "ADMIN" && session.user.role !== "DOCTOR" && report.patientId !== session.user.id) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    if (!report.fileData) {
      return new NextResponse("No file content stored for this report", { status: 404 })
    }

    // Convert Base64 data stored in Turso back to binary Buffer
    const buffer = Buffer.from(report.fileData, "base64")
    const mimeType = report.fileType || "application/pdf"
    const headers = getSafeFileServingHeaders(mimeType, report.fileName)

    return new NextResponse(buffer, {
      status: 200,
      headers,
    })
  } catch (error: any) {
    console.error("Error serving report file:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

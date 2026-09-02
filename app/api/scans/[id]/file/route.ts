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

    const scan = await prisma.medicalScan.findUnique({
      where: { id }
    })

    if (!scan) {
      return new NextResponse("Scan not found", { status: 404 })
    }

    // IDOR Protection: Patient can only access their own scans; Doctors & Admins can access patient scans
    if (session.user.role !== "ADMIN" && session.user.role !== "DOCTOR" && scan.patientId !== session.user.id) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    if (!scan.fileData) {
      return new NextResponse("No scan image binary stored", { status: 404 })
    }

    const buffer = Buffer.from(scan.fileData, "base64")
    const contentType = scan.fileType || "image/png"
    const headers = getSafeFileServingHeaders(contentType, scan.fileName)

    return new NextResponse(buffer, {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error("Error retrieving scan file:", error)
    return new NextResponse("Error retrieving file", { status: 500 })
  }
}

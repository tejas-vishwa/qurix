import { NextResponse } from "next/server"
import { getServerSession, authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const patientId = searchParams.get("patientId") || session.user.id

    // Check permissions: Patient fetches their own; Doctor can fetch patient records
    if (session.user.role !== "ADMIN" && session.user.role !== "DOCTOR" && patientId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const prescriptions = await prisma.prescription.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" }
    })

    const formatted = prescriptions.map(p => ({
      id: p.id,
      fileName: p.fileName,
      fileUrl: p.fileUrl || `/api/prescriptions/${p.id}/file`,
      status: p.status,
      doctorName: p.doctorName,
      medicines: p.medicinesJson ? JSON.parse(p.medicinesJson) : [],
      symptoms: p.symptomsJson ? JSON.parse(p.symptomsJson) : [],
      vitals: p.vitalsJson ? JSON.parse(p.vitalsJson) : {},
      createdAt: p.createdAt
    }))

    return NextResponse.json(formatted)
  } catch (error: any) {
    console.error("Error fetching prescriptions:", error)
    return NextResponse.json({ error: "Failed to fetch prescriptions. Please try again." }, { status: 500 })
  }
}

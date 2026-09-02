import { NextResponse } from "next/server"
import { getServerSession, authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma"
import { TelehealthJoinSchema, validateSchema } from "@/lib/validations"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rawData = await req.json().catch(() => null)
    if (!rawData || typeof rawData !== "object") {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 })
    }

    // 1. Strict Schema Validation
    const validation = validateSchema(TelehealthJoinSchema, rawData)
    if (!validation.success) {
      return validation.response
    }

    const { appointmentId } = validation.data

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    })

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
    }

    const isDoctor = appointment.doctorId === session.user.id
    const isPatient = appointment.patientId === session.user.id
    if (!isDoctor && !isPatient) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Only set IN_PROGRESS if not already completed, and record callStartedAt
    if (appointment.status === "ACCEPTED" || appointment.status === "PENDING") {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          status: "IN_PROGRESS",
          callStartedAt: appointment.callStartedAt || new Date()
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error joining telehealth call:", error)
    return NextResponse.json(
      { error: "Failed to join telehealth call. Please try again." },
      { status: 500 }
    )
  }
}

import { NextResponse } from "next/server"
import { getServerSession, authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma"
import { createDailyRoom, createDailyToken } from "@/lib/daily"
import { TelehealthRoomSchema, validateSchema } from "@/lib/validations"

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
    const validation = validateSchema(TelehealthRoomSchema, rawData)
    if (!validation.success) {
      return validation.response
    }

    const { appointmentId } = validation.data

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { doctor: true, patient: true },
    })

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
    }

    // Verify ownership
    const isDoctor = appointment.doctorId === session.user.id
    const isPatient = appointment.patientId === session.user.id
    if (!isDoctor && !isPatient) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    let roomUrl = appointment.dailyRoomUrl
    let roomName = appointment.dailyRoomName

    // Create room if it doesn't exist
    if (!roomName || !roomUrl) {
      const room = await createDailyRoom(appointmentId)
      roomUrl = room.url
      roomName = room.name

      await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          dailyRoomName: roomName,
          dailyRoomUrl: roomUrl,
        },
      })
    }

    // Generate meeting token
    // The doctor is treated as the owner (can control recording/etc if needed)
    const tokenResponse = await createDailyToken(roomName as string, session.user.name || "User", isDoctor)

    return NextResponse.json({
      roomUrl,
      token: tokenResponse.token,
    })
  } catch (error: any) {
    console.error("Error generating Daily room/token:", error)
    return NextResponse.json(
      { error: "Failed to create or join consultation room. Please try again." },
      { status: 500 }
    )
  }
}

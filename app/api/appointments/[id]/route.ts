import { NextResponse } from "next/server"
import { getServerSession, authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma"
import { UpdateAppointmentStatusSchema, validateSchema } from "@/lib/validations"

export const dynamic = "force-dynamic"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "DOCTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const resolvedParams = await params
  if (!resolvedParams.id || typeof resolvedParams.id !== "string") {
    return NextResponse.json({ error: "Invalid appointment ID" }, { status: 400 })
  }

  try {
    const rawData = await req.json().catch(() => null)
    if (!rawData || typeof rawData !== "object") {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 })
    }

    // 1. Strict Schema Validation
    const validation = validateSchema(UpdateAppointmentStatusSchema, rawData)
    if (!validation.success) {
      return validation.response
    }

    const { status } = validation.data

    const existingAppt = await prisma.appointment.findUnique({
      where: { id: resolvedParams.id, doctorId: session.user.id },
    })

    if (!existingAppt) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
    }

    let updateData: any = { status }

    if (status === "ACCEPTED" && existingAppt.type === "ONLINE" && !existingAppt.dailyRoomName) {
      const { createDailyRoom } = await import("@/lib/daily")
      try {
        const room = await createDailyRoom(existingAppt.id)
        updateData.dailyRoomName = room.name
        updateData.dailyRoomUrl = room.url
      } catch (e) {
        console.error("Failed to pre-create Daily room:", e)
        // We don't block the acceptance; the room can be created lazily later
      }
    }

    const appointment = await prisma.appointment.update({
      where: { id: resolvedParams.id },
      data: updateData,
    })

    return NextResponse.json({ success: true, appointment })
  } catch (error: any) {
    console.error("Appointment update error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

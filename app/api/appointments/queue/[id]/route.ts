import { NextResponse } from "next/server"
import { getServerSession, authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const resolvedParams = await params
  const id = resolvedParams.id
  
  if (!id) {
    return NextResponse.json({ error: "Missing appointment ID" }, { status: 400 })
  }

  try {
    const targetAppointment = await prisma.appointment.findUnique({
      where: { id }
    })

    if (!targetAppointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
    }

    if (targetAppointment.status === "REJECTED" || targetAppointment.status === "CHECKED") {
      return NextResponse.json({ position: 0, status: targetAppointment.status })
    }

    // Get start and end of the day for the scheduled time
    const startOfDay = new Date(targetAppointment.scheduledTime)
    startOfDay.setHours(0, 0, 0, 0)
    
    const endOfDay = new Date(targetAppointment.scheduledTime)
    endOfDay.setHours(23, 59, 59, 999)

    // Fetch all active appointments for this doctor on the same day
    const activeAppointments = await prisma.appointment.findMany({
      where: {
        doctorId: targetAppointment.doctorId,
        status: { in: ["PENDING", "ACCEPTED"] },
        scheduledTime: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      orderBy: [
        { scheduledTime: 'asc' },
        { createdAt: 'asc' }
      ]
    })

    // Find position (index + 1)
    const positionIndex = activeAppointments.findIndex(appt => appt.id === id)
    const position = positionIndex !== -1 ? positionIndex + 1 : 0

    return NextResponse.json({ 
      position,
      status: targetAppointment.status 
    })

  } catch (error) {
    console.error("Queue API Error:", error)
    return NextResponse.json({ error: "Failed to fetch queue status" }, { status: 500 })
  }
}

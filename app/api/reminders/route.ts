import { NextResponse } from "next/server"
import { getServerSession, authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { CreateReminderSchema, DeleteReminderQuerySchema, validateSchema } from "@/lib/validations"

export const dynamic = "force-dynamic"

// Get all reminders for a user
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const prescriptionId = searchParams.get("prescriptionId")

  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: session.user.id },
          { email: session.user.email ? session.user.email.toLowerCase().trim() : "" },
        ],
      },
    }).catch(() => null)

    const effectiveUserId = user ? user.id : session.user.id

    const whereClause: any = {
      OR: [
        { patientId: effectiveUserId },
        { patientId: session.user.id },
      ],
    }

    if (prescriptionId && typeof prescriptionId === "string" && prescriptionId.trim().length > 0) {
      whereClause.prescriptionId = prescriptionId.trim()
    }

    const reminders = await prisma.medicineReminder.findMany({
      where: whereClause,
      orderBy: { reminderTime: "asc" },
    })

    return NextResponse.json(reminders)
  } catch (error) {
    console.error("Error fetching reminders:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

// Create a new reminder
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const rawData = await request.json().catch(() => null)
    if (!rawData || typeof rawData !== "object") {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 })
    }

    // 1. Strict Schema Validation
    const validation = validateSchema(CreateReminderSchema, rawData)
    if (!validation.success) {
      return validation.response
    }

    const { prescriptionId, medicineName, reminderTime } = validation.data

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

    const newReminder = await prisma.medicineReminder.create({
      data: {
        patientId,
        prescriptionId: prescriptionId || null,
        medicineName,
        reminderTime,
      },
    })

    return NextResponse.json(newReminder)
  } catch (error) {
    console.error("Error creating reminder:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

// Delete a reminder
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "Reminder ID is required" }, { status: 400 })
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: session.user.id },
          { email: session.user.email ? session.user.email.toLowerCase().trim() : "" },
        ],
      },
    }).catch(() => null)

    const effectiveUserId = user ? user.id : session.user.id

    await prisma.medicineReminder.deleteMany({
      where: {
        id,
        OR: [
          { patientId: effectiveUserId },
          { patientId: session.user.id },
        ],
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting reminder:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

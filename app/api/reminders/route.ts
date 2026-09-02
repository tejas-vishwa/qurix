import { NextResponse } from "next/server"
import { getServerSession, authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma"
import { CreateReminderSchema, DeleteReminderQuerySchema, validateSchema } from "@/lib/validations"

// Get all reminders for a user
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const prescriptionId = searchParams.get('prescriptionId')

  try {
    const whereClause: any = { patientId: session.user.id }
    if (prescriptionId && typeof prescriptionId === "string" && prescriptionId.trim().length > 0) {
      whereClause.prescriptionId = prescriptionId.trim()
    }

    const reminders = await prisma.medicineReminder.findMany({
      where: whereClause,
      orderBy: { reminderTime: 'asc' }
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

    const newReminder = await prisma.medicineReminder.create({
      data: {
        patientId: session.user.id,
        prescriptionId: prescriptionId || null,
        medicineName,
        reminderTime,
        isActive: true,
      }
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
  const rawId = searchParams.get('id')

  // 1. Strict Schema Validation on Query Param
  const validation = validateSchema(DeleteReminderQuerySchema, { id: rawId })
  if (!validation.success) {
    return validation.response
  }

  const { id } = validation.data

  try {
    // Check ownership
    const reminder = await prisma.medicineReminder.findUnique({ where: { id } })
    if (!reminder || reminder.patientId !== session.user.id) {
      return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 })
    }

    await prisma.medicineReminder.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting reminder:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

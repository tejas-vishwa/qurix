import { NextResponse } from "next/server"
import { getServerSession, authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { BookAppointmentSchema, validateSchema } from "@/lib/validations"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 })
  }

  const userRole = (session.user.role || "PATIENT").toUpperCase()
  if (userRole !== "PATIENT" && userRole !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized. Patient access only." }, { status: 403 })
  }

  try {
    const rawData = await req.json().catch(() => null)
    if (!rawData || typeof rawData !== "object") {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 })
    }

    // 1. Strict Schema Validation
    const validation = validateSchema(BookAppointmentSchema, rawData)
    if (!validation.success) {
      return validation.response
    }

    const { doctorId, date, time, scheduledTime: clientScheduledTime, type, preUploadData } = validation.data

    let scheduledTime: Date
    if (clientScheduledTime) {
      scheduledTime = new Date(clientScheduledTime)
    } else {
      scheduledTime = new Date(`${date}T${time}`)
    }

    if (isNaN(scheduledTime.getTime())) {
      return NextResponse.json({ error: "Invalid scheduled datetime" }, { status: 400 })
    }

    // Ensure patient exists in Prisma
    let patientUser = await prisma.user.findFirst({
      where: {
        OR: [
          { id: session.user.id },
          { email: session.user.email ? session.user.email.toLowerCase().trim() : "" },
        ],
      },
    })

    if (!patientUser) {
      patientUser = await prisma.user.create({
        data: {
          id: session.user.id,
          email: session.user.email || `${session.user.id}@clerk.user`,
          name: session.user.name || "Patient",
          passwordHash: "clerk_managed_auth",
          role: "PATIENT",
        },
      }).catch(() => null)
    }

    const patientId = patientUser ? patientUser.id : session.user.id

    // Ensure doctor exists in Prisma
    let doctorUser = await prisma.user.findUnique({
      where: { id: doctorId },
    })

    if (!doctorUser) {
      // Find any doctor or auto-provision demo doctor
      const fallbackDoc = await prisma.user.findFirst({ where: { role: "DOCTOR" } })
      if (fallbackDoc) {
        doctorUser = fallbackDoc
      } else {
        doctorUser = await prisma.user.create({
          data: {
            id: doctorId,
            email: "doctor@demo.com",
            name: "Dr. A. K. Sharma (MD, General Medicine)",
            passwordHash: "demo_managed_auth",
            role: "DOCTOR",
            doctorProfile: {
              create: {
                licenseNumber: "MCI-45892",
                specialization: "General Medicine & Endocrinology",
              },
            },
          },
        }).catch(() => null)
      }
    }

    const effectiveDoctorId = doctorUser ? doctorUser.id : doctorId

    // Enforce max 10 patients per hourly slot per doctor per day
    const existingApptsCount = await prisma.appointment.count({
      where: {
        doctorId: effectiveDoctorId,
        scheduledTime,
        status: { not: "REJECTED" },
      },
    })

    if (existingApptsCount >= 10) {
      return NextResponse.json(
        { error: "This time slot is fully booked (10/10 patients). Please choose another." },
        { status: 409 }
      )
    }

    let accessCode = null
    if (preUploadData) {
      // Revoke old codes and generate a new one
      await prisma.doctorAccessCode.updateMany({
        where: { patientId, isRevoked: false },
        data: { isRevoked: true },
      }).catch(() => {})

      const chars = "0123456789"
      let result = ""
      for (let i = 0; i < 6; i++) result += chars.charAt(Math.floor(Math.random() * chars.length))
      accessCode = result

      const expiresAt = new Date(scheduledTime)
      expiresAt.setHours(expiresAt.getHours() + 48)

      await prisma.doctorAccessCode.create({
        data: {
          patientId,
          code: accessCode,
          expiresAt,
          maxUses: 10,
        },
      }).catch(() => {})
    }

    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        doctorId: effectiveDoctorId,
        scheduledTime,
        type: type || "OFFLINE",
        accessCode,
      },
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
            email: true,
            doctorProfile: true,
          },
        },
      },
    })

    return NextResponse.json({ success: true, appointment })
  } catch (error: any) {
    console.error("Booking API Error:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to book appointment. Please try again." },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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
    const effectiveRole = (user?.role || session.user.role || "PATIENT").toUpperCase()

    if (effectiveRole === "PATIENT" || effectiveRole === "ADMIN") {
      const appointments = await prisma.appointment.findMany({
        where: {
          OR: [
            { patientId: effectiveUserId },
            { patientId: session.user.id },
          ],
        },
        include: {
          doctor: {
            select: {
              id: true,
              name: true,
              email: true,
              doctorProfile: true,
            },
          },
        },
        orderBy: { scheduledTime: "asc" },
      })
      return NextResponse.json(appointments)
    }

    if (effectiveRole === "DOCTOR") {
      const appointments = await prisma.appointment.findMany({
        where: {
          OR: [
            { doctorId: effectiveUserId },
            { doctorId: session.user.id },
          ],
        },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { scheduledTime: "asc" },
      })
      return NextResponse.json(appointments)
    }

    return NextResponse.json([])
  } catch (error: any) {
    console.error("Error fetching appointments:", error)
    return NextResponse.json({ error: "Failed to fetch appointments." }, { status: 500 })
  }
}

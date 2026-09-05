import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    let doctors = await prisma.user.findMany({
      where: { role: "DOCTOR" },
      select: {
        id: true,
        name: true,
        email: true,
        doctorProfile: true,
      },
    }).catch(() => [])

    if (doctors.length === 0) {
      try {
        const demoDoctor = await prisma.user.upsert({
          where: { email: "doctor@demo.com" },
          update: {},
          create: {
            id: "demo-doctor-dr-sharma",
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
          select: {
            id: true,
            name: true,
            email: true,
            doctorProfile: true,
          },
        })
        doctors = [demoDoctor]
      } catch (upsertErr) {
        console.warn("Auto-provision demo doctor note:", upsertErr)
      }
    }

    return NextResponse.json(doctors)
  } catch (error) {
    console.error("Error fetching doctors:", error)
    return NextResponse.json([])
  }
}

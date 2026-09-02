import { NextResponse } from "next/server"
import { getServerSession, authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

function generateCode() {
  const chars = '0123456789'
  let result = ''
  for (let i = 0; i < 6; i++) result += chars.charAt(Math.floor(Math.random() * chars.length))
  return result
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id
  
  // Revoke existing active codes
  await prisma.doctorAccessCode.updateMany({
    where: { patientId: userId, isRevoked: false },
    data: { isRevoked: true }
  })

  // Create new code valid for 24 hours
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + 24)

  const newCode = await prisma.doctorAccessCode.create({
    data: {
      patientId: userId,
      code: generateCode(),
      expiresAt,
      maxUses: 5
    }
  })

  return NextResponse.json({ code: newCode.code })
}

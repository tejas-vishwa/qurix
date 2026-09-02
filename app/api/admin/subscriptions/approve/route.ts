import { NextResponse } from "next/server"
import { getServerSession, authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma"
import { AdminSubscriptionApprovalSchema, validateSchema } from "@/lib/validations"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rawBody = await req.json().catch(() => null)
    if (!rawBody || typeof rawBody !== "object") {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 })
    }

    // 1. Strict Schema Validation
    const validation = validateSchema(AdminSubscriptionApprovalSchema, rawBody)
    if (!validation.success) {
      return validation.response
    }

    const { userId } = validation.data

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { 
        paymentStatus: "ACTIVE",
        subscriptionTier: "QURIX_PLUS"
      }
    })

    return NextResponse.json({ success: true, user: updatedUser })
  } catch (error: any) {
    console.error("Approve subscription error:", error)
    return NextResponse.json({ error: "Failed to approve subscription." }, { status: 500 })
  }
}

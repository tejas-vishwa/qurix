import { NextResponse } from "next/server"
import { getServerSession, authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { paymentStatus: "PENDING_APPROVAL" }
    })

    return NextResponse.json({ success: true, user: updatedUser })
  } catch (error: any) {
    console.error("Upgrade error:", error)
    return NextResponse.json({ error: "Failed to process upgrade request." }, { status: 500 })
  }
}

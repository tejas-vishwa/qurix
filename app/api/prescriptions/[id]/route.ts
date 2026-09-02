import { NextResponse } from "next/server"
import { getServerSession, authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const prescription = await prisma.prescription.findUnique({
      where: { id }
    })

    if (!prescription) {
      return NextResponse.json({ error: "Prescription not found" }, { status: 404 })
    }

    if (session.user.role !== "ADMIN" && prescription.patientId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await prisma.prescription.delete({
      where: { id }
    })

    return NextResponse.json({ success: true, message: "Prescription permanently deleted." })
  } catch (error: any) {
    console.error("Delete prescription error:", error)
    return NextResponse.json({ error: "Failed to delete prescription. Please try again." }, { status: 500 })
  }
}

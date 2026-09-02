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

    const report = await prisma.report.findUnique({
      where: { id }
    })

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 })
    }

    // Patients can only delete their own reports; Admins can delete any report
    if (session.user.role !== "ADMIN" && report.patientId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Permanently delete the report from Turso database (cascades to extracted metrics and health record)
    await prisma.report.delete({
      where: { id }
    })

    // Log deletion activity
    await prisma.activityLog.create({
      data: {
        action: "REPORT_DELETED",
        details: `Permanently deleted report: ${report.fileName} (${report.id})`,
        userId: session.user.id
      }
    }).catch(() => {})

    return NextResponse.json({ success: true, message: "Report permanently deleted from database." })
  } catch (error: any) {
    console.error("Delete report error:", error)
    return NextResponse.json({ error: "Failed to delete report. Please try again." }, { status: 500 })
  }
}

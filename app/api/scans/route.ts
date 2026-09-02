import { NextResponse } from "next/server"
import { getServerSession, authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma"
import { createTablesIfNotExist } from "@/lib/seed-db"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const patientId = searchParams.get("patientId") || session.user.id

    if (session.user.role !== "ADMIN" && session.user.role !== "DOCTOR" && patientId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    let scans: any[] = []
    try {
      scans = await prisma.medicalScan.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" }
      })
    } catch (dbErr) {
      console.warn("MedicalScan table not found on GET /api/scans, executing DDL:", dbErr)
      await createTablesIfNotExist()
      try {
        scans = await prisma.medicalScan.findMany({
          where: { patientId },
          orderBy: { createdAt: "desc" }
        })
      } catch (retryErr) {
        console.error("Failed to query MedicalScan after DDL creation:", retryErr)
      }
    }

    const formatted = scans.map(s => ({
      id: s.id,
      fileName: s.fileName,
      fileUrl: s.fileUrl || `/api/scans/${s.id}/file`,
      fileData: s.fileData ? `data:${s.fileType || 'image/png'};base64,${s.fileData}` : null,
      fileType: s.fileType,
      modality: s.modality,
      modelUsed: s.modelUsed,
      overallRisk: s.overallRisk,
      maxProbability: s.maxProbability,
      pathologies: (() => {
        if (!s.pathologiesJson) return []
        try {
          const parsed = JSON.parse(s.pathologiesJson)
          return Array.isArray(parsed) ? parsed : (parsed.pathologies || [])
        } catch(e) { return [] }
      })(),
      dynamicMskData: (() => {
        if (!s.pathologiesJson) return null
        try {
          const parsed = JSON.parse(s.pathologiesJson)
          return Array.isArray(parsed) ? null : (parsed.dynamicMskData || null)
        } catch(e) { return null }
      })(),
      bounding_boxes: (() => {
        if (!s.pathologiesJson) return []
        try {
          const parsed = JSON.parse(s.pathologiesJson)
          return Array.isArray(parsed) ? [] : (parsed.bounding_boxes || [])
        } catch(e) { return [] }
      })(),
      summary: s.summary,
      createdAt: s.createdAt
    }))

    return NextResponse.json(formatted)
  } catch (error: any) {
    console.error("Error fetching medical scans:", error)
    return NextResponse.json({ error: "Failed to fetch medical scans. Please try again." }, { status: 500 })
  }
}

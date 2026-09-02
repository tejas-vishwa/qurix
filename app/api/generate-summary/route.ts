import { NextResponse } from "next/server"
import { getServerSession, authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { metrics } = await req.json()

    if (!metrics || metrics.length === 0) {
      return NextResponse.json({ error: "No metrics provided" }, { status: 400 })
    }

    // Deterministic Rule-Based Summary (Gemini API disabled by request)
    let summary = "Based on your recent lab reports, here is an automated clinical summary of your health trends:\n\n"
    
    let normalCount = 0;
    let abnormalCount = 0;
    
    metrics.forEach((m: any) => {
       const points = m.history || m.data || []
       if (points.length > 0) {
         const latest = points[points.length - 1]
         const isAbnormal = latest.isAbnormal || (m.refMin !== null && latest.value < m.refMin) || (m.refMax !== null && latest.value > m.refMax)
         if (isAbnormal) {
            abnormalCount++;
            summary += `• ${m.name}: ${latest.value} ${m.unit} (Reference Range: ${m.refMin ?? 'N/A'} - ${m.refMax ?? 'N/A'} ${m.unit})\n`
         } else {
            normalCount++;
         }
       }
    })
    
    if (abnormalCount === 0 && normalCount > 0) {
      summary += "Great news! All your tracked biomarkers are currently within standard reference ranges.\n"
    } else if (abnormalCount > 0) {
      summary += `\nWe detected ${abnormalCount} biomarker(s) outside of standard ranges. Please consult with your physician to discuss these results.`
    } else {
      summary += "Not enough historical data to calculate health trends."
    }

    return NextResponse.json({ summary })
  } catch (error: any) {
    console.error("Summary Error:", error)
    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 })
  }
}

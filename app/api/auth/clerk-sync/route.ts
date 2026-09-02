import { NextResponse } from "next/server"
import { syncClerkUserWithPrisma } from "@/lib/clerk-sync"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    if (!body || !body.email || !body.clerkId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const user = await syncClerkUserWithPrisma({
      clerkId: body.clerkId,
      email: body.email,
      name: body.name,
      role: body.role || "PATIENT",
    })

    return NextResponse.json({ success: true, user })
  } catch (error: any) {
    console.error("Clerk sync API error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

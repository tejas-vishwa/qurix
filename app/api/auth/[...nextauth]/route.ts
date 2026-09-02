import NextAuth from "next-auth"
import { authOptions, getAuthSession } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const handler = NextAuth(authOptions)

export async function GET(req: NextRequest, ctx: any) {
  if (req.nextUrl.pathname.endsWith("/session")) {
    const session = await getAuthSession()
    if (session?.user?.id) {
      return NextResponse.json(session)
    }
  }
  return handler(req, ctx)
}

export { handler as POST }


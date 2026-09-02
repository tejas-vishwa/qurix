import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getRateLimitConfig, classifyRoute } from "@/lib/rate-limit/config"
import {
  checkSlidingWindow,
  checkAuthLimit,
  getClientIp,
  createRateLimitResponse,
  applyRateLimitHeaders,
} from "@/lib/rate-limit/limiter"

// ─── Shared rate-limiting logic (used by both Clerk and fallback paths) ────────
async function applyRateLimiting(
  req: NextRequest,
  isAuthenticated: boolean,
  userId?: string | null
): Promise<NextResponse | null> {
  const { pathname } = req.nextUrl

  if (!pathname.startsWith("/api") || pathname.startsWith("/api/cron")) {
    return null // no rate limiting needed
  }

  const clientIp = getClientIp(req)
  const config = getRateLimitConfig()
  const tier = classifyRoute(pathname, isAuthenticated)

  let result: ReturnType<typeof checkSlidingWindow>

  switch (tier) {
    case "AUTH": {
      result = checkAuthLimit(clientIp, undefined, config)
      if (!result.allowed) {
        return createRateLimitResponse(
          result.retryAfter, result.limit, result.remaining, result.reset,
          `Too many authentication requests from this IP. Please wait ${result.retryAfter}s.`
        )
      }
      break
    }
    case "AI_HEAVY": {
      const aiKey = isAuthenticated ? `ai:user:${userId}` : `ai:ip:${clientIp}`
      result = checkSlidingWindow(aiKey, config.aiHeavy.maxRequests, config.aiHeavy.windowSec)
      if (!result.allowed) {
        return createRateLimitResponse(
          result.retryAfter, result.limit, result.remaining, result.reset,
          `AI processing rate limit exceeded. Please wait ${result.retryAfter}s.`
        )
      }
      break
    }
    case "AUTHENTICATED": {
      const userKey = `user:${userId}`
      result = checkSlidingWindow(userKey, config.authenticated.maxRequests, config.authenticated.windowSec)
      if (!result.allowed) {
        return createRateLimitResponse(
          result.retryAfter, result.limit, result.remaining, result.reset,
          `User request limit exceeded. Please wait ${result.retryAfter}s.`
        )
      }
      break
    }
    case "PUBLIC":
    default: {
      const publicIpKey = `public:ip:${clientIp}`
      result = checkSlidingWindow(publicIpKey, config.public.maxRequests, config.public.windowSec)
      if (!result.allowed) {
        return createRateLimitResponse(
          result.retryAfter, result.limit, result.remaining, result.reset,
          `Public rate limit reached. Please wait ${result.retryAfter}s.`
        )
      }
      break
    }
  }

  const response = NextResponse.next()
  applyRateLimitHeaders(response.headers, result.limit, result.remaining, result.reset)
  return response
}

// ─── Clerk-powered middleware (used when Clerk keys are present) ───────────────
async function clerkMiddlewareHandler(req: NextRequest, event: any): Promise<NextResponse> {
  const { clerkMiddleware } = await import("@clerk/nextjs/server")

  const handler = clerkMiddleware(async (auth, request) => {
    let userId: string | null = null
    try {
      const authObj = await auth()
      userId = authObj.userId
    } catch {
      userId = null
    }

    const { pathname } = request.nextUrl

    // If an authenticated user visits /login or /register, redirect immediately to their dashboard
    if (userId && (pathname.startsWith("/login") || pathname.startsWith("/register"))) {
      let target = "/dashboard"
      try {
        const authObj = await auth()
        const claims = authObj?.sessionClaims as any
        const role = (claims?.role || claims?.public_metadata?.role || claims?.metadata?.role || "").toUpperCase()
        if (role === "DOCTOR") {
          target = "/doctor/dashboard"
        } else if (role === "ADMIN") {
          target = "/admin"
        }
      } catch {}

      return NextResponse.redirect(new URL(target, request.url))
    }

    const limited = await applyRateLimiting((request as any) || req, !!userId, userId)
    if (limited) {
      return limited
    }
  })

  const res = await handler(req, event || ({} as any))
  return res as NextResponse
}

// ─── Main middleware export ────────────────────────────────────────────────────
export async function middleware(req: NextRequest, event: any): Promise<NextResponse> {
  const hasClerkKeys =
    !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    !!process.env.CLERK_SECRET_KEY

  if (hasClerkKeys) {
    try {
      return await clerkMiddlewareHandler(req, event)
    } catch (err) {
      // Clerk misconfigured — fall through to basic rate limiting
      console.error("[Middleware] Clerk error, falling back:", err)
    }
  }

  // Fallback: rate limiting without Clerk session awareness
  const limited = await applyRateLimiting(req, false, null)
  return limited ?? NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
}

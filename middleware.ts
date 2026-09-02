import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
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

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const { pathname } = req.nextUrl

  // Apply rate limiting to API routes
  if (pathname.startsWith("/api") && !pathname.startsWith("/api/cron")) {
    const clientIp = getClientIp(req)
    const config = getRateLimitConfig()
    
    let userId: string | null = null
    try {
      const authObj = await auth()
      userId = authObj.userId
    } catch {
      userId = null
    }

    const isAuthenticated = !!userId
    const tier = classifyRoute(pathname, isAuthenticated)

    let result: ReturnType<typeof checkSlidingWindow>

    switch (tier) {
      case "AUTH": {
        result = checkAuthLimit(clientIp, undefined, config)
        if (!result.allowed) {
          return createRateLimitResponse(
            result.retryAfter,
            result.limit,
            result.remaining,
            result.reset,
            `Too many authentication requests from this IP. Please wait ${result.retryAfter} second${result.retryAfter === 1 ? "" : "s"} before trying again.`
          )
        }
        break
      }
      case "AI_HEAVY": {
        const aiKey = isAuthenticated ? `ai:user:${userId}` : `ai:ip:${clientIp}`
        result = checkSlidingWindow(aiKey, config.aiHeavy.maxRequests, config.aiHeavy.windowSec)
        if (!result.allowed) {
          return createRateLimitResponse(
            result.retryAfter,
            result.limit,
            result.remaining,
            result.reset,
            `AI processing rate limit exceeded. Please wait ${result.retryAfter} second${result.retryAfter === 1 ? "" : "s"} before submitting another request.`
          )
        }
        break
      }
      case "AUTHENTICATED": {
        const userKey = `user:${userId}`
        result = checkSlidingWindow(
          userKey,
          config.authenticated.maxRequests,
          config.authenticated.windowSec
        )
        if (!result.allowed) {
          return createRateLimitResponse(
            result.retryAfter,
            result.limit,
            result.remaining,
            result.reset,
            `User request limit exceeded. Please wait ${result.retryAfter} second${result.retryAfter === 1 ? "" : "s"}.`
          )
        }
        break
      }
      case "PUBLIC":
      default: {
        const publicIpKey = `public:ip:${clientIp}`
        result = checkSlidingWindow(
          publicIpKey,
          config.public.maxRequests,
          config.public.windowSec
        )
        if (!result.allowed) {
          return createRateLimitResponse(
            result.retryAfter,
            result.limit,
            result.remaining,
            result.reset,
            `Public rate limit reached. Please wait ${result.retryAfter} second${result.retryAfter === 1 ? "" : "s"}.`
          )
        }
        break
      }
    }

    const response = NextResponse.next()
    applyRateLimitHeaders(response.headers, result.limit, result.remaining, result.reset)
    return response
  }
})

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}

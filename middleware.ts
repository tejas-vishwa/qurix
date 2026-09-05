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

// ─── Rate limiting ────────────────────────────────────────────────────────────
async function applyRateLimiting(
  req: NextRequest,
  isAuthenticated: boolean,
  userId?: string | null
): Promise<NextResponse | null> {
  const { pathname } = req.nextUrl

  if (!pathname.startsWith("/api") || pathname.startsWith("/api/cron")) {
    return null
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

// ─── Main middleware ──────────────────────────────────────────────────────────
export async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl

  // Instant Edge Redirect for logged-in NextAuth users visiting login/register
  const token =
    req.cookies.get("next-auth.session-token")?.value ||
    req.cookies.get("__Secure-next-auth.session-token")?.value ||
    req.cookies.get("auth_token")?.value

  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register")
  if (token && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  // Rate limiting for API endpoints
  const limited = await applyRateLimiting(req, !!token, null)
  if (limited) return limited

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}

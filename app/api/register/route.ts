import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { seedDatabase } from "@/lib/seed-db"
import {
  getClientIp,
  checkAuthLimit,
  recordAuthFailure,
  recordAuthSuccess,
  createRateLimitResponse,
} from "@/lib/rate-limit"
import { RegisterSchema, validateSchema } from "@/lib/validations"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const clientIp = getClientIp(req)

  try {
    const rawBody = await req.json().catch(() => null)
    if (!rawBody || typeof rawBody !== "object") {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 })
    }

    // 1. Strict Schema Validation (type, length, format, rejection of extra/malformed properties)
    const validation = validateSchema(RegisterSchema, rawBody)
    if (!validation.success) {
      if (typeof rawBody.email === "string") {
        recordAuthFailure(clientIp, rawBody.email)
      }
      return validation.response
    }

    const { name, email, password, role, botCheck, mathAnswer, num1, num2 } = validation.data
    const normalizedEmail = email

    // 2. Check Rate Limiting & Account Backoff
    const rateLimitResult = checkAuthLimit(clientIp, normalizedEmail)
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(
        rateLimitResult.retryAfter,
        rateLimitResult.limit,
        rateLimitResult.remaining,
        rateLimitResult.reset,
        rateLimitResult.reason === "ACCOUNT_BACKOFF_ACTIVE"
          ? `Too many registration attempts for this email. Please wait ${rateLimitResult.retryAfter}s before trying again.`
          : `Registration rate limit reached. Please wait ${rateLimitResult.retryAfter}s.`
      )
    }

    // 3. Bot Verification: Honeypot Check
    if (botCheck) {
      recordAuthFailure(clientIp, normalizedEmail)
      return NextResponse.json({ error: "Bot activity detected. Registration blocked." }, { status: 403 })
    }

    // 4. Bot Verification: Math Challenge Check
    if (mathAnswer !== num1 + num2) {
      recordAuthFailure(clientIp, normalizedEmail)
      return NextResponse.json({ error: "Security challenge failed. Incorrect math answer." }, { status: 403 })
    }

    // 5. Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    }).catch(async () => {
      await seedDatabase()
      return await prisma.user.findUnique({ where: { email: normalizedEmail } })
    })

    if (existingUser) {
      recordAuthFailure(clientIp, normalizedEmail)
      return NextResponse.json({ error: "An account with this email already exists. Please sign in instead." }, { status: 409 })
    }

    // 6. Verify Email OTP
    const { otp } = validation.data
    if (!otp) {
      return NextResponse.json(
        { error: "Email verification is required. Please enter the 6-digit OTP sent to your email." },
        { status: 400 }
      )
    }

    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        identifier: `signup-otp:${normalizedEmail}`,
        token: otp,
        expires: { gt: new Date() },
      },
    })

    if (!verificationToken) {
      recordAuthFailure(clientIp, normalizedEmail)
      return NextResponse.json(
        { error: "Invalid or expired verification code. Please request a new OTP." },
        { status: 400 }
      )
    }

    // Delete used verification token
    await prisma.verificationToken.deleteMany({
      where: { identifier: `signup-otp:${normalizedEmail}` },
    }).catch(() => {})

    // 7. Hash password & Create user
    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash: hashedPassword,
        emailVerified: new Date(),
        role: role || "PATIENT",
      },
    })

    // Reset failed attempts on success
    recordAuthSuccess(clientIp, normalizedEmail)

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    })
  } catch (error: any) {
    console.error("Registration error:", error)
    return NextResponse.json({ error: "Something went wrong during registration" }, { status: 500 })
  }
}

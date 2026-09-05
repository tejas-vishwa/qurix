import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendOtpEmail } from "@/lib/mailersend"
import { SendOtpSchema, validateSchema } from "@/lib/validations"
import {
  getClientIp,
  checkAuthLimit,
  recordAuthFailure,
  recordAuthSuccess,
  createRateLimitResponse,
} from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const clientIp = getClientIp(req)

  try {
    const rawBody = await req.json().catch(() => null)
    if (!rawBody || typeof rawBody !== "object") {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 })
    }

    const validation = validateSchema(SendOtpSchema, rawBody)
    if (!validation.success) {
      return validation.response
    }

    const { email } = validation.data
    const normalizedEmail = email.toLowerCase().trim()

    // Rate Limiting check
    const rateLimit = checkAuthLimit(clientIp, normalizedEmail)
    if (!rateLimit.allowed) {
      return createRateLimitResponse(
        rateLimit.retryAfter,
        rateLimit.limit,
        rateLimit.remaining,
        rateLimit.reset,
        `Too many OTP requests. Please wait ${rateLimit.retryAfter}s before requesting again.`
      )
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    }).catch(() => null)

    if (!user) {
      recordAuthFailure(clientIp, normalizedEmail)
      return NextResponse.json(
        { error: "No account found with this email. Please create an account." },
        { status: 404 }
      )
    }

    if (user.accountStatus === "SUSPENDED") {
      return NextResponse.json(
        { error: "Your account has been suspended. Please contact support." },
        { status: 403 }
      )
    }

    // Generate 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const identifier = `signin-otp:${normalizedEmail}`
    const expires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Clear any previous signin OTP tokens for this email
    await prisma.verificationToken.deleteMany({
      where: { identifier },
    }).catch(() => {})

    // Create fresh verification token
    await prisma.verificationToken.create({
      data: {
        identifier,
        token: otp,
        expires,
      },
    })

    // Send the email via multi-provider failover (Gmail SMTP, Resend, MailerSend)
    const emailResult = await sendOtpEmail({ to: normalizedEmail, otp })

    recordAuthSuccess(clientIp, normalizedEmail)

    return NextResponse.json({
      success: true,
      message: emailResult.delivered
        ? `A 6-digit verification code has been sent to ${normalizedEmail}.`
        : `Verification code generated for ${normalizedEmail}.`,
      delivered: emailResult.delivered,
      provider: emailResult.provider,
      ...(process.env.NODE_ENV !== "production" || !emailResult.delivered ? { devOtp: otp } : {}),
    })
  } catch (error: any) {
    console.error("Send signin OTP error:", error)
    return NextResponse.json(
      { error: "Failed to send verification code. Please try again later." },
      { status: 500 }
    )
  }
}

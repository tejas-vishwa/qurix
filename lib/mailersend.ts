import nodemailer from "nodemailer"
import { MailerSend, EmailParams, Sender, Recipient } from "mailersend"

export interface MagicLinkEmailParams {
  to: string
  url: string
  host: string
}

export interface SendEmailResult {
  delivered: boolean
  provider?: "gmail" | "smtp" | "mailersend" | "resend" | "dev"
  error?: string
}

/**
 * Clean & Professional HTML Magic Link Template for QURIX
 */
export function generateMagicLinkHtml({ url, host }: { url: string; host: string }): string {
  const brandColor = "#059669"
  const buttonTextColor = "#ffffff"

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in to QURIX</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="560" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 40px 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <h1 style="margin: 0; color: #0f172a; font-size: 24px; font-weight: 700;">QURIX</h1>
              <p style="margin: 4px 0 0 0; color: #64748b; font-size: 14px;">Secure Passwordless Sign-In</p>
            </td>
          </tr>
          
          <!-- Message -->
          <tr>
            <td style="color: #334155; font-size: 16px; line-height: 24px; padding-bottom: 28px; text-align: center;">
              Click the button below to authenticate your account and securely sign in to <strong>${host}</strong>.
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding-bottom: 28px;">
              <a href="${url}" target="_blank" style="display: inline-block; background-color: ${brandColor}; color: ${buttonTextColor}; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                Sign In to QURIX
              </a>
            </td>
          </tr>

          <!-- Fallback Link -->
          <tr>
            <td style="border-top: 1px solid #f1f5f9; padding-top: 20px; color: #64748b; font-size: 13px; line-height: 20px; text-align: center;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${url}" style="color: ${brandColor}; word-break: break-all; text-decoration: underline;">${url}</a>
            </td>
          </tr>

          <!-- Security Notice -->
          <tr>
            <td style="padding-top: 20px; color: #94a3b8; font-size: 12px; line-height: 18px; text-align: center;">
              If you didn't request this sign-in link, you can safely ignore this email. This link will expire in 24 hours.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

/**
 * Clean & High-Contrast HTML OTP Email Template for QURIX
 */
export function generateOtpHtml({ otp }: { otp: string }): string {
  const brandColor = "#059669"

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your QURIX Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="540" border="0" cellspacing="0" cellpadding="0" style="max-width: 540px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 40px 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); text-align: center;">
          <!-- Header -->
          <tr>
            <td style="padding-bottom: 20px;">
              <h1 style="margin: 0; color: #0f172a; font-size: 24px; font-weight: 700;">QURIX</h1>
              <p style="margin: 4px 0 0 0; color: #64748b; font-size: 14px;">Email Verification Code</p>
            </td>
          </tr>
          
          <!-- Message -->
          <tr>
            <td style="color: #334155; font-size: 15px; line-height: 22px; padding-bottom: 24px;">
              Please use the 6-digit verification code below to verify your email address and continue:
            </td>
          </tr>

          <!-- OTP Display Box -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <div style="display: inline-block; background-color: #f0fdf4; border: 2px dashed ${brandColor}; border-radius: 12px; padding: 16px 36px;">
                <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: ${brandColor}; font-family: 'Courier New', Courier, monospace;">
                  ${otp}
                </span>
              </div>
            </td>
          </tr>

          <!-- Expiry Notice -->
          <tr>
            <td style="color: #64748b; font-size: 13px; line-height: 20px; padding-bottom: 20px;">
              This code will expire in <strong>10 minutes</strong>. If you did not initiate this request, you can safely ignore this message.
            </td>
          </tr>

          <!-- Security Footer -->
          <tr>
            <td style="border-top: 1px solid #f1f5f9; padding-top: 20px; color: #94a3b8; font-size: 12px; line-height: 18px;">
              Never share this verification code with anyone. QURIX staff will never ask for your code.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

/**
 * Universal Multi-Provider Email Sender
 * Tries: Gmail SMTP -> Custom SMTP -> Resend API -> MailerSend -> Dev Fallback
 */
export async function sendEmailDirect({
  to,
  subject,
  html,
  text,
}: {
  to: string
  subject: string
  html: string
  text: string
}): Promise<SendEmailResult> {
  const errors: string[] = []

  // 1. Check Gmail App Password / Nodemailer SMTP
  const emailUser = process.env.EMAIL_USER || process.env.SMTP_USER
  const emailPass = process.env.EMAIL_PASS || process.env.SMTP_PASS
  const smtpHost = process.env.SMTP_HOST
  const fromName = process.env.MAIL_FROM_NAME || process.env.MAILERSEND_FROM_NAME || "QURIX"

  if (emailUser && emailPass) {
    try {
      const transporter = smtpHost
        ? nodemailer.createTransport({
            host: smtpHost,
            port: Number(process.env.SMTP_PORT) || 465,
            secure: process.env.SMTP_SECURE === "true" || Number(process.env.SMTP_PORT) === 465,
            auth: { user: emailUser, pass: emailPass },
          })
        : nodemailer.createTransport({
            service: "gmail",
            auth: { user: emailUser, pass: emailPass },
          })

      await transporter.sendMail({
        from: `"${fromName}" <${emailUser}>`,
        to,
        subject,
        html,
        text,
      })

      console.log(`[EMAIL DISPATCHED] Successfully sent email to ${to} via SMTP/Gmail (${emailUser})`)
      return { delivered: true, provider: "gmail" }
    } catch (err: any) {
      const msg = `SMTP/Gmail delivery failed: ${err.message}`
      console.warn(`[EMAIL WARNING] ${msg}`)
      errors.push(msg)
    }
  }

  // 2. Check Resend REST API
  const resendApiKey = process.env.RESEND_API_KEY
  if (resendApiKey) {
    try {
      const resendFrom = process.env.RESEND_FROM || "QURIX <onboarding@resend.dev>"
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: resendFrom,
          to: [to],
          subject,
          html,
          text,
        }),
      })

      if (res.ok) {
        console.log(`[EMAIL DISPATCHED] Successfully sent email to ${to} via Resend`)
        return { delivered: true, provider: "resend" }
      } else {
        const errorJson = await res.json().catch(() => ({}))
        const msg = `Resend API failed (${res.status}): ${JSON.stringify(errorJson)}`
        console.warn(`[EMAIL WARNING] ${msg}`)
        errors.push(msg)
      }
    } catch (err: any) {
      const msg = `Resend network failure: ${err.message}`
      console.warn(`[EMAIL WARNING] ${msg}`)
      errors.push(msg)
    }
  }

  // 3. Check MailerSend SDK
  const mailersendApiKey = process.env.MAILERSEND_API_KEY
  if (mailersendApiKey) {
    try {
      const mailerSend = new MailerSend({ apiKey: mailersendApiKey })
      const fromEmail = process.env.MAILERSEND_FROM_EMAIL || "noreply@qurix.health"
      const sentFrom = new Sender(fromEmail, fromName)
      const recipients = [new Recipient(to, to)]

      const emailParams = new EmailParams()
        .setFrom(sentFrom)
        .setTo(recipients)
        .setReplyTo(sentFrom)
        .setSubject(subject)
        .setHtml(html)
        .setText(text)

      await mailerSend.email.send(emailParams)
      console.log(`[EMAIL DISPATCHED] Successfully sent email to ${to} via MailerSend (${fromEmail})`)
      return { delivered: true, provider: "mailersend" }
    } catch (err: any) {
      const msg = `MailerSend SDK delivery failed: ${err.message || JSON.stringify(err)}`
      console.warn(`[EMAIL WARNING] ${msg}`)
      errors.push(msg)
    }
  }

  // 4. Fallback when no provider is active or all fail
  const summaryError = errors.length > 0
    ? errors.join(" | ")
    : "No email provider configured (set EMAIL_USER + EMAIL_PASS for Gmail SMTP, or RESEND_API_KEY, or MAILERSEND_API_KEY)"

  console.warn(`[EMAIL NOTICE] Could not deliver email to ${to}: ${summaryError}`)
  return { delivered: false, provider: "dev", error: summaryError }
}

/**
 * Sends a 6-digit OTP verification code with multi-provider failover
 */
export async function sendOtpEmail({ to, otp }: { to: string; otp: string }): Promise<SendEmailResult> {
  const emailHtml = generateOtpHtml({ otp })
  const emailText = `Your QURIX verification code is: ${otp}\n\nThis code expires in 10 minutes. Do not share this code with anyone.`
  const subject = `${otp} is your QURIX Verification Code`

  console.log(`[OTP GENERATED] Destination: ${to} | 6-Digit Code: ${otp}`)
  return await sendEmailDirect({ to, subject, html: emailHtml, text: emailText })
}

/**
 * Sends a passwordless sign-in magic link with multi-provider failover
 */
export async function sendMagicLinkEmail({ to, url, host }: MagicLinkEmailParams): Promise<SendEmailResult> {
  const emailHtml = generateMagicLinkHtml({ url, host })
  const emailText = `Sign in to QURIX (${host})\n\nClick the link below to sign in:\n${url}\n\nIf you did not request this email, you can safely ignore it.`
  const subject = `Your Magic Sign-In Link for QURIX`

  console.log(`[MAGIC LINK GENERATED] Destination: ${to} | URL: ${url}`)
  return await sendEmailDirect({ to, subject, html: emailHtml, text: emailText })
}

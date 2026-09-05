import { z } from "zod"

export const RegisterSchema = z
  .object({
    name: z
      .string({ required_error: "Name is required" })
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name cannot exceed 100 characters")
      .regex(/^[a-zA-Z\s.'-]+$/, "Name contains invalid characters"),
    email: z
      .string({ required_error: "Email is required" })
      .trim()
      .toLowerCase()
      .email("Please provide a valid email address")
      .max(255, "Email cannot exceed 255 characters"),
    password: z
      .string({ required_error: "Password is required" })
      .min(6, "Password must be at least 6 characters")
      .max(128, "Password cannot exceed 128 characters"),
    role: z
      .enum(["PATIENT", "DOCTOR", "ADMIN", "LAB_PARTNER"], {
        errorMap: () => ({ message: "Role must be PATIENT, DOCTOR, ADMIN, or LAB_PARTNER" }),
      })
      .optional()
      .default("PATIENT"),
    otp: z
      .string()
      .trim()
      .length(6, "OTP must be a 6-digit code")
      .regex(/^\d{6}$/, "OTP must consist of 6 digits")
      .optional(),
    botCheck: z.union([z.string(), z.boolean()]).optional(),
    mathAnswer: z
      .number({ required_error: "Security challenge answer is required" })
      .int("Answer must be an integer"),
    num1: z.number({ required_error: "num1 is required" }).int(),
    num2: z.number({ required_error: "num2 is required" }).int(),
  })
  .strict()

export const SendOtpSchema = z
  .object({
    email: z
      .string({ required_error: "Email is required" })
      .trim()
      .toLowerCase()
      .email("Please provide a valid email address")
      .max(255, "Email cannot exceed 255 characters"),
  })
  .strict()

export const DoctorAccessCodeVerifySchema = z
  .object({
    code: z
      .string({ required_error: "Doctor access code is required" })
      .trim()
      .length(6, "Access code must be exactly 6 characters")
      .regex(/^[0-9a-zA-Z]{6}$/, "Access code must be a 6-character alphanumeric code"),
  })
  .strict()

export const PasswordResetSchema = z
  .object({
    email: z
      .string({ required_error: "Email is required" })
      .trim()
      .toLowerCase()
      .email("Please provide a valid email address")
      .max(255, "Email cannot exceed 255 characters"),
    action: z.enum(["REQUEST", "RESET"]).optional().default("REQUEST"),
    newPassword: z
      .string()
      .min(6, "New password must be at least 6 characters")
      .max(128, "New password cannot exceed 128 characters")
      .optional(),
  })
  .strict()

export type RegisterInput = z.infer<typeof RegisterSchema>
export type DoctorAccessCodeVerifyInput = z.infer<typeof DoctorAccessCodeVerifySchema>
export type PasswordResetInput = z.infer<typeof PasswordResetSchema>

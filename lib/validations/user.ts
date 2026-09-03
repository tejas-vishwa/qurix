import { z } from "zod"

export const UserProfileUpdateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name must be at least 1 character")
      .max(100, "Name cannot exceed 100 characters")
      .optional(),
    gender: z
      .string()
      .max(50, "Gender cannot exceed 50 characters")
      .nullable()
      .optional(),
    age: z
      .union([
        z.number().int("Age must be an integer").min(0, "Age cannot be negative").max(150, "Invalid age"),
        z.string().regex(/^\d+$/, "Age must be a valid number").transform((val) => parseInt(val, 10)),
        z.null(),
      ])
      .optional(),
    height: z
      .union([
        z.number().positive("Height must be positive").max(300, "Invalid height"),
        z.string().regex(/^\d+(\.\d+)?$/, "Height must be a valid number").transform((val) => parseFloat(val)),
        z.null(),
      ])
      .optional(),
    weight: z
      .union([
        z.number().positive("Weight must be positive").max(500, "Invalid weight"),
        z.string().regex(/^\d+(\.\d+)?$/, "Weight must be a valid number").transform((val) => parseFloat(val)),
        z.null(),
      ])
      .optional(),
    location: z
      .string()
      .trim()
      .max(200, "Location cannot exceed 200 characters")
      .nullable()
      .optional(),
  })
  .strict()

export type UserProfileUpdateInput = z.infer<typeof UserProfileUpdateSchema>

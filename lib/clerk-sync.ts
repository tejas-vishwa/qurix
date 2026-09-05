import { prisma } from "@/lib/prisma"

export interface SyncUserParams {
  clerkId: string
  email: string
  name?: string | null
  role?: "PATIENT" | "DOCTOR" | "ADMIN" | "LAB"
}

// In-memory cache to prevent repetitive round-trips to remote DB on every page navigation
const userSyncCache = new Map<string, { user: any; expiresAt: number }>()
const SYNC_CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

export function getCachedSyncedUser(clerkId: string) {
  const hit = userSyncCache.get(clerkId)
  if (hit && hit.expiresAt > Date.now()) {
    return hit.user
  }
  return null
}

export function setCachedSyncedUser(clerkId: string, user: any) {
  userSyncCache.set(clerkId, { user, expiresAt: Date.now() + SYNC_CACHE_TTL_MS })
}

/**
 * Synchronizes an authenticated Clerk user with the Prisma database.
 * Ensures health records, appointments, and prescriptions link to the user record.
 */
export async function syncClerkUserWithPrisma({
  clerkId,
  email,
  name,
  role = "PATIENT",
}: SyncUserParams) {
  if (!email) return null

  // Fast return if freshly cached
  const cached = getCachedSyncedUser(clerkId)
  if (cached) return cached

  const normalizedEmail = email.toLowerCase().trim()

  try {
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedEmail },
          { id: clerkId },
        ],
      },
    }).catch((err) => {
      console.warn("[syncClerkUserWithPrisma] findFirst error:", err)
      return null
    })

    if (user) {
      // Only write to DB if name is missing or invalid — avoids a pointless UPDATE on every page load
      if ((!user.name || user.name.toLowerCase() === "patient" || user.name.startsWith("user_")) && name && name.toLowerCase() !== "patient" && !name.startsWith("user_")) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { name },
        }).catch(() => user)
      }
      userSyncCache.set(clerkId, { user, expiresAt: Date.now() + SYNC_CACHE_TTL_MS })
      return user
    }

    const initialName = (name && name.toLowerCase() !== "patient" && !name.startsWith("user_"))
      ? name
      : (normalizedEmail.includes("@") ? normalizedEmail.split("@")[0] : "User")

    // Create fresh user record in Prisma
    user = await prisma.user.create({
      data: {
        id: clerkId,
        email: normalizedEmail,
        passwordHash: "clerk_managed_auth",
        name: initialName,
        role: role || "PATIENT",
        emailVerified: new Date(),
        subscriptionTier: "FREE",
        paymentStatus: "NONE",
      },
    })

    userSyncCache.set(clerkId, { user, expiresAt: Date.now() + SYNC_CACHE_TTL_MS })
    return user
  } catch (error) {
    console.error("Failed to sync Clerk user with Prisma:", error)
    return null
  }
}

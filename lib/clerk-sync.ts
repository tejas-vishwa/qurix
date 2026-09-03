import { prisma } from "@/lib/prisma"
import { extractNameFromEmail } from "@/lib/utils"

export interface SyncUserParams {
  clerkId: string
  email: string
  name?: string | null
  role?: "PATIENT" | "DOCTOR" | "ADMIN" | "LAB"
}

// In-memory cache to prevent repetitive round-trips to remote DB on every page navigation
const userSyncCache = new Map<string, { user: any; expiresAt: number }>()
const SYNC_CACHE_TTL_MS = 2 * 60 * 1000 // 2 minutes

export function getCachedSyncedUser(clerkId: string) {
  const hit = userSyncCache.get(clerkId)
  if (hit && hit.expiresAt > Date.now()) {
    return hit.user
  }
  return null
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
      // Update existing user with name/verified status if missing
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          email: normalizedEmail,
          name: name || user.name,
        },
      }).catch(() => user)
      userSyncCache.set(clerkId, { user, expiresAt: Date.now() + SYNC_CACHE_TTL_MS })
      return user
    }

    // Create fresh user record in Prisma
    user = await prisma.user.create({
      data: {
        id: clerkId,
        email: normalizedEmail,
        passwordHash: "clerk_managed_auth",
        name: name || extractNameFromEmail(normalizedEmail),
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

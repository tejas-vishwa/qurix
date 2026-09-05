import { NextResponse } from "next/server"
import { getServerSession, authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserProfileUpdateSchema, validateSchema } from "@/lib/validations"
import { setCachedSyncedUser } from "@/lib/clerk-sync"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: session.user.id },
          { email: session.user.email?.toLowerCase().trim() || "" },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        gender: true,
        age: true,
        location: true,
        subscriptionTier: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const cleanName =
      user.name &&
      user.name.toLowerCase() !== "user" &&
      user.name.toLowerCase() !== "patient" &&
      !user.name.startsWith("user_")
        ? user.name
        : ""

    return NextResponse.json({
      ...user,
      name: cleanName,
    })
  } catch (error) {
    console.error("Error fetching profile:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const rawData = await request.json().catch(() => null)
    if (!rawData || typeof rawData !== "object") {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 })
    }

    // 1. Strict Schema Validation
    const validation = validateSchema(UserProfileUpdateSchema, rawData)
    if (!validation.success) {
      return validation.response
    }

    const { name, gender, age, location } = validation.data

    let existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { id: session.user.id },
          { email: session.user.email?.toLowerCase().trim() || "" },
        ],
      },
    })

    let updatedUser
    if (existingUser) {
      updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: name !== undefined ? name : undefined,
          gender: gender !== undefined ? gender : undefined,
          age: age !== undefined ? age : undefined,
          location: location !== undefined ? location : undefined,
        },
      })
    } else {
      updatedUser = await prisma.user.create({
        data: {
          id: session.user.id,
          email: session.user.email || `${session.user.id}@clerk.user`,
          name: name || undefined,
          gender: gender || undefined,
          age: age || undefined,
          location: location || undefined,
          passwordHash: "clerk_managed_auth",
        },
      })
    }

    setCachedSyncedUser(session.user.id, updatedUser)

    return NextResponse.json({ success: true, user: updatedUser })
  } catch (error) {
    console.error("Error updating profile:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

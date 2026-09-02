import { NextResponse } from "next/server";
import { getServerSession, authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminUserActionSchema, validateSchema } from "@/lib/validations";

export const dynamic = "force-dynamic"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id || typeof id !== "string" || id.trim().length === 0) {
      return NextResponse.json({ error: "Invalid target user ID" }, { status: 400 });
    }

    const rawBody = await req.json().catch(() => null);
    if (!rawBody || typeof rawBody !== "object") {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    // 1. Strict Schema Validation
    const validation = validateSchema(AdminUserActionSchema, rawBody);
    if (!validation.success) {
      return validation.response;
    }

    const { action } = validation.data;

    let updatedUser;

    if (action === "SUSPEND") {
      updatedUser = await prisma.user.update({
        where: { id },
        data: { accountStatus: "SUSPENDED" }
      });
      await prisma.activityLog.create({
        data: {
          action: "SUSPEND_USER",
          userId: session.user.id,
          details: `Target User ID: ${id}`
        }
      });
    } else if (action === "ACTIVATE") {
      updatedUser = await prisma.user.update({
        where: { id },
        data: { accountStatus: "ACTIVE" }
      });
      await prisma.activityLog.create({
        data: {
          action: "ACTIVATE_USER",
          userId: session.user.id,
          details: `Target User ID: ${id}`
        }
      });
    } else if (action === "RESET_PASSWORD") {
      // Pretend email is sent
      await prisma.activityLog.create({
        data: {
          action: "RESET_PASSWORD_REQUEST",
          userId: session.user.id,
          details: `Target User ID: ${id}`
        }
      });
      return NextResponse.json({ message: "Password reset email sent" });
    }

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

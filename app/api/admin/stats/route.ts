import { NextResponse } from "next/server";
import { getServerSession, authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const totalUsers = await prisma.user.count();
    const totalPatients = await prisma.user.count({ where: { role: "PATIENT" } });
    const totalDoctors = await prisma.user.count({ where: { role: "DOCTOR" } });
    const totalDocs = await prisma.report.count();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const docsToday = await prisma.report.count({
      where: { createdAt: { gte: today } }
    });

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const docsThisWeek = await prisma.report.count({
      where: { createdAt: { gte: startOfWeek } }
    });

    return NextResponse.json({
      totalUsers,
      totalPatients,
      totalDoctors,
      totalDocs,
      docsToday,
      docsThisWeek
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

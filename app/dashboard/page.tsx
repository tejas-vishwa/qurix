import { getAuthSession } from "@/lib/auth"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const session = await getAuthSession()

  if (!session) {
    redirect("/login")
  }

  const role = (session.user.role || "PATIENT").toUpperCase()

  if (role === "DOCTOR") {
    redirect("/doctor/dashboard")
  } else if (role === "ADMIN") {
    redirect("/admin")
  } else {
    redirect("/patient/dashboard")
  }
}

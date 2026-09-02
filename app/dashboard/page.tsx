import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  // Always show portal selection — let the user choose their role
  redirect("/portal")
}

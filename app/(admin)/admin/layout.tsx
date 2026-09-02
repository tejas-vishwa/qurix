import { getServerSession, authOptions } from "@/lib/auth";
import { notFound } from "next/navigation"
import AdminSidebar from "@/components/AdminSidebar"

export const dynamic = "force-dynamic"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "ADMIN") {
    notFound() // Completely hides the route from non-admins
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex transition-colors duration-300">
      <AdminSidebar />
      <main className="flex-1 p-4 pt-20 md:p-8 md:pt-8 overflow-y-auto h-screen">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}

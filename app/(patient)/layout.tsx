import { getAuthSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { BackButton } from "@/components/BackButton"
import { PatientNavbar } from "@/components/PatientNavbar"
import { Footer } from "@/components/Footer"

export const dynamic = "force-dynamic"

export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  // React.cache means this shares the result with any child page that also calls getAuthSession
  // No double DB/HTTP call — both layout and page share one cached result per request
  const session = await getAuthSession()
  const userRole = (session?.user?.role || "PATIENT").toUpperCase()

  if (!session || (userRole !== "PATIENT" && userRole !== "ADMIN")) {
    redirect("/login")
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground transition-colors duration-300">
      <PatientNavbar
        userName={session.user.name}
        userEmail={session.user.email}
        subscriptionTier={session.user.subscriptionTier}
      />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <BackButton />
        {children}
      </main>
      <Footer />
    </div>
  )
}

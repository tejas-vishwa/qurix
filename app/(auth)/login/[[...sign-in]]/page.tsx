"use client"

import { useEffect } from "react"
import { SignIn, ClerkLoading, ClerkLoaded, useAuth, useUser } from "@clerk/nextjs"
import { QurixLogo } from "@/components/QurixLogo"
import { BackButton } from "@/components/BackButton"
import { Loader2 } from "lucide-react"
import Link from "next/link"

export default function LoginPage() {
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()

  // After sign-in: read saved role from Clerk metadata → redirect to right dashboard
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return

    const role =
      (user.unsafeMetadata?.role as string)?.toUpperCase() ||
      (user.publicMetadata?.role as string)?.toUpperCase() ||
      "PATIENT"

    if (role === "DOCTOR") {
      window.location.href = "/doctor/dashboard"
    } else {
      window.location.href = "/patient/dashboard"
    }
  }, [isLoaded, isSignedIn, user])

  if (isLoaded && isSignedIn) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center justify-center space-y-3 p-8">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-base font-semibold text-foreground">Signed in successfully!</p>
          <p className="text-sm text-muted-foreground">Redirecting to your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-md absolute top-4 left-4">
        <BackButton />
      </div>
      <div className="w-full max-w-md space-y-6 flex flex-col items-center">
        <div className="flex justify-center mb-2">
          <Link href="/" className="flex items-center group transition-transform hover:scale-105">
            <QurixLogo className="h-10 w-auto" />
          </Link>
        </div>

        <div className="w-full flex justify-center min-h-[420px] items-center">
          <ClerkLoading>
            <div className="flex flex-col items-center justify-center space-y-3 p-8">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              <p className="text-sm font-medium text-muted-foreground">Loading secure sign in...</p>
            </div>
          </ClerkLoading>
          <ClerkLoaded>
            <SignIn
              appearance={{
                layout: {
                  socialButtonsPlacement: "bottom",
                  logoPlacement: "none",
                },
                elements: {
                  card: "shadow-lg border border-slate-200 dark:border-slate-800 rounded-2xl bg-card p-6",
                  formButtonPrimary: "bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl py-3 shadow-md shadow-emerald-600/20 transition-all",
                  footerActionLink: "text-emerald-600 dark:text-emerald-400 hover:underline font-semibold",
                  formFieldInput: "rounded-xl border-input bg-background focus:ring-emerald-500 focus:border-emerald-500 py-2.5",
                  headerTitle: "text-2xl font-bold text-foreground",
                  headerSubtitle: "text-sm text-muted-foreground",
                },
              }}
              routing="path"
              path="/login"
              signUpUrl="/register"
              forceRedirectUrl="/login"
              fallbackRedirectUrl="/login"
            />
          </ClerkLoaded>
        </div>
      </div>
    </div>
  )
}

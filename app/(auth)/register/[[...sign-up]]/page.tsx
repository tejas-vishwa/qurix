"use client"

import { useEffect } from "react"
import { SignUp, ClerkLoading, ClerkLoaded, useAuth, useUser } from "@clerk/nextjs"
import { QurixLogo } from "@/components/QurixLogo"
import { BackButton } from "@/components/BackButton"
import { Loader2 } from "lucide-react"
import Link from "next/link"

export default function RegisterPage() {
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      const role =
        (user?.publicMetadata?.role as string)?.toUpperCase() ||
        (user?.unsafeMetadata?.role as string)?.toUpperCase()

      if (role === "DOCTOR") {
        window.location.href = "/doctor/dashboard"
      } else if (role === "ADMIN") {
        window.location.href = "/admin"
      } else if (role === "LAB") {
        window.location.href = "/lab/dashboard"
      } else {
        window.location.href = "/dashboard"
      }
    }
  }, [isLoaded, isSignedIn, user])

  if (isLoaded && isSignedIn) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-md space-y-6 flex flex-col items-center">
          <Link href="/" className="flex items-center group transition-transform hover:scale-105">
            <QurixLogo className="h-10 w-auto" />
          </Link>
          <div className="flex flex-col items-center justify-center space-y-3 p-8">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <p className="text-base font-semibold text-foreground">Signed in successfully!</p>
            <p className="text-sm text-muted-foreground">Redirecting to your dashboard...</p>
          </div>
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
              <p className="text-sm font-medium text-muted-foreground">Loading registration...</p>
            </div>
          </ClerkLoading>
          <ClerkLoaded>
            <SignUp
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
                  identityPreviewEditButtonIcon: "text-emerald-600",
                  headerTitle: "text-2xl font-bold text-foreground",
                  headerSubtitle: "text-sm text-muted-foreground",
                },
              }}
              routing="path"
              path="/register"
              signInUrl="/login"
              forceRedirectUrl="/dashboard"
              fallbackRedirectUrl="/dashboard"
            />
          </ClerkLoaded>
        </div>
      </div>
    </div>
  )
}

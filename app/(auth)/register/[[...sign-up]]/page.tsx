"use client"

import { useEffect, useState } from "react"
import { SignUp, ClerkLoading, ClerkLoaded, useAuth, useUser } from "@clerk/nextjs"
import { QurixLogo } from "@/components/QurixLogo"
import { BackButton } from "@/components/BackButton"
import { Loader2, Activity, Stethoscope } from "lucide-react"
import Link from "next/link"

type Role = "PATIENT" | "DOCTOR" | null

export default function RegisterPage() {
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()
  const [selectedRole, setSelectedRole] = useState<Role>(null)
  const [saving, setSaving] = useState(false)

  // After signup: save role to Clerk metadata, then redirect
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return

    const saveAndRedirect = async () => {
      setSaving(true)
      const role = (localStorage.getItem("qurix_signup_role") as Role) || "PATIENT"

      try {
        await user.update({ unsafeMetadata: { role } })
      } catch {
        // non-blocking — redirect anyway
      }

      localStorage.removeItem("qurix_signup_role")
      window.location.href = role === "DOCTOR" ? "/doctor/dashboard" : "/patient/dashboard"
    }

    saveAndRedirect()
  }, [isLoaded, isSignedIn, user])

  // Loading / redirecting state
  if (isLoaded && isSignedIn) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center justify-center space-y-3 p-8">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-base font-semibold text-foreground">Account created!</p>
          <p className="text-sm text-muted-foreground">Setting up your dashboard...</p>
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

        {/* ── Step 1: Role Selection ─────────────────────────────── */}
        {!selectedRole && (
          <div className="w-full space-y-4">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold text-foreground">I am a...</h2>
              <p className="text-sm text-muted-foreground">Choose your role to get started</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Patient */}
              <button
                onClick={() => {
                  localStorage.setItem("qurix_signup_role", "PATIENT")
                  setSelectedRole("PATIENT")
                }}
                className="flex flex-col items-center gap-3 rounded-2xl border-2 border-border bg-card p-6 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 group"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-200">
                  <Activity className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-foreground">Patient</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Track health & reports</p>
                </div>
              </button>

              {/* Doctor */}
              <button
                onClick={() => {
                  localStorage.setItem("qurix_signup_role", "DOCTOR")
                  setSelectedRole("DOCTOR")
                }}
                className="flex flex-col items-center gap-3 rounded-2xl border-2 border-border bg-card p-6 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 group"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-200">
                  <Stethoscope className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-foreground">Doctor</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Manage patient queue</p>
                </div>
              </button>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        )}

        {/* ── Step 2: Clerk SignUp Form ──────────────────────────── */}
        {selectedRole && (
          <div className="w-full space-y-3">
            {/* Role badge + change button */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2 text-sm">
                {selectedRole === "PATIENT" ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-3 py-1 text-emerald-700 dark:text-emerald-300 font-semibold text-xs">
                    <Activity className="h-3.5 w-3.5" /> Patient
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 dark:bg-blue-900/40 px-3 py-1 text-blue-700 dark:text-blue-300 font-semibold text-xs">
                    <Stethoscope className="h-3.5 w-3.5" /> Doctor
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem("qurix_signup_role")
                  setSelectedRole(null)
                }}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
              >
                Change role
              </button>
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
                  forceRedirectUrl="/register"
                  fallbackRedirectUrl="/register"
                />
              </ClerkLoaded>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { SignIn, ClerkLoading, ClerkLoaded, useAuth, useUser } from "@clerk/nextjs"
import { QurixLogo } from "@/components/QurixLogo"
import { BackButton } from "@/components/BackButton"
import { Loader2, CheckCircle2, ArrowRight, ShieldCheck, Mail, Lock, Sparkles, User, Stethoscope } from "lucide-react"
import Link from "next/link"

export default function LoginPage() {
  const router = useRouter()
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()

  const [authMode, setAuthMode] = useState<"credentials" | "clerk">("credentials")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  // Redirect signed-in Clerk users without hard page reloads
  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      setIsSuccess(true)
      const role =
        (user.unsafeMetadata?.role as string)?.toUpperCase() ||
        (user.publicMetadata?.role as string)?.toUpperCase() ||
        "PATIENT"

      let target = "/dashboard"
      if (role === "DOCTOR") target = "/doctor/dashboard"
      else if (role === "ADMIN") target = "/admin"
      else if (role === "LAB") target = "/lab/dashboard"
      else target = "/patient/dashboard"

      // Set auth_token session cookie for Edge middleware instant redirects
      document.cookie = `auth_token=clerk_${user?.id || "session"}; path=/; max-age=2592000; SameSite=Lax`

      const timer = setTimeout(() => {
        router.push(target)
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [isLoaded, isSignedIn, user, router])

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError("Please provide both email and password")
      return
    }

    setError(null)
    setIsLoading(true)

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: email.trim().toLowerCase(),
        password,
      })

      if (res?.error) {
        setError(res.error)
        setIsLoading(false)
        return
      }

      // Success: morph button state, set edge session cookie & smoothly navigate
      setIsLoading(false)
      setIsSuccess(true)

      // Edge session cookie for sub-millisecond middleware redirects
      const token = `usr_${Math.random().toString(36).substring(2)}_${Date.now()}`
      document.cookie = `auth_token=${token}; path=/; max-age=2592000; SameSite=Lax`

      setTimeout(() => {
        router.push("/dashboard")
      }, 500)
    } catch (err: any) {
      setError(err?.message || "Failed to sign in. Please try again.")
      setIsLoading(false)
    }
  }

  const fillDemoAccount = (demoEmail: string, demoPass: string = "demo1234") => {
    setEmail(demoEmail)
    setPassword(demoPass)
    setError(null)
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden bg-gradient-to-br from-sky-50/80 via-slate-50 to-blue-50/60 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950/30">
      {/* Calming Medical Palette Ambient Backdrop Lighting */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-sky-200/40 dark:bg-sky-900/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[550px] h-[550px] bg-teal-200/30 dark:bg-teal-900/20 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute top-[40%] right-[15%] w-[350px] h-[350px] bg-blue-200/25 dark:bg-blue-900/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Navigation */}
      <div className="w-full max-w-md absolute top-6 left-6 z-20">
        <BackButton />
      </div>

      <AnimatePresence mode="wait">
        {isSuccess ? (
          /* Seamless Success State: morph & fade out towards dashboard */
          <motion.div
            key="success-card"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="w-full max-w-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-emerald-100 dark:border-emerald-950/60 shadow-2xl shadow-emerald-500/10 rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 flex items-center justify-center text-emerald-600 dark:text-emerald-400"
            >
              <CheckCircle2 className="h-8 w-8" />
            </motion.div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Welcome Back</h2>
            <p className="text-sm text-muted-foreground">Signed in securely. Snapping into your dashboard...</p>
            <div className="flex items-center gap-2 pt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Initializing clinical workspace...</span>
            </div>
          </motion.div>
        ) : (
          /* Main Authentication Card */
          <motion.div
            key="login-form-card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="w-full max-w-md space-y-6 z-10"
          >
            {/* Logo & Calming Medical Greeting */}
            <div className="flex flex-col items-center text-center space-y-2">
              <Link href="/" className="inline-block group transition-transform hover:scale-105 mb-1">
                <QurixLogo className="h-10 w-auto" showTagline={true} />
              </Link>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Patient & Clinical Portal
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                Log in to securely access your medical records and biomarker trends
              </p>
            </div>

            {/* Subtle Glassmorphism Card */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-sky-100/80 dark:border-slate-800/80 shadow-2xl shadow-sky-500/10 rounded-3xl p-6 sm:p-8 transition-all">
              {/* Auth Mode Toggle */}
              <div className="grid grid-cols-2 p-1 mb-6 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setAuthMode("credentials")}
                  className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                    authMode === "credentials"
                      ? "bg-white dark:bg-slate-900 text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Direct Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode("clerk")}
                  className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                    authMode === "clerk"
                      ? "bg-white dark:bg-slate-900 text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Clerk SSO
                </button>
              </div>

              {authMode === "credentials" ? (
                <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs text-red-600 dark:text-red-400 font-medium"
                    >
                      {error}
                    </motion.div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-sky-600" />
                      Email Address
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@email.com"
                        className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-950/60 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 transition-all placeholder:text-muted-foreground/60"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5 text-sky-600" />
                        Password
                      </label>
                      <Link
                        href="/login?forgot=true"
                        className="text-[11px] font-medium text-sky-600 dark:text-sky-400 hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-950/60 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 transition-all placeholder:text-muted-foreground/60"
                      />
                    </div>
                  </div>

                  {/* Morphing Login Button */}
                  <motion.button
                    layout
                    type="submit"
                    disabled={isLoading || isSuccess}
                    whileTap={{ scale: 0.98 }}
                    transition={{ layout: { duration: 0.35, ease: "easeInOut" } }}
                    className={`w-full h-12 mt-2 rounded-xl font-bold text-sm text-white shadow-lg transition-all flex items-center justify-center ${
                      isLoading || isSuccess
                        ? "bg-sky-500 shadow-sky-500/30"
                        : "bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 shadow-sky-600/25 hover:shadow-xl hover:shadow-sky-600/30"
                    }`}
                  >
                    <AnimatePresence mode="wait">
                      {isLoading ? (
                        <motion.div
                          key="loading"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex items-center space-x-2"
                        >
                          <Loader2 className="h-4 w-4 animate-spin text-white" />
                          <span>Verifying Credentials...</span>
                        </motion.div>
                      ) : isSuccess ? (
                        <motion.div
                          key="success"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex items-center space-x-2"
                        >
                          <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                          <span>Success! Redirecting...</span>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="idle"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center space-x-2"
                        >
                          <span>Sign In to Qurix</span>
                          <ArrowRight className="h-4 w-4" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>

                  {/* 1-Click Demo Accounts Quick-Fill */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-amber-500" /> Quick Demo Access
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => fillDemoAccount("priya@demo.com")}
                        className="p-2 text-left rounded-lg bg-sky-50/70 dark:bg-sky-950/30 hover:bg-sky-100 dark:hover:bg-sky-900/40 border border-sky-100 dark:border-sky-900/40 transition-colors"
                      >
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                          <User className="h-3 w-3 text-sky-600" /> Patient
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">Priya Sharma (Free)</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => fillDemoAccount("tejas@demo.com")}
                        className="p-2 text-left rounded-lg bg-indigo-50/70 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-100 dark:border-indigo-900/40 transition-colors"
                      >
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                          <Sparkles className="h-3 w-3 text-indigo-600" /> QURIX Plus
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">Tejas Vishwakarma</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => fillDemoAccount("doctor@demo.com")}
                        className="p-2 text-left rounded-lg bg-teal-50/70 dark:bg-teal-950/30 hover:bg-teal-100 dark:hover:bg-teal-900/40 border border-teal-100 dark:border-teal-900/40 transition-colors"
                      >
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                          <Stethoscope className="h-3 w-3 text-teal-600" /> Doctor
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">Dr. Rahul Verma</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => fillDemoAccount("admin@qurix.health")}
                        className="p-2 text-left rounded-lg bg-slate-100/70 dark:bg-slate-800/40 hover:bg-slate-200/70 dark:hover:bg-slate-800/70 border border-slate-200 dark:border-slate-700/50 transition-colors"
                      >
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                          <ShieldCheck className="h-3 w-3 text-slate-600" /> Admin
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">System Admin</p>
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                /* Clerk Managed SSO */
                <div className="min-h-[380px] flex items-center justify-center">
                  <ClerkLoading>
                    <div className="flex flex-col items-center justify-center space-y-3 p-8">
                      <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
                      <p className="text-sm font-medium text-muted-foreground">Connecting to Clerk secure SSO...</p>
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
                          card: "shadow-none border-0 bg-transparent p-0",
                          formButtonPrimary:
                            "bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm rounded-xl py-3 shadow-md shadow-sky-600/20 transition-all",
                          footerActionLink: "text-sky-600 dark:text-sky-400 hover:underline font-semibold",
                          formFieldInput:
                            "rounded-xl border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-950/60 focus:ring-sky-500 py-2.5",
                          headerTitle: "hidden",
                          headerSubtitle: "hidden",
                        },
                      }}
                      routing="path"
                      path="/login"
                      signUpUrl="/register"
                      forceRedirectUrl="/dashboard"
                      fallbackRedirectUrl="/dashboard"
                    />
                  </ClerkLoaded>
                </div>
              )}

              {/* Registration Prompt */}
              <div className="pt-5 mt-5 border-t border-slate-100 dark:border-slate-800 text-center">
                <p className="text-xs text-muted-foreground">
                  Don&apos;t have an account yet?{" "}
                  <Link href="/register" className="font-semibold text-sky-600 dark:text-sky-400 hover:underline">
                    Create free account
                  </Link>
                </p>
              </div>
            </div>

            {/* HIPAA / Security Badge */}
            <div className="flex items-center justify-center space-x-2 text-[11px] text-muted-foreground/80">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>256-bit encrypted • HIPAA-compliant architecture</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

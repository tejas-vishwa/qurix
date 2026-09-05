"use client"

import { useState, useEffect } from "react"
import { signIn } from "next-auth/react"
import { SignIn, ClerkLoading, ClerkLoaded, useAuth, useUser } from "@clerk/nextjs"
import { QurixLogo } from "@/components/QurixLogo"
import { BackButton } from "@/components/BackButton"
import { ThemeToggle } from "@/components/ThemeToggle"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  User,
  Stethoscope,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Check,
  Copy,
  Sparkles,
  ArrowRight,
  KeyRound,
  SlidersHorizontal,
} from "lucide-react"
import Link from "next/link"

interface DemoAccount {
  name: string
  email: string
  password: string
  role: "PATIENT" | "DOCTOR" | "ADMIN"
  roleLabel: string
  targetUrl: string
  badgeColor: string
  category: "patient" | "doctor" | "admin"
  isPlus?: boolean
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    name: "Priya Sharma",
    email: "priya@demo.com",
    password: "demo1234",
    role: "PATIENT",
    roleLabel: "Patient",
    category: "patient",
    targetUrl: "/patient/dashboard",
    badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  {
    name: "Tejas Vishwakarma",
    email: "tejas@demo.com",
    password: "demo1234",
    role: "PATIENT",
    roleLabel: "Patient (Plus)",
    category: "patient",
    targetUrl: "/patient/dashboard",
    badgeColor: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    isPlus: true,
  },
  {
    name: "Sankalp Verma",
    email: "sankalp@demo.com",
    password: "demo1234",
    role: "PATIENT",
    roleLabel: "Patient",
    category: "patient",
    targetUrl: "/patient/dashboard",
    badgeColor: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  },
  {
    name: "Utkarsh Singh",
    email: "utkarsh@demo.com",
    password: "demo1234",
    role: "PATIENT",
    roleLabel: "Patient",
    category: "patient",
    targetUrl: "/patient/dashboard",
    badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  {
    name: "Dr. Rahul Verma",
    email: "doctor@demo.com",
    password: "demo1234",
    role: "DOCTOR",
    roleLabel: "General Physician",
    category: "doctor",
    targetUrl: "/doctor/dashboard",
    badgeColor: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
  },
  {
    name: "QURIX Admin",
    email: "admin@qurix.health",
    password: "admin1234",
    role: "ADMIN",
    roleLabel: "System Admin",
    category: "admin",
    targetUrl: "/admin",
    badgeColor: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  },
  {
    name: "Super Admin",
    email: "admin@teamqurix.com",
    password: "demo1234",
    role: "ADMIN",
    roleLabel: "Super Admin",
    category: "admin",
    targetUrl: "/admin",
    badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
]

export default function LoginPage() {
  const { isLoaded, isSignedIn, user } = useAuth()
  const { user: clerkUser } = useUser()

  // Layout view mode: 'both' | 'demo' | 'clerk'
  const [viewMode, setViewMode] = useState<"both" | "demo" | "clerk">("both")

  // Direct credentials form state
  const [email, setEmail] = useState("priya@demo.com")
  const [password, setPassword] = useState("demo1234")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [signingInEmail, setSigningInEmail] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Demo Password Lock Modal state
  const [selectedDemoUser, setSelectedDemoUser] = useState<DemoAccount | null>(null)
  const [isDemoDialogOpen, setIsDemoDialogOpen] = useState(false)
  const [demoPassword, setDemoPassword] = useState("")
  const [demoError, setDemoError] = useState("")
  const [showDemoPassword, setShowDemoPassword] = useState(false)
  const [verifyingDemo, setVerifyingDemo] = useState(false)

  // Redirect after Clerk sign in
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return

    const role =
      (clerkUser?.unsafeMetadata?.role as string)?.toUpperCase() ||
      (clerkUser?.publicMetadata?.role as string)?.toUpperCase() ||
      "PATIENT"

    if (role === "DOCTOR") {
      window.location.href = "/doctor/dashboard"
    } else if (role === "ADMIN") {
      window.location.href = "/admin"
    } else {
      window.location.href = "/patient/dashboard"
    }
  }, [isLoaded, isSignedIn, user, clerkUser])

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard?.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  // Open the Password Lock Modal
  const openDemoModal = (account: DemoAccount) => {
    setSelectedDemoUser(account)
    setDemoPassword(account.password)
    setDemoError("")
    setShowDemoPassword(false)
    setIsDemoDialogOpen(true)
    setEmail(account.email)
    setPassword(account.password)
  }

  // Submit password in the Demo Lock Modal
  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDemoUser) return

    if (!demoPassword.trim()) {
      setDemoError("Please enter the account password.")
      return
    }

    setVerifyingDemo(true)
    setDemoError("")

    try {
      const res = await signIn("credentials", {
        email: selectedDemoUser.email.trim().toLowerCase(),
        password: demoPassword,
        redirect: false,
      })

      if (res?.error) {
        setDemoError("Incorrect password. Please enter the valid account password.")
        setVerifyingDemo(false)
      } else {
        setIsDemoDialogOpen(false)
        window.location.href = selectedDemoUser.targetUrl
      }
    } catch (err: any) {
      setDemoError(err?.message || "Sign in failed")
      setVerifyingDemo(false)
    }
  }

  // Direct Credentials Form Submit
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      setError("Please provide both email and password")
      return
    }

    setLoading(true)
    setError("")

    try {
      const res = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      })

      if (res?.error) {
        setError(res.error === "CredentialsSignin" ? "Invalid email or password" : res.error)
        setLoading(false)
      } else {
        const found = DEMO_ACCOUNTS.find((a) => a.email.toLowerCase() === email.trim().toLowerCase())
        const target = found
          ? found.targetUrl
          : email.includes("doctor")
          ? "/doctor/dashboard"
          : email.includes("admin")
          ? "/admin"
          : "/patient/dashboard"
        window.location.href = target
      }
    } catch (err: any) {
      setError(err?.message || "Sign in failed")
      setLoading(false)
    }
  }

  if (isLoaded && isSignedIn) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 bg-background">
        <div className="flex flex-col items-center justify-center space-y-3 p-8">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-base font-semibold text-foreground">Signed in successfully!</p>
          <p className="text-sm text-muted-foreground">Redirecting to your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300">
      {/* Top Header Bar */}
      <header className="w-full flex items-center justify-between p-4 sm:px-8 border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <BackButton />
          <Link href="/" className="flex items-center group transition-transform hover:scale-105">
            <QurixLogo className="h-8 w-auto" />
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {/* Mode Selector Tabs */}
          <div className="flex items-center bg-muted/70 p-1 rounded-xl border border-border/60">
            <button
              type="button"
              onClick={() => setViewMode("demo")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "demo"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Demo Accounts
            </button>
            <button
              type="button"
              onClick={() => setViewMode("clerk")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "clerk"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Clerk Sign In
            </button>
            <button
              type="button"
              onClick={() => setViewMode("both")}
              className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "both"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <SlidersHorizontal className="h-3 w-3" />
              Side by Side
            </button>
          </div>

          <ThemeToggle />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto w-full">
        {/* Page Title & Tagline */}
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Sign in to <span className="bg-gradient-to-r from-emerald-500 to-cyan-500 bg-clip-text text-transparent">Qurix</span>
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Choose between instant 1-click Demo Accounts with passwords or log in securely with Clerk.
          </p>
        </div>

        {/* Dynamic Dual / Single Column Grid */}
        <div
          className={`w-full grid gap-8 items-start transition-all duration-300 ${
            viewMode === "both"
              ? "grid-cols-1 lg:grid-cols-12 max-w-6xl"
              : "grid-cols-1 max-w-lg mx-auto"
          }`}
        >
          {/* ========================================================================= */}
          {/* BOX 1: DEMO ACCOUNTS SIGN-IN BOX WITH PASSWORDS                           */}
          {/* ========================================================================= */}
          {(viewMode === "both" || viewMode === "demo") && (
            <div
              className={`bg-card rounded-2xl border border-border/80 shadow-xl p-5 sm:p-7 space-y-6 ${
                viewMode === "both" ? "lg:col-span-7" : "w-full"
              }`}
            >
              {/* Box Header */}
              <div className="border-b border-border/60 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <KeyRound className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-foreground">Demo Accounts Sign In</h2>
                      <p className="text-xs text-muted-foreground">
                        Pre-configured test profiles • Passwords included
                      </p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-full border border-amber-500/20">
                    <Lock className="h-3 w-3" /> Password Protected
                  </span>
                </div>
              </div>

              {/* Direct Sign-In Form with Pre-fills */}
              <form onSubmit={handleCredentialsSubmit} className="space-y-4 bg-muted/30 p-4 rounded-xl border border-border/60">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Direct Credentials Sign-In
                  </p>
                  <span className="text-[11px] text-muted-foreground">Click any card below to auto-fill</span>
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs font-medium text-destructive">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-primary" /> Email
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="demo@qurix.health"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-primary" /> Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 pr-10 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !!signingInEmail}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Verifying Credentials...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      <span>Unlock & Sign In with Selected Credentials</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              {/* All Demo Accounts with Explicit Password Badges */}
              <div className="space-y-4">
                {/* 1. Patients */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                    <span className="flex items-center gap-1.5 text-foreground">
                      <User className="h-3.5 w-3.5 text-emerald-500" /> Patient Profiles
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                      <Lock className="h-3 w-3" /> Password Protected
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {DEMO_ACCOUNTS.filter((a) => a.category === "patient").map((account) => {
                      return (
                        <div
                          key={account.email}
                          className="p-3 rounded-xl border border-border/70 bg-card hover:bg-accent/40 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                              {account.name}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${account.badgeColor}`}>
                                {account.roleLabel}
                              </span>
                              <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                <Lock className="h-2.5 w-2.5" />
                              </span>
                            </div>
                          </div>

                          {/* Email & Password details */}
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center justify-between text-muted-foreground bg-muted/40 px-2 py-1 rounded-md">
                              <span className="font-mono text-[11px] truncate">{account.email}</span>
                              <button
                                type="button"
                                title="Copy Email"
                                onClick={() => copyToClipboard(account.email, `email-${account.email}`)}
                                className="text-muted-foreground hover:text-foreground transition-colors ml-1"
                              >
                                {copiedKey === `email-${account.email}` ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>

                            <div className="flex items-center justify-between text-muted-foreground bg-muted/40 px-2 py-1 rounded-md">
                              <span className="text-[11px]">
                                Password: <code className="font-mono font-bold text-foreground">{account.password}</code>
                              </span>
                              <button
                                type="button"
                                title="Copy Password"
                                onClick={() => copyToClipboard(account.password, `pwd-${account.email}`)}
                                className="text-muted-foreground hover:text-foreground transition-colors ml-1"
                              >
                                {copiedKey === `pwd-${account.email}` ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => openDemoModal(account)}
                            disabled={loading || verifyingDemo}
                            className="w-full py-2 px-2.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 border border-amber-500/20 active:scale-[0.98]"
                          >
                            <Lock className="h-3.5 w-3.5" />
                            <span>Unlock & Sign In</span>
                            <ArrowRight className="h-3 w-3 ml-auto opacity-60" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* 2. Doctor / Clinician */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                    <span className="flex items-center gap-1.5 text-foreground">
                      <Stethoscope className="h-3.5 w-3.5 text-teal-500" /> Clinician Profile
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                      <Lock className="h-3 w-3" /> Password Protected
                    </span>
                  </div>

                  {DEMO_ACCOUNTS.filter((a) => a.category === "doctor").map((account) => {
                    return (
                      <div
                        key={account.email}
                        className="p-3 rounded-xl border border-border/70 bg-card hover:bg-accent/40 hover:border-amber-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-foreground">{account.name}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${account.badgeColor}`}>
                              {account.roleLabel}
                            </span>
                            <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              <Lock className="h-2.5 w-2.5" />
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>
                              Email: <code className="font-mono text-foreground">{account.email}</code>
                            </span>
                            <span>•</span>
                            <span>
                              Password: <code className="font-mono font-bold text-foreground">{account.password}</code>
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => openDemoModal(account)}
                          disabled={loading || verifyingDemo}
                          className="py-2 px-4 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 border border-amber-500/20 shrink-0 active:scale-[0.98]"
                        >
                          <Lock className="h-3.5 w-3.5" />
                          <span>Unlock Doctor Portal</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>

                {/* 3. Administrators */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                    <span className="flex items-center gap-1.5 text-foreground">
                      <ShieldCheck className="h-3.5 w-3.5 text-rose-500" /> Administrator Profiles
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                      <Lock className="h-3 w-3" /> Password Protected
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {DEMO_ACCOUNTS.filter((a) => a.category === "admin").map((account) => {
                      return (
                        <div
                          key={account.email}
                          className="p-3 rounded-xl border border-border/70 bg-card hover:bg-accent/40 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-foreground">{account.name}</span>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${account.badgeColor}`}>
                                {account.roleLabel}
                              </span>
                              <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                <Lock className="h-2.5 w-2.5" />
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1 text-xs">
                            <div className="flex items-center justify-between text-muted-foreground bg-muted/40 px-2 py-1 rounded-md">
                              <span className="font-mono text-[11px] truncate">{account.email}</span>
                              <button
                                type="button"
                                title="Copy Email"
                                onClick={() => copyToClipboard(account.email, `email-${account.email}`)}
                                className="text-muted-foreground hover:text-foreground transition-colors ml-1"
                              >
                                {copiedKey === `email-${account.email}` ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>

                            <div className="flex items-center justify-between text-muted-foreground bg-muted/40 px-2 py-1 rounded-md">
                              <span className="text-[11px]">
                                Password: <code className="font-mono font-bold text-foreground">{account.password}</code>
                              </span>
                              <button
                                type="button"
                                title="Copy Password"
                                onClick={() => copyToClipboard(account.password, `pwd-${account.email}`)}
                                className="text-muted-foreground hover:text-foreground transition-colors ml-1"
                              >
                                {copiedKey === `pwd-${account.email}` ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => openDemoModal(account)}
                            disabled={loading || verifyingDemo}
                            className="w-full py-2 px-2.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 border border-amber-500/20 active:scale-[0.98]"
                          >
                            <Lock className="h-3.5 w-3.5" />
                            <span>Unlock & Sign In</span>
                            <ArrowRight className="h-3 w-3 ml-auto opacity-60" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* BOX 2: CLERK SSO SIGN-IN BOX                                              */}
          {/* ========================================================================= */}
          {(viewMode === "both" || viewMode === "clerk") && (
            <div
              className={`bg-card rounded-2xl border border-border/80 shadow-xl p-5 sm:p-7 flex flex-col items-center justify-center ${
                viewMode === "both" ? "lg:col-span-5" : "w-full"
              }`}
            >
              <div className="w-full text-center pb-4 mb-2 border-b border-border/60">
                <h2 className="text-lg font-bold text-foreground">Personal Sign In</h2>
                <p className="text-xs text-muted-foreground">Sign in with your email or social account via Clerk SSO</p>
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
                        card: "shadow-none border-0 bg-transparent p-0 w-full",
                        formButtonPrimary:
                          "bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl py-3 shadow-md shadow-emerald-600/20 transition-all",
                        footerActionLink: "text-emerald-600 dark:text-emerald-400 hover:underline font-semibold",
                        formFieldInput:
                          "rounded-xl border-input bg-background focus:ring-emerald-500 focus:border-emerald-500 py-2.5",
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
          )}
        </div>
      </main>

      {/* Password Protection Dialog for Demo Accounts */}
      <Dialog open={isDemoDialogOpen} onOpenChange={setIsDemoDialogOpen}>
        <DialogContent className="sm:max-w-md p-6 bg-card border border-border/80 rounded-2xl shadow-2xl">
          {selectedDemoUser && (
            <form onSubmit={handleDemoSubmit} className="space-y-4">
              <DialogHeader className="text-left space-y-2">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold text-foreground">
                      Demo Account Verification
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground">
                      Enter the account password to unlock
                    </p>
                  </div>
                </div>
                <DialogDescription className="text-xs text-muted-foreground pt-1">
                  You are unlocking <strong className="text-foreground font-semibold">{selectedDemoUser.name}</strong> ({selectedDemoUser.email}).
                </DialogDescription>
              </DialogHeader>

              {demoError && (
                <div className="text-xs text-destructive font-medium rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                  {demoError}
                </div>
              )}

              {/* Password Helper with 1-click Auto-Fill */}
              <div className="flex items-center justify-between text-xs bg-muted/60 p-2.5 rounded-xl border border-border/60">
                <span className="text-muted-foreground text-xs">
                  Password: <code className="font-mono font-bold text-foreground">{selectedDemoUser.password}</code>
                </span>
                <button
                  type="button"
                  onClick={() => setDemoPassword(selectedDemoUser.password)}
                  className="text-[11px] font-bold text-primary hover:underline px-2.5 py-1 bg-primary/10 rounded-md transition-colors"
                >
                  Auto-Fill Password
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5" htmlFor="demo-modal-password">
                  <KeyRound className="h-3.5 w-3.5 text-primary" /> Account Password
                </label>
                <div className="relative">
                  <input
                    id="demo-modal-password"
                    type={showDemoPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={demoPassword}
                    onChange={(e) => {
                      setDemoPassword(e.target.value)
                      if (demoError) setDemoError("")
                    }}
                    autoFocus
                    required
                    className="w-full px-3.5 py-2.5 pr-10 text-sm rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDemoPassword(!showDemoPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showDemoPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-2 pt-3 border-t border-border/60 -mx-6 -mb-6 p-4 bg-muted/30 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setIsDemoDialogOpen(false)}
                  disabled={verifyingDemo}
                  className="py-2 px-4 rounded-xl border border-input bg-background hover:bg-accent text-foreground text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifyingDemo || !demoPassword}
                  className="py-2 px-5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {verifyingDemo ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verifying...
                    </>
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5" />
                      <span>Unlock & Sign In</span>
                    </>
                  )}
                </button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

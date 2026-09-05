"use client"

import { useState, useEffect } from "react"
import { signIn, getSession } from "next-auth/react"
import { BackButton } from "@/components/BackButton"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { User, Stethoscope, ShieldCheck, Lock, Eye, EyeOff, Loader2, Mail, CheckCircle2, RefreshCw, Sparkles, ArrowRight } from "lucide-react"
import { QurixLogo } from "@/components/QurixLogo"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface DemoAccount {
  name: string
  email: string
  role: string
  roleUrl: string
  color?: string
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"login" | "otp" | "demo">("login")

  // Email OTP Login states
  const [otpEmail, setOtpEmail] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [otpStep, setOtpStep] = useState<"EMAIL" | "VERIFY">("EMAIL")
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpError, setOtpError] = useState("")
  const [resendTimer, setResendTimer] = useState(0)
  const [resending, setResending] = useState(false)
  const [devOtp, setDevOtp] = useState("")

  // Magic Link fallback states
  const [magicSent, setMagicSent] = useState(false)
  const [magicLoading, setMagicLoading] = useState(false)

  // Demo password protection states
  const [selectedDemoUser, setSelectedDemoUser] = useState<DemoAccount | null>(null)
  const [isDemoDialogOpen, setIsDemoDialogOpen] = useState(false)
  const [demoPassword, setDemoPassword] = useState("")
  const [demoError, setDemoError] = useState("")
  const [showDemoPassword, setShowDemoPassword] = useState(false)
  const [verifyingDemo, setVerifyingDemo] = useState(false)

  // Resend countdown timer effect
  useEffect(() => {
    if (resendTimer <= 0) return
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [resendTimer])

  const [signingInDemoEmail, setSigningInDemoEmail] = useState<string | null>(null)

  const redirectByRole = () => {
    window.location.href = "/dashboard"
  }

  const handleDirectDemoSignIn = async (account: DemoAccount) => {
    setSigningInDemoEmail(account.email)
    setError("")
    try {
      const pwd = account.email.includes("teamqurix.com") ? "BB@1234@QURIX" : "demo1234"
      const res = await signIn("credentials", {
        email: account.email,
        password: pwd,
        redirect: false,
      })

      if (res?.error) {
        setError("Sign in error: " + res.error)
        setSigningInDemoEmail(null)
      } else {
        window.location.href = account.roleUrl
      }
    } catch (err: any) {
      setError(err?.message || "Sign in failed")
      setSigningInDemoEmail(null)
    }
  }

  // 1. Password-based Login
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    const res = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
    })

    if (res?.error) {
      if (res.error === "CredentialsSignin") {
        setError("Invalid email or password")
      } else {
        setError(res.error)
      }
      setLoading(false)
    } else {
      await redirectByRole()
    }
  }

  // 2. Send Sign-In OTP to Email
  const onSendSignInOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otpEmail.trim()) return

    setOtpLoading(true)
    setOtpError("")

    try {
      const res = await fetch("/api/auth/send-signin-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otpEmail.trim().toLowerCase() }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.details?.[0]?.message || data.error || "Failed to send verification code")
      }

      setOtpStep("VERIFY")
      setResendTimer(60)
      setOtpCode("")
      if (data.devOtp) {
        setDevOtp(data.devOtp)
      } else {
        setDevOtp("")
      }
    } catch (err: any) {
      setOtpError(err.message)
    } finally {
      setOtpLoading(false)
    }
  }

  // Resend Sign-In OTP
  const onResendSignInOtp = async () => {
    if (resendTimer > 0 || resending) return
    setResending(true)
    setOtpError("")

    try {
      const res = await fetch("/api/auth/send-signin-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otpEmail.trim().toLowerCase() }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.details?.[0]?.message || data.error || "Failed to resend code")
      }

      setResendTimer(60)
      if (data.devOtp) {
        setDevOtp(data.devOtp)
      }
    } catch (err: any) {
      setOtpError(err.message)
    } finally {
      setResending(false)
    }
  }

  // 3. Verify OTP and Sign In
  const onVerifySignInOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otpCode || otpCode.trim().length !== 6) {
      setOtpError("Please enter the 6-digit verification code.")
      return
    }

    setOtpLoading(true)
    setOtpError("")

    const res = await signIn("credentials", {
      email: otpEmail.trim().toLowerCase(),
      otp: otpCode.trim(),
      redirect: false,
    })

    if (res?.error) {
      setOtpError(res.error === "CredentialsSignin" ? "Invalid or expired verification code." : res.error)
      setOtpLoading(false)
    } else {
      await redirectByRole()
    }
  }

  // 4. Fallback Magic Link Sign-In
  const onSendMagicLink = async () => {
    if (!otpEmail.trim()) return
    setMagicLoading(true)
    setOtpError("")

    try {
      const res = await signIn("email", {
        email: otpEmail.trim().toLowerCase(),
        redirect: false,
        callbackUrl: "/patient/dashboard",
      })

      if (res?.error) {
        setOtpError("Failed to send magic link. Please try again.")
      } else {
        setMagicSent(true)
      }
    } catch (err) {
      setOtpError("An unexpected error occurred. Please try again.")
    } finally {
      setMagicLoading(false)
    }
  }

  // Demo user handlers
  const openDemoModal = (account: DemoAccount) => {
    setSelectedDemoUser(account)
    setDemoPassword("")
    setDemoError("")
    setShowDemoPassword(false)
    setIsDemoDialogOpen(true)
  }

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDemoUser) return

    if (!demoPassword.trim()) {
      setDemoError("Please enter the password.")
      return
    }

    setVerifyingDemo(true)
    setDemoError("")

    let res = await signIn("credentials", {
      email: selectedDemoUser.email,
      password: demoPassword,
      redirect: false,
    })

    if (res?.error) {
      try {
        await fetch("/api/setup-db")
        res = await signIn("credentials", {
          email: selectedDemoUser.email,
          password: demoPassword,
          redirect: false,
        })
      } catch (e) {
        console.error("Auto-seed retry error:", e)
      }
    }

    if (res?.error) {
      setDemoError("Incorrect password. Please enter the valid account password.")
      setVerifyingDemo(false)
    } else {
      setIsDemoDialogOpen(false)
      window.location.href = selectedDemoUser.roleUrl
    }
  }

  const patients: DemoAccount[] = [
    { name: "Priya Sharma", email: "priya@demo.com", role: "Patient", roleUrl: "/patient/dashboard", color: "rose" },
    { name: "Sankalp Verma", email: "sankalp@demo.com", role: "Patient", roleUrl: "/patient/dashboard", color: "blue" },
    { name: "Utkarsh Singh", email: "utkarsh@demo.com", role: "Patient", roleUrl: "/patient/dashboard", color: "indigo" },
    { name: "Tejas Vishwakarma", email: "tejas@demo.com", role: "Patient", roleUrl: "/patient/dashboard", color: "cyan" },
  ]

  const colorMap: Record<string, string> = {
    rose: "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800",
    blue: "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
    indigo: "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800",
    cyan: "bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800",
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-md absolute top-4 left-4">
        <BackButton />
      </div>
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center mb-4">
          <Link href="/" className="flex items-center group transition-transform hover:scale-105">
            <QurixLogo className="h-10 w-auto" />
          </Link>
        </div>

        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold tracking-tight">
              Sign in to QURIX
            </CardTitle>
            <CardDescription>
              Choose your preferred sign-in method
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Tab Selector */}
            <div className="flex bg-muted p-1 rounded-lg w-full mb-6">
              <button 
                type="button"
                onClick={() => setActiveTab("login")}
                className={`flex-1 text-xs sm:text-sm font-medium py-1.5 rounded-md transition-all ${activeTab === "login" ? "bg-background text-foreground shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"}`}
              >
                Password
              </button>
              <button 
                type="button"
                onClick={() => setActiveTab("otp")}
                className={`flex-1 text-xs sm:text-sm font-medium py-1.5 rounded-md transition-all ${activeTab === "otp" ? "bg-background text-foreground shadow-sm font-semibold text-emerald-600 dark:text-emerald-400" : "text-muted-foreground hover:text-foreground"}`}
              >
                Email OTP
              </button>
              <button 
                type="button"
                onClick={() => setActiveTab("demo")}
                className={`flex-1 text-xs sm:text-sm font-medium py-1.5 rounded-md transition-all ${activeTab === "demo" ? "bg-background text-foreground shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"}`}
              >
                Demo Users
              </button>
            </div>

            {/* TAB 1: Password Login */}
            {activeTab === "login" && (
              <form onSubmit={onSubmit} className="space-y-4">
                {error && (
                  <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none" htmlFor="email">Email</label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium leading-none" htmlFor="password">Password</label>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing In...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            )}

            {/* TAB 2: Email OTP Login */}
            {activeTab === "otp" && (
              <div className="space-y-4">
                {otpError && (
                  <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
                    {otpError}
                  </div>
                )}

                {otpStep === "EMAIL" ? (
                  <form onSubmit={onSendSignInOtp} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium leading-none" htmlFor="otp-email">Email Address</label>
                      <div className="relative">
                        <Input
                          id="otp-email"
                          type="email"
                          placeholder="name@example.com"
                          value={otpEmail}
                          onChange={(e) => setOtpEmail(e.target.value)}
                          required
                          disabled={otpLoading}
                          className="pl-9"
                        />
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        We will send a 6-digit verification code to this email.
                      </p>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                      disabled={otpLoading || !otpEmail.trim()}
                    >
                      {otpLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending Code...
                        </>
                      ) : (
                        "Send Verification Code"
                      )}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={onVerifySignInOtp} className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium leading-none" htmlFor="otp-code">Enter 6-Digit Code</label>
                        <button
                          type="button"
                          onClick={() => setOtpStep("EMAIL")}
                          className="text-xs text-primary hover:underline"
                        >
                          Change Email
                        </button>
                      </div>

                      <Input
                        id="otp-code"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="123456"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                        required
                        disabled={otpLoading}
                        className="text-center tracking-widest text-lg font-mono font-bold"
                        autoFocus
                      />

                      {devOtp && (
                        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs p-2.5 rounded-md flex items-center justify-between">
                          <span>Demo mode active. Code: <strong>{devOtp}</strong></span>
                          <button
                            type="button"
                            onClick={() => setOtpCode(devOtp)}
                            className="text-[11px] bg-amber-500/20 hover:bg-amber-500/30 px-2 py-0.5 rounded font-semibold transition-colors"
                          >
                            Auto-Fill
                          </button>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                        <span>Didn&apos;t receive it?</span>
                        <button
                          type="button"
                          onClick={onResendSignInOtp}
                          disabled={resendTimer > 0 || resending}
                          className="text-primary hover:underline font-medium disabled:opacity-50 disabled:no-underline flex items-center gap-1"
                        >
                          {resending ? (
                            <>
                              <RefreshCw className="h-3 w-3 animate-spin" /> Resending...
                            </>
                          ) : resendTimer > 0 ? (
                            `Resend in ${resendTimer}s`
                          ) : (
                            "Resend Code"
                          )}
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                      disabled={otpLoading || otpCode.length !== 6}
                    >
                      {otpLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" /> Verify & Sign In
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </div>
            )}

            {/* TAB 3: Demo Accounts */}
            {activeTab === "demo" && (
              <div className="space-y-6">
                {/* Patient Demo Accounts */}
                <div className="w-full space-y-2">
                  <p className="text-xs text-muted-foreground font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-emerald-600" /> Patients
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <Sparkles className="h-3 w-3" /> 1-Click Access
                    </span>
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {patients.map((p) => {
                      const isSigningIn = signingInDemoEmail === p.email
                      return (
                        <Button
                          key={p.email}
                          type="button"
                          variant="outline"
                          className={`text-xs py-2.5 h-auto flex items-center justify-between px-3 transition-all ${p.color ? colorMap[p.color] : ""}`}
                          onClick={() => handleDirectDemoSignIn(p)}
                          disabled={loading || verifyingDemo || !!signingInDemoEmail}
                        >
                          {isSigningIn ? (
                            <span className="flex items-center text-xs font-semibold">
                              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Opening...
                            </span>
                          ) : (
                            <>
                              <span className="truncate font-medium">{p.name}</span>
                              <ArrowRight className="h-3 w-3 opacity-60 ml-1 shrink-0" />
                            </>
                          )}
                        </Button>
                      )
                    })}
                  </div>
                </div>

                {/* Doctor Demo Account */}
                <div className="w-full space-y-2">
                  <p className="text-xs text-muted-foreground font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Stethoscope className="h-3.5 w-3.5 text-blue-600" /> Doctor
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                      <Sparkles className="h-3 w-3" /> 1-Click Access
                    </span>
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 flex items-center justify-between px-3 py-2.5 h-auto transition-all"
                    onClick={() => handleDirectDemoSignIn({
                      name: "Dr. Rahul Verma",
                      email: "doctor@demo.com",
                      role: "Doctor",
                      roleUrl: "/doctor/dashboard"
                    })}
                    disabled={loading || verifyingDemo || !!signingInDemoEmail}
                  >
                    {signingInDemoEmail === "doctor@demo.com" ? (
                      <span className="flex items-center text-xs font-semibold">
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Opening Doctor Dashboard...
                      </span>
                    ) : (
                      <>
                        <span className="font-semibold">Dr. Rahul Verma</span>
                        <ArrowRight className="h-3.5 w-3.5 opacity-60 shrink-0" />
                      </>
                    )}
                  </Button>
                </div>

                {/* Admin Demo Account */}
                <div className="w-full space-y-2">
                  <p className="text-xs text-muted-foreground font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-rose-600" /> Admin
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                      <Sparkles className="h-3 w-3" /> 1-Click Access
                    </span>
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800 flex items-center justify-between px-3 py-2.5 h-auto transition-all"
                    onClick={() => handleDirectDemoSignIn({
                      name: "Super Admin",
                      email: "admin@teamqurix.com",
                      role: "Administrator",
                      roleUrl: "/admin"
                    })}
                    disabled={loading || verifyingDemo || !!signingInDemoEmail}
                  >
                    {signingInDemoEmail === "admin@teamqurix.com" ? (
                      <span className="flex items-center text-xs font-semibold">
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Opening Admin...
                      </span>
                    ) : (
                      <>
                        <span className="font-semibold">Super Admin</span>
                        <ArrowRight className="h-3.5 w-3.5 opacity-60 shrink-0" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-sm text-center text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-primary hover:underline font-medium">
            Sign Up with Email Verification
          </Link>
        </div>
      </div>

      {/* Password Protection Dialog for Demo Accounts */}
      <Dialog open={isDemoDialogOpen} onOpenChange={setIsDemoDialogOpen}>
        <DialogContent className="sm:max-w-md">
          {selectedDemoUser && (
            <form onSubmit={handleDemoSubmit} className="space-y-4">
              <DialogHeader className="text-left space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-primary/10 text-primary">
                    <Lock className="h-4 w-4" />
                  </div>
                  <DialogTitle>Demo Account Verification</DialogTitle>
                </div>
                <DialogDescription>
                  Enter the password to sign in as <strong className="text-foreground">{selectedDemoUser.name}</strong> ({selectedDemoUser.email}).
                </DialogDescription>
              </DialogHeader>

              {demoError && (
                <div className="text-xs text-destructive font-medium rounded-md bg-destructive/10 p-2.5">
                  {demoError}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="demo-password">
                  Account Password
                </label>
                <div className="relative">
                  <Input
                    id="demo-password"
                    type={showDemoPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={demoPassword}
                    onChange={(e) => {
                      setDemoPassword(e.target.value)
                      if (demoError) setDemoError("")
                    }}
                    autoFocus
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDemoPassword(!showDemoPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    tabIndex={-1}
                  >
                    {showDemoPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDemoDialogOpen(false)}
                  disabled={verifyingDemo}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={verifyingDemo}
                  className="min-w-[120px]"
                >
                  {verifyingDemo ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...
                    </>
                  ) : (
                    "Unlock & Sign in"
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

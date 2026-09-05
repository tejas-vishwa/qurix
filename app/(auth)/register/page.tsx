"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import Link from "next/link"
import { QurixLogo } from "@/components/QurixLogo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { BackButton } from "@/components/BackButton"
import { Mail, CheckCircle2, ArrowRight, Loader2, RefreshCw, User, Stethoscope } from "lucide-react"

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [num1, setNum1] = useState(0)
  const [num2, setNum2] = useState(0)

  // Registration step state: "FORM" -> "OTP"
  const [step, setStep] = useState<"FORM" | "OTP">("FORM")

  // Form values
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("PATIENT")
  const [mathAnswer, setMathAnswer] = useState("")
  const [botCheck, setBotCheck] = useState("")

  // OTP state
  const [otp, setOtp] = useState("")
  const [resendTimer, setResendTimer] = useState(0)
  const [resending, setResending] = useState(false)
  const [devOtp, setDevOtp] = useState("")

  useEffect(() => {
    setNum1(Math.floor(Math.random() * 10) + 1)
    setNum2(Math.floor(Math.random() * 10) + 1)
  }, [])

  // Timer countdown effect for OTP resend
  useEffect(() => {
    if (resendTimer <= 0) return
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [resendTimer])

  // Step 1: Send OTP to email
  async function handleSendOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (botCheck) {
      setError("Bot activity detected.")
      setLoading(false)
      return
    }

    if (name.trim().length < 2) {
      setError("Name must be at least 2 characters.")
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.")
      setLoading(false)
      return
    }

    if (parseInt(mathAnswer) !== num1 + num2) {
      setError("Incorrect math answer. Please try again.")
      setLoading(false)
      return
    }

    try {
      const res = await fetch("/api/auth/send-signup-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.details?.[0]?.message || data.error || "Failed to send verification code")
      }

      setStep("OTP")
      setResendTimer(60)
      setOtp("")
      if (data.devOtp) {
        setDevOtp(data.devOtp)
      } else {
        setDevOtp("")
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Resend OTP
  async function handleResendOtp() {
    if (resendTimer > 0 || resending) return
    setResending(true)
    setError("")

    try {
      const res = await fetch("/api/auth/send-signup-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to resend verification code")
      }

      setResendTimer(60)
      if (data.devOtp) {
        setDevOtp(data.devOtp)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setResending(false)
    }
  }

  // Step 2: Verify OTP & Complete Registration
  async function handleVerifyOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!otp || otp.trim().length !== 6) {
      setError("Please enter the 6-digit verification code.")
      return
    }

    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
          otp: otp.trim(),
          botCheck,
          mathAnswer: parseInt(mathAnswer),
          num1,
          num2,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.details?.[0]?.message || data.error || "Registration failed")
      }

      // Automatically sign the user in with Auth.js / NextAuth
      const signInRes = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      })

      if (!signInRes?.error) {
        window.location.href = role === "DOCTOR" ? "/doctor/dashboard" : "/patient/dashboard"
      } else {
        window.location.href = "/login?registered=true"
      }
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-md absolute top-4 left-4">
        <BackButton />
      </div>
      <div className="w-full max-w-md space-y-8">
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center group transition-transform hover:scale-105">
            <QurixLogo className="h-10 w-auto" />
          </Link>
        </div>

        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
          {step === "FORM" ? (
            <>
              <CardHeader className="space-y-1 text-center">
                <CardTitle className="text-2xl font-bold tracking-tight">
                  Create an Account
                </CardTitle>
                <CardDescription>
                  Enter your details to register for a new account
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSendOtp}>
                <CardContent className="space-y-4">
                  {error && (
                    <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
                      {error}
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none" htmlFor="name">Full Name</label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none" htmlFor="email">Email</label>
                    <Input
                      id="email"
                      name="email"
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
                      <span className="text-[11px] text-muted-foreground">Min. 6 characters</span>
                    </div>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="ΓÇóΓÇóΓÇóΓÇóΓÇóΓÇóΓÇóΓÇó"
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">I am registering as</label>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => setRole("PATIENT")}
                        className={`flex flex-col items-center justify-center p-3.5 rounded-xl border-2 transition-all ${
                          role === "PATIENT"
                            ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 shadow-sm"
                            : "border-border hover:border-muted-foreground/30 text-muted-foreground"
                        }`}
                        disabled={loading}
                      >
                        <User className="h-5 w-5 mb-1 text-emerald-600" />
                        <span className="font-semibold text-sm">Patient</span>
                        <span className="text-[10px] text-muted-foreground mt-0.5">Track personal health</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRole("DOCTOR")}
                        className={`flex flex-col items-center justify-center p-3.5 rounded-xl border-2 transition-all ${
                          role === "DOCTOR"
                            ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 shadow-sm"
                            : "border-border hover:border-muted-foreground/30 text-muted-foreground"
                        }`}
                        disabled={loading}
                      >
                        <Stethoscope className="h-5 w-5 mb-1 text-blue-600" />
                        <span className="font-semibold text-sm">Doctor</span>
                        <span className="text-[10px] text-muted-foreground mt-0.5">Manage patient queue</span>
                      </button>
                    </div>
                  </div>

                  {/* Terms & Conditions */}
                  <div className="flex items-start space-x-2 pt-2 pb-2">
                    <input
                      type="checkbox"
                      id="terms"
                      name="terms"
                      required
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      disabled={loading}
                    />
                    <label htmlFor="terms" className="text-sm text-gray-600 dark:text-gray-400">
                      I agree to the <Link href="/terms" className="text-primary hover:underline">Terms & Conditions</Link>, including the AI Disclaimer and Data Privacy Policy.
                    </label>
                  </div>

                  {/* Bot Verification: Honeypot */}
                  <div className="opacity-0 absolute -z-10 h-0 w-0 overflow-hidden" aria-hidden="true">
                    <label htmlFor="bot_check">Leave this field empty if you are human</label>
                    <Input
                      id="bot_check"
                      name="bot_check"
                      type="text"
                      value={botCheck}
                      onChange={(e) => setBotCheck(e.target.value)}
                      tabIndex={-1}
                      autoComplete="off"
                    />
                  </div>

                  {/* Bot Verification: Math Challenge */}
                  <div className="space-y-2 p-3 bg-slate-100 dark:bg-slate-900 rounded-md border">
                    <label className="text-sm font-medium leading-none" htmlFor="math_answer">
                      Security Check: What is {num1} + {num2}?
                    </label>
                    <Input
                      id="math_answer"
                      name="math_answer"
                      type="number"
                      placeholder="Enter answer"
                      value={mathAnswer}
                      onChange={(e) => setMathAnswer(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4">
                  <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending Verification Code...
                      </>
                    ) : (
                      <>
                        Continue with Email OTP <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                  <div className="text-sm text-center text-muted-foreground mt-4">
                    Already have an account?{" "}
                    <Link href="/login" className="text-primary hover:underline">
                      Sign In
                    </Link>
                  </div>
                </CardFooter>
              </form>
            </>
          ) : (
            <>
              {/* Step 2: OTP Verification */}
              <CardHeader className="space-y-1 text-center">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Mail className="h-6 w-6" />
                </div>
                <CardTitle className="text-2xl font-bold tracking-tight">
                  Verify Your Email
                </CardTitle>
                <CardDescription className="text-sm">
                  We sent a 6-digit verification code to <br />
                  <strong className="text-foreground font-semibold">{email}</strong>
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleVerifyOtp}>
                <CardContent className="space-y-4">
                  {error && (
                    <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md text-center">
                      {error}
                    </div>
                  )}

                  {devOtp && (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs p-3 rounded-xl text-center">
                      <p className="font-semibold mb-1">Development / Demo Code:</p>
                      <span className="font-mono font-bold text-base tracking-widest bg-background/80 px-3 py-1 rounded-md border border-emerald-500/30">{devOtp}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none text-center block" htmlFor="otp">
                      Enter 6-Digit OTP
                    </label>
                    <Input
                      id="otp"
                      name="otp"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      placeholder="ΓÇó ΓÇó ΓÇó ΓÇó ΓÇó ΓÇó"
                      value={otp}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "")
                        setOtp(val)
                        if (error) setError("")
                      }}
                      autoFocus
                      required
                      disabled={loading}
                      className="text-center text-2xl font-mono tracking-[0.5em] py-6 font-bold"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setStep("FORM")
                        setError("")
                      }}
                      className="hover:underline text-muted-foreground hover:text-foreground"
                    >
                      Change Email
                    </button>

                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resendTimer > 0 || resending}
                      className="text-emerald-600 hover:text-emerald-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      {resending ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" /> Sending...
                        </>
                      ) : resendTimer > 0 ? (
                        `Resend code in ${resendTimer}s`
                      ) : (
                        <>
                          <RefreshCw className="h-3 w-3" /> Resend Code
                        </>
                      )}
                    </button>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col space-y-3">
                  <Button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={loading || otp.length !== 6}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying & Creating Account...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Complete Registration
                      </>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

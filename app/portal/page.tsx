import Link from "next/link"
import { QurixLogo } from "@/components/QurixLogo"
import { Activity, Stethoscope, ArrowRight, ShieldCheck } from "lucide-react"

export default function PortalSelectPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-teal-500/10 via-background to-emerald-500/5 px-4">
      {/* Logo */}
      <div className="mb-10 flex flex-col items-center gap-3">
        <QurixLogo className="h-10 w-auto" />
        <p className="text-muted-foreground text-sm text-center max-w-xs">
          Choose your portal to continue
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-2xl">

        {/* Patient Portal */}
        <Link
          href="/patient/dashboard"
          className="group relative flex flex-col items-start gap-5 rounded-2xl border border-border bg-card p-7 text-left shadow-sm hover:shadow-xl hover:border-emerald-500/50 transition-all duration-300 hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 shadow-sm group-hover:scale-110 transition-transform duration-300">
            <Activity className="h-7 w-7" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-foreground">Patient Portal</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              View your health dashboard, upload lab reports, track biomarker trends, and manage appointments.
            </p>
          </div>

          <ul className="space-y-1.5 text-xs text-muted-foreground">
            {["Health dashboard & alerts", "Lab report upload & trends", "Book appointments", "Share access with your doctor"].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          <div className="mt-auto flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 group-hover:gap-3 transition-all duration-200">
            Enter Patient Portal
            <ArrowRight className="h-4 w-4" />
          </div>

          <div className="absolute inset-x-0 bottom-0 h-1 rounded-b-2xl bg-gradient-to-r from-teal-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </Link>

        {/* Doctor Portal */}
        <Link
          href="/doctor/dashboard"
          className="group relative flex flex-col items-start gap-5 rounded-2xl border border-border bg-card p-7 text-left shadow-sm hover:shadow-xl hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 shadow-sm group-hover:scale-110 transition-transform duration-300">
            <Stethoscope className="h-7 w-7" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-foreground">Doctor Portal</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Manage your patient queue, view patient records, access lab data, and run video consultations.
            </p>
          </div>

          <ul className="space-y-1.5 text-xs text-muted-foreground">
            {["Live patient queue & QR booking", "Access patient lab history", "Video consultations", "Appointment management"].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          <div className="mt-auto flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 group-hover:gap-3 transition-all duration-200">
            Enter Doctor Portal
            <ArrowRight className="h-4 w-4" />
          </div>

          <div className="absolute inset-x-0 bottom-0 h-1 rounded-b-2xl bg-gradient-to-r from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </Link>
      </div>

      <p className="mt-8 text-xs text-muted-foreground text-center">
        Secured by{" "}
        <span className="font-semibold text-foreground">QURIX</span> &middot; Your data is encrypted and private
      </p>
    </div>
  )
}

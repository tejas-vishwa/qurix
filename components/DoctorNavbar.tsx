"use client"

import { useState } from "react"
import { signOut as nextAuthSignOut } from "next-auth/react"
import { useClerk, UserButton } from "@clerk/nextjs"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, LogOut, Menu, X, KeyRound, ChevronRight, Stethoscope } from "lucide-react"
import { QurixLogo } from "@/components/QurixLogo"
import { ThemeToggle } from "@/components/ThemeToggle"

export function DoctorNavbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const { signOut: clerkSignOut } = useClerk()

  const handleSignOut = async () => {
    try {
      await clerkSignOut()
    } catch {}
    try {
      await nextAuthSignOut({ callbackUrl: '/login' })
    } catch {}
    window.location.href = '/login'
  }

  const navItems = [
    { name: "Dashboard", href: "/doctor/dashboard", icon: LayoutDashboard, desc: "Overview & metrics" },
    { name: "Patient Access Code", href: "/doctor/access", icon: KeyRound, desc: "Enter 6-digit PIN" },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-md">
      <div className="container flex h-16 max-w-7xl mx-auto items-center justify-between px-4">
        <Link href="/" className="flex items-center group transition-transform hover:scale-105">
          <QurixLogo className="h-7 md:h-8 w-auto" showTagline={true} />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6 ml-6">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors hover:text-emerald-600 flex items-center ${
                  isActive ? "text-emerald-600 font-semibold" : "text-muted-foreground"
                }`}
              >
                <Icon className="mr-2 h-4 w-4" /> {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Desktop Controls */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          <UserButton afterSignOutUrl="/login" />
          <button
            onClick={handleSignOut}
            className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center border-l border-border pl-3"
          >
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </button>
        </div>

        {/* Mobile Right Controls & Sleek Theme-Blended Toggle */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="h-10 w-10 rounded-full flex items-center justify-center border border-input bg-background hover:bg-accent text-foreground transition-all duration-200 active:scale-95 shadow-sm focus:outline-none"
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5 text-emerald-600 dark:text-emerald-400 transition-transform duration-200 rotate-90" />
            ) : (
              <Menu className="h-5 w-5 text-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* Full-Screen Mobile Menu Drawer Overlay (Seamless Theme Blending) */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 w-full h-full min-h-screen z-[99999] bg-background text-foreground p-6 flex flex-col justify-between overflow-y-auto animate-in fade-in duration-200">
          <div className="space-y-6">
            {/* Top Bar inside Full Screen Overlay */}
            <div className="flex items-center justify-between pb-4 border-b border-border/60">
              <QurixLogo className="h-8 w-auto" showTagline={true} />
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-label="Close menu"
                  className="h-10 w-10 rounded-full flex items-center justify-center border border-input bg-background hover:bg-accent text-foreground active:scale-95 transition-all focus:outline-none shadow-sm"
                >
                  <X className="h-5 w-5 text-emerald-600 dark:text-emerald-400 rotate-90 transition-transform" />
                </button>
              </div>
            </div>

            {/* Header Badge Card */}
            <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <Stethoscope className="h-3.5 w-3.5" /> Doctor Workstation
              </div>
              <h2 className="text-xl font-extrabold text-foreground mt-2">Clinical Portal</h2>
            </div>

            {/* Navigation Cards */}
            <nav className="flex flex-col space-y-3">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 shadow-sm ${
                      isActive
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-semibold"
                        : "bg-card border-border/70 text-card-foreground hover:bg-accent/60"
                    }`}
                  >
                    <div className="flex items-center space-x-3.5">
                      <div className={`p-2.5 rounded-xl ${isActive ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-bold text-base text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground font-medium">{item.desc}</p>
                      </div>
                    </div>
                    <ChevronRight className={`h-5 w-5 ${isActive ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`} />
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Sign Out Button */}
          <div className="pt-6 border-t border-border/60 mt-6">
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                signOut({ callbackUrl: '/login' });
              }}
              className="flex w-full items-center justify-center p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive font-bold hover:bg-destructive/20 transition-all text-base shadow-sm"
            >
              <LogOut className="mr-2 h-5 w-5" /> Sign out
            </button>
          </div>
        </div>
      )}
    </header>
  )
}

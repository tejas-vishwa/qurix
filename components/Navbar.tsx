"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X, ChevronRight, Home as HomeIcon, Users, Stethoscope, TestTube } from "lucide-react"
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs"
import { Button } from "./ui/button"
import { QurixLogo } from "./QurixLogo"
import { ThemeToggle } from "./ThemeToggle"

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const publicLinks = [
    { name: "Home", href: "/", icon: HomeIcon, desc: "Overview & features" },
    { name: "For Patients", href: "/patients", icon: Users, desc: "Track lab trends" },
    { name: "For Doctors", href: "/doctors", icon: Stethoscope, desc: "Longitudinal data access" },
    { name: "For Labs", href: "/labs", icon: TestTube, desc: "Diagnostic partner sync" },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/20 glass-panel">
      <div className="container flex h-16 max-w-7xl mx-auto items-center justify-between px-4">
        <Link href="/" className="flex items-center group transition-transform hover:scale-105">
          <QurixLogo className="h-7 md:h-9 w-auto" showTagline={true} />
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-8 text-sm font-medium">
          <Link href="/patients" className="transition-colors text-muted-foreground hover:text-primary hover:scale-105">Patients</Link>
          <Link href="/doctors" className="transition-colors text-muted-foreground hover:text-primary hover:scale-105">Doctors</Link>
          <Link href="/labs" className="transition-colors text-muted-foreground hover:text-primary hover:scale-105">Labs</Link>
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center space-x-3">
          <ThemeToggle />
          <SignedOut>
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button className="shadow-lg shadow-primary/20 bg-emerald-600 hover:bg-emerald-700">Get Started</Button>
            </Link>
          </SignedOut>
          <SignedIn>
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="font-semibold border-emerald-600/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50">
                Dashboard
              </Button>
            </Link>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>

        {/* Mobile Header Controls */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
            className="h-10 w-10 rounded-full flex items-center justify-center border border-input bg-background hover:bg-accent text-foreground transition-all duration-200 active:scale-95 shadow-sm focus:outline-none"
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5 text-primary transition-transform duration-200 rotate-90" />
            ) : (
              <Menu className="h-5 w-5 text-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* Full-Screen Mobile Menu Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 w-full h-full min-h-screen z-[99999] bg-background text-foreground p-6 flex flex-col justify-between overflow-y-auto animate-in fade-in duration-200">
          <div className="space-y-6">
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
                  <X className="h-5 w-5 text-primary rotate-90 transition-transform" />
                </button>
              </div>
            </div>

            <nav className="flex flex-col space-y-3">
              {publicLinks.map((link) => {
                const Icon = link.icon
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/70 text-card-foreground hover:bg-accent/60 transition-all duration-200 shadow-sm"
                  >
                    <div className="flex items-center space-x-3.5">
                      <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-bold text-base text-foreground">{link.name}</p>
                        <p className="text-xs text-muted-foreground font-medium">{link.desc}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="border-t border-border/60 pt-6 mt-6 flex flex-col space-y-3">
            <SignedOut>
              <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full h-12 text-base font-bold justify-center rounded-2xl">
                  Sign In
                </Button>
              </Link>
              <Link href="/register" onClick={() => setIsMobileMenuOpen(false)}>
                <Button className="w-full h-12 text-base font-bold justify-center bg-emerald-600 hover:bg-emerald-700 shadow-lg rounded-2xl text-white">
                  Get Started Free
                </Button>
              </Link>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                <Button className="w-full h-12 text-base font-bold justify-center bg-emerald-600 hover:bg-emerald-700 shadow-lg rounded-2xl text-white">
                  Go to Dashboard
                </Button>
              </Link>
            </SignedIn>
          </div>
        </div>
      )}
    </header>
  )
}

"use client"

import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  resolvedTheme: "dark" | "light"
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "qurix-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>("system")
  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("light")

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")

    const applyTheme = (isDark: boolean) => {
      const root = window.document.documentElement
      if (isDark) {
        root.classList.add("dark")
        root.classList.remove("light")
        root.style.colorScheme = "dark"
        setResolvedTheme("dark")
      } else {
        root.classList.remove("dark")
        root.classList.remove("light")
        root.style.colorScheme = "light"
        setResolvedTheme("light")
      }
    }

    // Sync immediately with current system preference
    applyTheme(mediaQuery.matches)

    // Listen for OS / browser theme changes in real-time
    const handleChange = (e: MediaQueryListEvent) => applyTheme(e.matches)

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [])

  const value = {
    theme: "system" as Theme,
    resolvedTheme,
    setTheme: () => {
      // Device theme strictly rules
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}

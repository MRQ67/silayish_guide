"use client"

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react"

export type Theme = "light" | "dark" | "system"

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: "light" | "dark"
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const STORAGE_KEY = "ddu-theme"

function getStoredTheme(fallback: Theme): Theme {
  if (typeof window === "undefined") return fallback
  try {
    const val = localStorage.getItem(STORAGE_KEY) as Theme | null
    if (val && ["light", "dark", "system"].includes(val)) {
      return val
    }
  } catch {
    // ignore
  }
  return fallback
}

function getSystemDark(): boolean {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return false
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
}: {
  children: React.ReactNode
  defaultTheme?: Theme
}) {
  const [theme, setThemeState] = useState<Theme>(() =>
    getStoredTheme(defaultTheme)
  )

  const [systemDark, setSystemDark] = useState<boolean>(() => getSystemDark())

  // Listen to system color scheme changes via event callback
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return
    }
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = (e: MediaQueryListEvent) => {
      setSystemDark(e.matches)
    }
    mediaQuery.addEventListener("change", handler)
    return () => mediaQuery.removeEventListener("change", handler)
  }, [])

  const resolvedTheme: "light" | "dark" =
    theme === "system" ? (systemDark ? "dark" : "light") : theme

  // Synchronize effective theme with document.documentElement
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(resolvedTheme)
  }, [resolvedTheme])

  const setTheme = (nextTheme: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, nextTheme)
    } catch {
      // ignore
    }
    setThemeState(nextTheme)
  }

  const toggleTheme = () => {
    const next = resolvedTheme === "dark" ? "light" : "dark"
    setTheme(next)
  }

  return (
    <ThemeContext.Provider
      value={{ theme, resolvedTheme, setTheme, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}

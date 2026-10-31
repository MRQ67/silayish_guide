"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import type { Locale, TranslationDictionary } from "@/lib/i18n"
import { translations } from "@/lib/i18n"

interface LanguageContextValue {
  locale: Locale
  t: TranslationDictionary
  setLocale: (locale: Locale) => void
  toggleLocale: () => void
}

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined
)

const STORAGE_KEY = "ddu-locale"

function getStoredLocale(defaultLocale: Locale): Locale {
  if (typeof window === "undefined") return defaultLocale
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null
    if (stored === "en" || stored === "am") {
      return stored
    }
  } catch {
    // ignore
  }
  return defaultLocale
}

export function LanguageProvider({
  children,
  defaultLocale = "en",
}: {
  children: React.ReactNode
  defaultLocale?: Locale
}) {
  const [locale, setLocaleState] = useState<Locale>(() =>
    getStoredLocale(defaultLocale)
  )

  // Synchronize document.documentElement.lang attribute
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  // Listen for storage events across tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (
        e.key === STORAGE_KEY &&
        (e.newValue === "en" || e.newValue === "am")
      ) {
        setLocaleState(e.newValue)
      }
    }
    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [])

  const setLocale = (nextLocale: Locale) => {
    try {
      localStorage.setItem(STORAGE_KEY, nextLocale)
    } catch {
      // ignore
    }
    setLocaleState(nextLocale)
  }

  const toggleLocale = () => {
    setLocale(locale === "en" ? "am" : "en")
  }

  return (
    <LanguageContext.Provider
      value={{
        locale,
        t: translations[locale],
        setLocale,
        toggleLocale,
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}

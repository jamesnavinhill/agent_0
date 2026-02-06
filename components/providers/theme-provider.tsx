"use client"

import type { ReactNode } from "react"
import { createContext, useContext, useEffect, useState } from "react"

type Theme = "light" | "dark"

export interface AccentTokens {
  hue: number
  chroma: number
  lightness: number
}

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  accent: AccentTokens
  setAccent: (next: Partial<AccentTokens>) => void
  resetAccent: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const ACCENT_STORAGE_KEY = "agent-accent-tokens"
const LEGACY_HUE_STORAGE_KEY = "agent-accent-hue"
const DEFAULT_ACCENT: AccentTokens = {
  hue: 165,
  chroma: 0.15,
  lightness: 0.62,
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark")
  const [accent, setAccentState] = useState<AccentTokens>(DEFAULT_ACCENT)

  useEffect(() => {
    const savedTheme = localStorage.getItem("agent-theme") as Theme | null
    const savedAccent = localStorage.getItem(ACCENT_STORAGE_KEY)
    const legacyHue = localStorage.getItem(LEGACY_HUE_STORAGE_KEY)

    if (savedTheme) setTheme(savedTheme)

    if (savedAccent) {
      try {
        const parsed = JSON.parse(savedAccent) as Partial<AccentTokens>
        setAccentState({
          hue: clamp(Number(parsed.hue ?? DEFAULT_ACCENT.hue), 0, 360),
          chroma: clamp(Number(parsed.chroma ?? DEFAULT_ACCENT.chroma), 0, 0.37),
          lightness: clamp(Number(parsed.lightness ?? DEFAULT_ACCENT.lightness), 0, 1),
        })
        return
      } catch {
        // Fall through to legacy migration/default.
      }
    }

    if (legacyHue) {
      const parsedHue = Number(legacyHue)
      if (Number.isFinite(parsedHue)) {
        setAccentState((previous) => ({
          ...previous,
          hue: clamp(parsedHue, 0, 360),
        }))
      }
    }
  }, [])

  useEffect(() => {
    document.documentElement.classList.remove("light", "dark")
    document.documentElement.classList.add(theme)
    localStorage.setItem("agent-theme", theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.style.setProperty("--accent-hue", String(accent.hue))
    document.documentElement.style.setProperty("--accent-chroma", String(accent.chroma))
    document.documentElement.style.setProperty("--accent-lightness", String(accent.lightness))

    localStorage.setItem(ACCENT_STORAGE_KEY, JSON.stringify(accent))
    localStorage.removeItem(LEGACY_HUE_STORAGE_KEY)
  }, [accent])

  const setAccent = (next: Partial<AccentTokens>) => {
    setAccentState((previous) => ({
      hue:
        next.hue === undefined
          ? previous.hue
          : clamp(Math.round(next.hue), 0, 360),
      chroma:
        next.chroma === undefined
          ? previous.chroma
          : clamp(Number(next.chroma), 0, 0.37),
      lightness:
        next.lightness === undefined
          ? previous.lightness
          : clamp(Number(next.lightness), 0, 1),
    }))
  }

  const resetAccent = () => {
    setAccentState(DEFAULT_ACCENT)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, accent, setAccent, resetAccent }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error("useTheme must be used within ThemeProvider")
  return context
}

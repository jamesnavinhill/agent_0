"use client"

import type { ReactNode } from "react"
import { createContext, useContext, useEffect, useState } from "react"

type Theme = "light" | "dark"

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  accentHue: number
  setAccentHue: (hue: number) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark")
  const [accentHue, setAccentHue] = useState(165) // Default teal/cyan

  useEffect(() => {
    const savedTheme = localStorage.getItem("agent-theme") as Theme | null
    const savedHue = localStorage.getItem("agent-accent-hue")
    
    if (savedTheme) setTheme(savedTheme)
    if (savedHue) setAccentHue(Number(savedHue))
  }, [])

  useEffect(() => {
    document.documentElement.classList.remove("light", "dark")
    document.documentElement.classList.add(theme)
    localStorage.setItem("agent-theme", theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.style.setProperty("--accent-hue", String(accentHue))
    localStorage.setItem("agent-accent-hue", String(accentHue))
  }, [accentHue])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, accentHue, setAccentHue }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error("useTheme must be used within ThemeProvider")
  return context
}

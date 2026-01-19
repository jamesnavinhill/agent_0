"use client"

import { useState, useEffect, useCallback } from "react"

const SETTINGS_KEY = "agent_zero_settings"

export interface AgentSettings {
    apiKey: string
    model: "gemini-2.0-flash" | "gemini-2.0-pro"
    temperature: number
    schedulesEnabled: boolean
}

const defaultSettings: AgentSettings = {
    apiKey: "",
    model: "gemini-2.0-flash",
    temperature: 0.7,
    schedulesEnabled: true,
}

// Simple obfuscation for API key (not true encryption, but better than plaintext)
function obfuscate(str: string): string {
    if (!str) return ""
    return btoa(str.split("").reverse().join(""))
}

function deobfuscate(str: string): string {
    if (!str) return ""
    try {
        return atob(str).split("").reverse().join("")
    } catch {
        return ""
    }
}

export function useSettings() {
    const [settings, setSettingsState] = useState<AgentSettings>(defaultSettings)
    const [loaded, setLoaded] = useState(false)

    // Load settings from localStorage on mount
    useEffect(() => {
        if (typeof window === "undefined") return

        try {
            const stored = localStorage.getItem(SETTINGS_KEY)
            if (stored) {
                const parsed = JSON.parse(stored)
                setSettingsState({
                    ...defaultSettings,
                    ...parsed,
                    apiKey: deobfuscate(parsed.apiKey || ""),
                })
            }
        } catch (error) {
            console.warn("Failed to load settings:", error)
        }
        setLoaded(true)
    }, [])

    // Persist settings whenever they change
    const persist = useCallback((newSettings: AgentSettings) => {
        if (typeof window === "undefined") return

        try {
            const toStore = {
                ...newSettings,
                apiKey: obfuscate(newSettings.apiKey),
            }
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(toStore))
        } catch (error) {
            console.warn("Failed to save settings:", error)
        }
    }, [])

    const setSettings = useCallback((updates: Partial<AgentSettings>) => {
        setSettingsState((prev) => {
            const next = { ...prev, ...updates }
            persist(next)
            return next
        })
    }, [persist])

    const setApiKey = useCallback((apiKey: string) => {
        setSettings({ apiKey })
    }, [setSettings])

    const setModel = useCallback((model: AgentSettings["model"]) => {
        setSettings({ model })
    }, [setSettings])

    const setTemperature = useCallback((temperature: number) => {
        setSettings({ temperature })
    }, [setSettings])

    const setSchedulesEnabled = useCallback((schedulesEnabled: boolean) => {
        setSettings({ schedulesEnabled })
    }, [setSettings])

    const clearApiKey = useCallback(() => {
        setSettings({ apiKey: "" })
    }, [setSettings])

    const resetToDefaults = useCallback(() => {
        setSettingsState(defaultSettings)
        persist(defaultSettings)
    }, [persist])

    return {
        settings,
        loaded,
        setSettings,
        setApiKey,
        setModel,
        setTemperature,
        setSchedulesEnabled,
        clearApiKey,
        resetToDefaults,
        hasApiKey: Boolean(settings.apiKey),
    }
}

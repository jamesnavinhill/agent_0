"use client"

import { useState, useEffect, useCallback } from "react"
import {
    saveApiKey,
    getApiKey,
    removeApiKey,
    getMaskedKey,
    validateKeyFormat,
    type ApiKeyType
} from "@/lib/utils/secure-storage"

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

export function useSettings() {
    const [settings, setSettingsState] = useState<AgentSettings>(defaultSettings)
    const [loaded, setLoaded] = useState(false)

    // Load settings from localStorage on mount
    useEffect(() => {
        if (typeof window === "undefined") return

        try {
            // Load non-sensitive settings
            const stored = localStorage.getItem(SETTINGS_KEY)
            const parsed = stored ? JSON.parse(stored) : {}

            // Load API key from secure storage
            const apiKey = getApiKey("google") || ""

            setSettingsState({
                ...defaultSettings,
                ...parsed,
                apiKey,
            })
        } catch (error) {
            console.warn("Failed to load settings:", error)
        }
        setLoaded(true)
    }, [])

    // Persist settings whenever they change
    const persist = useCallback((newSettings: AgentSettings) => {
        if (typeof window === "undefined") return

        try {
            // Store API key separately with secure storage
            if (newSettings.apiKey) {
                saveApiKey("google", newSettings.apiKey)
            } else {
                removeApiKey("google")
            }

            // Store non-sensitive settings normally (without apiKey)
            const { apiKey, ...safeSettings } = newSettings
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(safeSettings))
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

    // Get masked version of API key for display
    const maskedApiKey = getMaskedKey("google")

    // Validate API key format
    const validateApiKey = useCallback((key: string) => {
        return validateKeyFormat("google", key)
    }, [])

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
        maskedApiKey,
        validateApiKey,
    }
}

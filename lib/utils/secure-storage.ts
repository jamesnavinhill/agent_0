/**
 * Secure API Key Storage Utility
 * 
 * Provides obfuscated storage for API keys in localStorage.
 * NOTE: This is NOT cryptographically secure - it's obfuscation only.
 * For production, use server-side storage or a secrets manager.
 */

const STORAGE_PREFIX = "az_k_"
const OBFUSCATION_KEY = "agent_zero_2026"

/**
 * Simple XOR-based obfuscation (NOT encryption)
 * Prevents casual inspection of localStorage, not secure against determined attackers
 */
function obfuscate(text: string): string {
    let result = ""
    for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i) ^ OBFUSCATION_KEY.charCodeAt(i % OBFUSCATION_KEY.length)
        result += String.fromCharCode(charCode)
    }
    // Base64 encode to make it safe for localStorage
    return btoa(result)
}

/**
 * Reverse the obfuscation
 */
function deobfuscate(encoded: string): string {
    try {
        const decoded = atob(encoded)
        let result = ""
        for (let i = 0; i < decoded.length; i++) {
            const charCode = decoded.charCodeAt(i) ^ OBFUSCATION_KEY.charCodeAt(i % OBFUSCATION_KEY.length)
            result += String.fromCharCode(charCode)
        }
        return result
    } catch {
        return ""
    }
}

export type ApiKeyType = "google" | "anthropic" | "replicate" | "runway" | "custom"

interface StoredKey {
    value: string
    createdAt: number
    lastUsed?: number
}

/**
 * Save an API key with obfuscation
 */
export function saveApiKey(type: ApiKeyType, key: string): void {
    if (typeof window === "undefined") return

    const stored: StoredKey = {
        value: obfuscate(key),
        createdAt: Date.now(),
    }

    try {
        localStorage.setItem(`${STORAGE_PREFIX}${type}`, JSON.stringify(stored))
    } catch (error) {
        console.warn("Failed to save API key:", error)
    }
}

/**
 * Retrieve an API key, returns null if not found
 */
export function getApiKey(type: ApiKeyType): string | null {
    if (typeof window === "undefined") return null

    try {
        const stored = localStorage.getItem(`${STORAGE_PREFIX}${type}`)
        if (!stored) return null

        const parsed: StoredKey = JSON.parse(stored)
        const key = deobfuscate(parsed.value)

        // Update last used timestamp
        parsed.lastUsed = Date.now()
        localStorage.setItem(`${STORAGE_PREFIX}${type}`, JSON.stringify(parsed))

        return key || null
    } catch {
        return null
    }
}

/**
 * Check if an API key exists (without retrieving it)
 */
export function hasApiKey(type: ApiKeyType): boolean {
    if (typeof window === "undefined") return false
    return localStorage.getItem(`${STORAGE_PREFIX}${type}`) !== null
}

/**
 * Remove an API key
 */
export function removeApiKey(type: ApiKeyType): void {
    if (typeof window === "undefined") return
    localStorage.removeItem(`${STORAGE_PREFIX}${type}`)
}

/**
 * Get a masked version of the key for display (e.g., "AIza...7Hx9")
 */
export function getMaskedKey(type: ApiKeyType): string | null {
    const key = getApiKey(type)
    if (!key) return null
    if (key.length <= 8) return "••••••••"
    return `${key.slice(0, 4)}...${key.slice(-4)}`
}

/**
 * List all stored key types
 */
export function listStoredKeys(): ApiKeyType[] {
    if (typeof window === "undefined") return []

    const types: ApiKeyType[] = ["google", "anthropic", "replicate", "runway", "custom"]
    return types.filter(type => hasApiKey(type))
}

/**
 * Clear all stored API keys
 */
export function clearAllApiKeys(): void {
    if (typeof window === "undefined") return

    const types: ApiKeyType[] = ["google", "anthropic", "replicate", "runway", "custom"]
    types.forEach(type => removeApiKey(type))
}

/**
 * Validate key format (basic checks)
 */
export function validateKeyFormat(type: ApiKeyType, key: string): { valid: boolean; message?: string } {
    if (!key || key.trim().length === 0) {
        return { valid: false, message: "Key cannot be empty" }
    }

    // Type-specific validation
    switch (type) {
        case "google":
            if (!key.startsWith("AIza")) {
                return { valid: false, message: "Google API keys typically start with 'AIza'" }
            }
            if (key.length < 30) {
                return { valid: false, message: "Key appears too short" }
            }
            break
        case "anthropic":
            if (!key.startsWith("sk-ant-")) {
                return { valid: false, message: "Anthropic API keys typically start with 'sk-ant-'" }
            }
            break
        case "replicate":
            if (!key.startsWith("r8_")) {
                return { valid: false, message: "Replicate API keys typically start with 'r8_'" }
            }
            break
    }

    return { valid: true }
}

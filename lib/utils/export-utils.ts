/**
 * Export and download utilities for Agent Zero
 */

/**
 * Trigger a file download with the given content
 */
export function downloadFile(filename: string, content: string, mimeType: string = "text/plain"): void {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

/**
 * Download an image from a URL or data URL
 */
export async function downloadImage(imageUrl: string, filename: string): Promise<void> {
    try {
        // Handle data URLs directly
        if (imageUrl.startsWith("data:")) {
            const a = document.createElement("a")
            a.href = imageUrl
            a.download = filename
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            return
        }

        // Fetch and download external URLs
        const response = await fetch(imageUrl)
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    } catch (error) {
        console.error("Failed to download image:", error)
        throw error
    }
}

/**
 * Export data as a JSON file
 */
export function exportAsJSON(data: unknown, filename: string): void {
    const content = JSON.stringify(data, null, 2)
    downloadFile(filename, content, "application/json")
}

/**
 * Copy text to clipboard with optional success callback
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text)
        return true
    } catch (error) {
        // Fallback for older browsers
        try {
            const textarea = document.createElement("textarea")
            textarea.value = text
            textarea.style.position = "fixed"
            textarea.style.left = "-9999px"
            document.body.appendChild(textarea)
            textarea.select()
            document.execCommand("copy")
            document.body.removeChild(textarea)
            return true
        } catch (fallbackError) {
            console.error("Failed to copy to clipboard:", fallbackError)
            return false
        }
    }
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
    const parts = filename.split(".")
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ""
}

/**
 * Generate a safe filename from a title
 */
export function sanitizeFilename(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 100)
}

/**
 * Get MIME type from output type
 */
export function getMimeType(type: "text" | "image" | "code" | "audio" | "video"): string {
    switch (type) {
        case "image":
            return "image/png"
        case "audio":
            return "audio/mpeg"
        case "video":
            return "video/mp4"
        case "code":
        case "text":
        default:
            return "text/plain"
    }
}

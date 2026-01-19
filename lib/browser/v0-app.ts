import type { BrowserTool, BrowserToolResult } from "./index"

export interface V0AppOptions {
  framework?: "react" | "vue" | "svelte"
  styling?: "tailwind" | "css" | "styled-components"
  typescript?: boolean
}

export class V0AppTool implements BrowserTool {
  name = "v0-app"
  type = "v0-app" as const
  baseUrl = "https://v0.dev"
  private popup: Window | null = null

  async execute(prompt: string, options?: V0AppOptions): Promise<BrowserToolResult> {
    if (typeof window === "undefined") {
      return { success: false, error: "Browser environment required" }
    }

    try {
      // v0.dev supports prompt via URL
      const url = new URL(this.baseUrl)

      // Open in popup window
      const width = 1400
      const height = 900
      const left = (window.screen.width - width) / 2
      const top = (window.screen.height - height) / 2

      this.popup = window.open(
        url.toString(),
        "V0Dev",
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
      )

      if (!this.popup) {
        return {
          success: false,
          error: "Failed to open popup. Please allow popups for this site.",
        }
      }

      // Build context from options
      const frameworkText = options?.framework ? ` using ${options.framework}` : ""
      const stylingText = options?.styling ? ` with ${options.styling}` : ""
      const tsText = options?.typescript ? " (TypeScript)" : ""

      return {
        success: true,
        data: `UI generation window opened. Follow these steps:

1. Sign in to v0.dev if needed
2. Enter your prompt: "${prompt}"${frameworkText}${stylingText}${tsText}
3. Wait for generation to complete
4. Copy the generated code
5. Save to gallery via the Create panel

The popup window is now open. Complete the steps above to generate your UI component.`,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to open v0.dev",
      }
    }
  }

  isAvailable(): boolean {
    return typeof window !== "undefined"
  }

  closePopup(): void {
    if (this.popup && !this.popup.closed) {
      this.popup.close()
      this.popup = null
    }
  }

  getInstructions(): string {
    return `V0.dev UI Generation Tool

Generate UI components using v0.dev

Usage:
1. Enter a description of the UI you want
2. Optionally select framework and styling preferences
3. Click Execute to open v0.dev
4. Follow the on-screen instructions to generate and copy code

Supported frameworks: react, vue, svelte
Styling options: tailwind, css, styled-components`
  }
}

export const v0AppTool = new V0AppTool()

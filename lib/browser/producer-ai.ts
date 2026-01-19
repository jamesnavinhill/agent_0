import type { BrowserTool, BrowserToolResult } from "./index"

export interface ProducerAIOptions {
  style?: "ambient" | "electronic" | "orchestral" | "rock" | "jazz" | "pop"
  duration?: number
  tempo?: "slow" | "medium" | "fast"
}

export class ProducerAITool implements BrowserTool {
  name = "producer-ai"
  type = "producer-ai" as const
  baseUrl = "https://producer.ai"
  private popup: Window | null = null

  async execute(prompt: string, options?: ProducerAIOptions): Promise<BrowserToolResult> {
    if (typeof window === "undefined") {
      return { success: false, error: "Browser environment required" }
    }

    try {
      // Build URL with prompt and options
      const url = new URL(this.baseUrl)

      // Open in popup window
      const width = 1200
      const height = 800
      const left = (window.screen.width - width) / 2
      const top = (window.screen.height - height) / 2

      this.popup = window.open(
        url.toString(),
        "ProducerAI",
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
      )

      if (!this.popup) {
        return {
          success: false,
          error: "Failed to open popup. Please allow popups for this site.",
        }
      }

      // Build instructions based on options
      const styleText = options?.style ? ` in ${options.style} style` : ""
      const tempoText = options?.tempo ? ` at ${options.tempo} tempo` : ""
      const durationText = options?.duration ? ` (${options.duration} seconds)` : ""

      return {
        success: true,
        data: `Music generation window opened. Follow these steps:

1. Sign in to producer.ai if needed
2. Enter your prompt: "${prompt}"${styleText}${tempoText}${durationText}
3. Click Generate
4. Wait for generation to complete
5. Download the audio file
6. Add to gallery via the Create panel

The popup window is now open. Complete the steps above to generate your music.`,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to open producer.ai",
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
    return `ProducerAI Music Generation Tool

Generate music using producer.ai

Usage:
1. Enter a description of the music you want
2. Optionally select style, tempo, and duration
3. Click Execute to open producer.ai
4. Follow the on-screen instructions

Supported styles: ambient, electronic, orchestral, rock, jazz, pop
Tempo options: slow, medium, fast`
  }
}

export const producerAITool = new ProducerAITool()

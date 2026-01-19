export type BrowserToolType = "producer-ai" | "v0-app" | "custom"

export interface BrowserAction {
  type: "navigate" | "click" | "type" | "wait" | "extract" | "download"
  target?: string
  value?: string
  timeout?: number
}

export interface BrowserToolResult {
  success: boolean
  data?: string | Blob
  error?: string
  screenshotUrl?: string
}

export interface BrowserTool {
  name: string
  type: BrowserToolType
  baseUrl: string
  execute(prompt: string, options?: Record<string, unknown>): Promise<BrowserToolResult>
  isAvailable(): boolean
}

export interface BrowserController {
  tools: Map<string, BrowserTool>
  registerTool(tool: BrowserTool): void
  getTool(name: string): BrowserTool | undefined
  executeTool(name: string, prompt: string, options?: Record<string, unknown>): Promise<BrowserToolResult>
}

class LocalBrowserController implements BrowserController {
  tools: Map<string, BrowserTool> = new Map()

  registerTool(tool: BrowserTool): void {
    this.tools.set(tool.name, tool)
  }

  getTool(name: string): BrowserTool | undefined {
    return this.tools.get(name)
  }

  async executeTool(
    name: string,
    prompt: string,
    options?: Record<string, unknown>
  ): Promise<BrowserToolResult> {
    const tool = this.tools.get(name)
    if (!tool) {
      return { success: false, error: `Tool "${name}" not found` }
    }

    if (!tool.isAvailable()) {
      return { success: false, error: `Tool "${name}" is not available` }
    }

    try {
      return await tool.execute(prompt, options)
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  listTools(): BrowserTool[] {
    return Array.from(this.tools.values())
  }

  getAvailableTools(): BrowserTool[] {
    return this.listTools().filter(t => t.isAvailable())
  }
}

export const browserController = new LocalBrowserController()

export { ProducerAITool } from "./producer-ai"
export { V0AppTool } from "./v0-app"

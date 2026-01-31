/**
 * Gemini Model Configuration
 * Centralized model definitions for Agent Zero
 * All models are configurable through the UI
 */

export interface ModelConfig {
  id: string
  name: string
  description: string
  category: "reasoning" | "fast" | "image" | "video" | "audio" | "code"
  capabilities: string[]
  contextWindow: number
  outputTokens: number
  knowledgeCutoff: string
  recommended?: boolean
  deprecated?: boolean
}

/**
 * Available Gemini models as of January 2026
 */
export const GEMINI_MODELS: ModelConfig[] = [
  // Gemini 3 Series (Latest)
  {
    id: "gemini-3-pro-preview",
    name: "Gemini 3 Pro",
    description: "Most intelligent model for multimodal understanding and agentic/vibe-coding",
    category: "reasoning",
    capabilities: ["text", "image", "video", "audio", "code-execution", "function-calling", "search-grounding", "thinking"],
    contextWindow: 1048576,
    outputTokens: 65536,
    knowledgeCutoff: "January 2025",
    recommended: true,
  },
  {
    id: "gemini-3-pro-image-preview",
    name: "Gemini 3 Pro Image",
    description: "Image generation with thinking and search grounding",
    category: "image",
    capabilities: ["image-generation", "image-input", "text", "thinking", "search-grounding"],
    contextWindow: 65536,
    outputTokens: 32768,
    knowledgeCutoff: "January 2025",
  },
  {
    id: "gemini-3-flash-preview",
    name: "Gemini 3 Flash",
    description: "Most balanced model for speed, scale, and frontier intelligence",
    category: "fast",
    capabilities: ["text", "image", "video", "audio", "code-execution", "function-calling", "search-grounding", "thinking"],
    contextWindow: 1048576,
    outputTokens: 65536,
    knowledgeCutoff: "January 2025",
    recommended: true,
  },

  // Gemini 2.5 Series (Stable)
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    description: "Advanced thinking model for complex reasoning, code, math, STEM",
    category: "reasoning",
    capabilities: ["text", "image", "video", "audio", "code-execution", "function-calling", "search-grounding", "thinking"],
    contextWindow: 1048576,
    outputTokens: 65536,
    knowledgeCutoff: "January 2025",
    recommended: true,
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    description: "Best price-performance for large scale, low-latency, agentic tasks",
    category: "fast",
    capabilities: ["text", "image", "video", "audio", "code-execution", "function-calling", "search-grounding", "thinking"],
    contextWindow: 1048576,
    outputTokens: 65536,
    knowledgeCutoff: "January 2025",
    recommended: true,
  },
  {
    id: "gemini-2.5-flash-image",
    name: "Gemini 2.5 Flash Image",
    description: "Fast image generation and editing",
    category: "image",
    capabilities: ["image-generation", "image-input", "text"],
    contextWindow: 65536,
    outputTokens: 32768,
    knowledgeCutoff: "June 2025",
    recommended: true,
  },
  {
    id: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    description: "Ultra fast, cost-efficient model for high throughput",
    category: "fast",
    capabilities: ["text", "image", "video", "audio", "code-execution", "function-calling", "search-grounding", "thinking"],
    contextWindow: 1048576,
    outputTokens: 65536,
    knowledgeCutoff: "January 2025",
  },
  {
    id: "gemini-2.5-flash-native-audio-preview-12-2025",
    name: "Gemini 2.5 Flash Live",
    description: "Native audio generation and Live API support",
    category: "audio",
    capabilities: ["audio-generation", "audio-input", "video-input", "text", "function-calling", "search-grounding", "thinking", "live-api"],
    contextWindow: 131072,
    outputTokens: 8192,
    knowledgeCutoff: "January 2025",
  },
  {
    id: "gemini-2.5-flash-preview-tts",
    name: "Gemini 2.5 Flash TTS",
    description: "Text-to-speech audio generation",
    category: "audio",
    capabilities: ["audio-generation", "text-input"],
    contextWindow: 8192,
    outputTokens: 16384,
    knowledgeCutoff: "December 2025",
  },

  // Gemini 2.0 Series (Deprecated - March 2026)
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    description: "Second generation workhorse model",
    category: "fast",
    capabilities: ["text", "image", "video", "audio", "code-execution", "function-calling", "search-grounding"],
    contextWindow: 1048576,
    outputTokens: 8192,
    knowledgeCutoff: "August 2024",
    deprecated: true,
  },
]

/**
 * Model presets for different use cases
 */
export const MODEL_PRESETS = {
  // Sandbox/Code execution
  codeExecution: {
    default: "gemini-2.5-pro",
    fast: "gemini-2.5-flash",
    advanced: "gemini-3-pro-preview",
  },

  // Research with grounding
  research: {
    default: "gemini-2.5-pro",
    fast: "gemini-2.5-flash",
    advanced: "gemini-3-pro-preview",
  },

  // Creative tasks
  creative: {
    text: "gemini-3-pro-preview",
    image: "gemini-2.5-flash-image",
    imageAdvanced: "gemini-3-pro-image-preview",
  },

  // Agent orchestration
  orchestrator: {
    default: "gemini-2.5-pro",
    advanced: "gemini-3-pro-preview",
  },

  // Sub-agents
  subAgents: {
    researcher: "gemini-2.5-pro",
    creator: "gemini-3-pro-preview",
    coder: "gemini-3-pro-preview",
    reviewer: "gemini-3-flash-preview",
  },
} as const

/**
 * Get models by category
 */
export function getModelsByCategory(category: ModelConfig["category"]): ModelConfig[] {
  return GEMINI_MODELS.filter((m) => m.category === category && !m.deprecated)
}

/**
 * Get models by capability
 */
export function getModelsByCapability(capability: string): ModelConfig[] {
  return GEMINI_MODELS.filter(
    (m) => m.capabilities.includes(capability) && !m.deprecated
  )
}

/**
 * Get recommended models
 */
export function getRecommendedModels(): ModelConfig[] {
  return GEMINI_MODELS.filter((m) => m.recommended && !m.deprecated)
}

/**
 * Get model by ID
 */
export function getModel(id: string): ModelConfig | undefined {
  return GEMINI_MODELS.find((m) => m.id === id)
}

/**
 * Check if model supports code execution
 */
export function supportsCodeExecution(modelId: string): boolean {
  const model = getModel(modelId)
  return model?.capabilities.includes("code-execution") ?? false
}

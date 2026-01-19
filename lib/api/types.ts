export interface APIResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface GenerationResult {
  content: string
  type: "text" | "code" | "image" | "video" | "audio"
  metadata?: {
    model?: string
    tokens?: number
    duration?: number
  }
}

export interface ImageGenerationRequest {
  prompt: string
  style?: "natural" | "vivid"
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4"
}

export interface ImageGenerationResult {
  url: string
  localPath?: string
  prompt: string
  timestamp: Date
  metadata?: {
    model?: string
    aspectRatio?: string
    dimensions?: { width: number; height: number }
  }
}

export interface VideoGenerationRequest {
  prompt: string
  duration?: number
  aspectRatio?: "16:9" | "9:16" | "1:1"
}

export interface VideoGenerationResult {
  url: string
  prompt: string
  timestamp: Date
  duration?: number
}

export interface CodeGenerationRequest {
  prompt: string
  language?: string
  context?: string
}

export interface CodeGenerationResult {
  code: string
  language: string
  explanation?: string
}

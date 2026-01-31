import { GoogleGenAI } from "@google/genai"
import type { ImageGenerationRequest, ImageGenerationResult } from "./types"
import { createLogger } from "@/lib/logging/logger"

const log = createLogger("Imagen")

const apiKey = process.env.GOOGLE_API_KEY

if (!apiKey) {
  console.warn("GOOGLE_API_KEY not set - Imagen features will not work")
}

const genAI = apiKey ? new GoogleGenAI({ apiKey }) : null

export type ImagenModel =
  | "gemini-2.5-flash-image"
  | "gemini-3-pro-image-preview"
  | "imagen-4.0-generate-001"
  | "imagen-4.0-ultra-generate-001"
  | "imagen-4.0-fast-generate-001"

export type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9"

export interface ImagenConfig {
  model?: ImagenModel
  numberOfImages?: number
  aspectRatio?: AspectRatio
  personGeneration?: "dont_allow" | "allow_adult" | "allow_all"
}

const DEFAULT_CONFIG: ImagenConfig = {
  model: "gemini-2.5-flash-image",
  numberOfImages: 1,
  aspectRatio: "9:16",
  personGeneration: "allow_all",
}

export async function generateImage(
  prompt: string,
  config: ImagenConfig = {}
): Promise<ImageGenerationResult> {
  if (!genAI) {
    throw new Error("Gemini not initialized - check GOOGLE_API_KEY")
  }

  log.info("Generating image", {
    model: config.model || DEFAULT_CONFIG.model,
    promptLength: prompt.length,
    aspectRatio: config.aspectRatio ?? DEFAULT_CONFIG.aspectRatio
  })

  const mergedConfig = { ...DEFAULT_CONFIG, ...config }

  try {
    const imageConfig: Record<string, any> = {
      numberOfImages: mergedConfig.numberOfImages,
      aspectRatio: mergedConfig.aspectRatio,
    }
    
    // Only add personGeneration if it's defined
    if (mergedConfig.personGeneration) {
      imageConfig.personGeneration = mergedConfig.personGeneration.toUpperCase()
    }

    const response = await genAI.models.generateImages({
      model: mergedConfig.model!,
      prompt,
      config: imageConfig,
    })

    if (!response.generatedImages || response.generatedImages.length === 0) {
      throw new Error("No images generated")
    }

    const image = response.generatedImages[0]
    if (!image.image?.imageBytes) {
      throw new Error("No image data returned")
    }

    const base64Data = image.image.imageBytes
    const dataUrl = `data:image/png;base64,${base64Data}`

    log.action("Image generated successfully", { prompt: prompt.slice(0, 50) })

    return {
      url: dataUrl,
      prompt,
      timestamp: new Date(),
    }
  } catch (error: any) {
    log.error("Image generation failed", { error: error.message })
    throw error
  }
}

export async function generateImages(
  prompt: string,
  config: ImagenConfig = {}
): Promise<ImageGenerationResult[]> {
  if (!genAI) {
    throw new Error("Gemini not initialized - check GOOGLE_API_KEY")
  }

  const mergedConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    numberOfImages: config.numberOfImages ?? 4
  }

  log.info("Generating multiple images", {
    model: mergedConfig.model,
    count: mergedConfig.numberOfImages
  })

  try {
    const imageConfig: Record<string, any> = {
      numberOfImages: mergedConfig.numberOfImages,
      aspectRatio: mergedConfig.aspectRatio,
    }
    
    // Only add personGeneration if it's defined
    if (mergedConfig.personGeneration) {
      imageConfig.personGeneration = mergedConfig.personGeneration.toUpperCase()
    }

    const response = await genAI.models.generateImages({
      model: mergedConfig.model!,
      prompt,
      config: imageConfig,
    })

    if (!response.generatedImages || response.generatedImages.length === 0) {
      throw new Error("No images generated")
    }

    const results = response.generatedImages
      .filter(img => img.image?.imageBytes)
      .map(img => ({
        url: `data:image/png;base64,${img.image!.imageBytes}`,
        prompt,
        timestamp: new Date(),
      }))

    log.action("Multiple images generated", { count: results.length })
    return results
  } catch (error: any) {
    log.error("Multi-image generation failed", { error: error.message })
    throw error
  }
}

export function isImagenConfigured(): boolean {
  return !!apiKey
}

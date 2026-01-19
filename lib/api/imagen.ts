import { GoogleGenAI } from "@google/genai"
import type { ImageGenerationRequest, ImageGenerationResult } from "./types"
import { createLogger } from "@/lib/logging/logger"

const log = createLogger("Imagen")

const apiKey = process.env.GOOGLE_API_KEY

if (!apiKey) {
  console.warn("GOOGLE_API_KEY not set - Imagen features will not work")
}

const genAI = apiKey ? new GoogleGenAI({ apiKey }) : null

export type ImagenModel = "imagen-3.0-generate-002" | "imagen-3.0-fast-generate-001"
export type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9"

export interface ImagenConfig {
  model?: ImagenModel
  numberOfImages?: number
  aspectRatio?: AspectRatio
  personGeneration?: "dont_allow" | "allow_adult" | "allow_all"
}

const DEFAULT_CONFIG: ImagenConfig = {
  model: "imagen-3.0-generate-002",
  numberOfImages: 1,
  aspectRatio: "1:1",
  personGeneration: "allow_adult",
}

export async function generateImage(
  prompt: string,
  config: ImagenConfig = {}
): Promise<ImageGenerationResult> {
  if (!genAI) {
    throw new Error("Gemini not initialized - check GOOGLE_API_KEY")
  }

  log.info("Generating image", { promptLength: prompt.length, aspectRatio: config.aspectRatio ?? "1:1" })
  const mergedConfig = { ...DEFAULT_CONFIG, ...config }

  const response = await genAI.models.generateImages({
    model: mergedConfig.model!,
    prompt,
    config: {
      numberOfImages: mergedConfig.numberOfImages,
      aspectRatio: mergedConfig.aspectRatio,
      personGeneration: mergedConfig.personGeneration,
    },
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
}

export async function generateImages(
  prompt: string,
  config: ImagenConfig = {}
): Promise<ImageGenerationResult[]> {
  if (!genAI) {
    throw new Error("Gemini not initialized - check GOOGLE_API_KEY")
  }

  log.info("Generating multiple images", { promptLength: prompt.length, count: config.numberOfImages ?? 4 })
  const mergedConfig = { ...DEFAULT_CONFIG, ...config, numberOfImages: config.numberOfImages ?? 4 }

  const response = await genAI.models.generateImages({
    model: mergedConfig.model!,
    prompt,
    config: {
      numberOfImages: mergedConfig.numberOfImages,
      aspectRatio: mergedConfig.aspectRatio,
      personGeneration: mergedConfig.personGeneration,
    },
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
}

export function isImagenConfigured(): boolean {
  return !!apiKey
}

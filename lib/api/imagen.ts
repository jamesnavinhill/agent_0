import { GoogleGenAI } from "@google/genai"
import type { ImageGenerationResult } from "./types"
import { createLogger } from "@/lib/logging/logger"

const log = createLogger("ImageGen")

const apiKey = process.env.GOOGLE_API_KEY

if (!apiKey) {
  console.warn("GOOGLE_API_KEY not set - image generation will not work")
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

const GEMINI_IMAGE_MODEL_PREFIX = "gemini-"

function isGeminiImageModel(model: string) {
  return model.startsWith(GEMINI_IMAGE_MODEL_PREFIX)
}

async function generateGeminiImage(
  prompt: string,
  config: ImagenConfig,
  model: ImagenModel
): Promise<ImageGenerationResult> {
  if (!genAI) {
    throw new Error("Gemini not initialized - check GOOGLE_API_KEY")
  }

  const response = await genAI.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: {
        aspectRatio: config.aspectRatio ?? "9:16",
      },
    },
  })

  const parts = response.candidates?.[0]?.content?.parts ?? []
  const imagePart = parts.find((part) => part.inlineData?.data)
  const inlineData = imagePart?.inlineData
  if (!inlineData?.data) {
    throw new Error("No image data returned")
  }

  const mimeType = inlineData.mimeType ?? "image/png"
  const dataUrl = `data:${mimeType};base64,${inlineData.data}`

  return {
    url: dataUrl,
    prompt,
    timestamp: new Date(),
    metadata: { model, aspectRatio: config.aspectRatio },
  }
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

  // Filter out undefined values from config before merging
  const cleanConfig = Object.fromEntries(
    Object.entries(config).filter(([_, v]) => v !== undefined)
  )
  const mergedConfig = { ...DEFAULT_CONFIG, ...cleanConfig }

  // Ensure required fields are present
  if (!mergedConfig.model) {
    throw new Error("Model is required for image generation")
  }

  try {
    if (isGeminiImageModel(mergedConfig.model)) {
      const result = await generateGeminiImage(prompt, mergedConfig, mergedConfig.model)
      log.action("Image generated successfully", { prompt: prompt.slice(0, 50), model: mergedConfig.model })
      return result
    }

    const imageConfig: Record<string, any> = {
      numberOfImages: mergedConfig.numberOfImages ?? 1,
      aspectRatio: mergedConfig.aspectRatio ?? "9:16",
    }

    // Only add personGeneration if it's defined
    if (mergedConfig.personGeneration) {
      imageConfig.personGeneration = mergedConfig.personGeneration.toUpperCase()
    }

    const response = await genAI.models.generateImages({
      model: mergedConfig.model,
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

    log.action("Image generated successfully", { prompt: prompt.slice(0, 50), model: mergedConfig.model })

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

  // Filter out undefined values from config before merging
  const cleanConfig = Object.fromEntries(
    Object.entries(config).filter(([_, v]) => v !== undefined)
  )
  const mergedConfig = {
    ...DEFAULT_CONFIG,
    ...cleanConfig,
    numberOfImages: config.numberOfImages ?? 4
  }

  // Ensure required fields are present
  if (!mergedConfig.model) {
    throw new Error("Model is required for image generation")
  }

  log.info("Generating multiple images", {
    model: mergedConfig.model,
    count: mergedConfig.numberOfImages
  })

  try {
    if (isGeminiImageModel(mergedConfig.model)) {
      const results: ImageGenerationResult[] = []
      const count = mergedConfig.numberOfImages ?? 4
      for (let i = 0; i < count; i += 1) {
        results.push(await generateGeminiImage(prompt, mergedConfig, mergedConfig.model))
      }
      log.action("Multiple images generated", { count: results.length, model: mergedConfig.model })
      return results
    }

    const imageConfig: Record<string, any> = {
      numberOfImages: mergedConfig.numberOfImages ?? 4,
      aspectRatio: mergedConfig.aspectRatio ?? "9:16",
    }

    // Only add personGeneration if it's defined
    if (mergedConfig.personGeneration) {
      imageConfig.personGeneration = mergedConfig.personGeneration.toUpperCase()
    }

    const response = await genAI.models.generateImages({
      model: mergedConfig.model,
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

    log.action("Multiple images generated", { count: results.length, model: mergedConfig.model })
    return results
  } catch (error: any) {
    log.error("Multi-image generation failed", { error: error.message })
    throw error
  }
}

export function isImagenConfigured(): boolean {
  return !!apiKey
}

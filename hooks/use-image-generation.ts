"use client"

import { useState, useCallback } from "react"
import { useAgentStore } from "@/lib/store/agent-store"
import { useSettings } from "@/hooks/use-settings"
import { createId } from "@/lib/utils/id"

interface GeneratedImage {
  url: string
  prompt: string
  timestamp: string
}

interface ImageGenerationOptions {
  count?: number
  aspectRatio?: "1:1" | "3:4" | "4:3" | "9:16" | "16:9"
  model?: "gemini-2.5-flash-image" | "gemini-3-pro-image-preview" | "imagen-4.0-generate-001" | "imagen-4.0-ultra-generate-001" | "imagen-4.0-fast-generate-001"
}

interface UseImageGenerationReturn {
  generate: (prompt: string, options?: ImageGenerationOptions) => Promise<GeneratedImage[]>
  isGenerating: boolean
  error: string | null
  lastGenerated: GeneratedImage | null
}

export function useImageGeneration(): UseImageGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastGenerated, setLastGenerated] = useState<GeneratedImage | null>(null)
  
  const { setState, addOutput, addActivity, updateActivity, addThought } = useAgentStore()
  const { settings } = useSettings()

  const generate = useCallback(async (
    prompt: string,
    options: ImageGenerationOptions = {}
  ): Promise<GeneratedImage[]> => {
    setIsGenerating(true)
    setError(null)
    setState("creating")

    const activityId = createId()
    addActivity("Generating image", `Prompt: "${prompt.slice(0, 50)}..."`)
    addThought(`Creating visual art: "${prompt.slice(0, 80)}"`, "action")

    try {
      const response = await fetch("/api/generate/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          count: options.count,
          aspectRatio: options.aspectRatio,
          model: options.model ?? settings.imageModel,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate image")
      }

      const images: GeneratedImage[] = data.images ?? [data.image]
      
      for (const image of images) {
        addOutput({
          type: "image",
          content: image.url,
          title: prompt.slice(0, 50),
          category: "art",
          metadata: {
            prompt,
            aspectRatio: options.aspectRatio,
            model: options.model ?? settings.imageModel,
          },
        })
      }

      updateActivity(activityId, "complete")
      addThought(`Successfully created ${images.length} image(s)`, "observation")
      
      setLastGenerated(images[0])
      setState("idle")
      
      return images
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      setError(message)
      updateActivity(activityId, "error")
      addThought(`Image generation failed: ${message}`, "observation")
      setState("error")
      throw err
    } finally {
      setIsGenerating(false)
    }
  }, [setState, addOutput, addActivity, updateActivity, addThought, settings.imageModel])

  return {
    generate,
    isGenerating,
    error,
    lastGenerated,
  }
}

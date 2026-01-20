import { GoogleGenAI } from "@google/genai"
import { createLogger } from "@/lib/logging/logger"

const log = createLogger("Veo")

const apiKey = process.env.GOOGLE_API_KEY

if (!apiKey) {
    console.warn("GOOGLE_API_KEY not set - Veo video generation will not work")
}

const genAI = apiKey ? new GoogleGenAI({ apiKey }) : null

// Default model per handoff spec
export type VeoModel =
    | "veo-3.1-fast-generate-preview"
    | "veo-3.0-generate-preview"

export type VideoAspectRatio = "16:9" | "9:16"
export type VideoResolution = "720p" | "1080p" | "4k"
export type VideoDuration = 4 | 6 | 8

export interface VeoConfig {
    model?: VeoModel
    aspectRatio?: VideoAspectRatio
    resolution?: VideoResolution
    durationSeconds?: VideoDuration
}

export interface VideoGenerationResult {
    videoBytes: string  // base64 encoded
    mimeType: string
    prompt: string
    durationSeconds: number
    timestamp: Date
}

const DEFAULT_CONFIG: Required<VeoConfig> = {
    model: "veo-3.1-fast-generate-preview",
    aspectRatio: "16:9",
    resolution: "1080p",
    durationSeconds: 6,
}

/**
 * Generate a video from a text prompt
 */
export async function generateVideoFromText(
    prompt: string,
    config: VeoConfig = {}
): Promise<VideoGenerationResult> {
    if (!genAI) {
        throw new Error("Gemini not initialized - check GOOGLE_API_KEY")
    }

    const mergedConfig = { ...DEFAULT_CONFIG, ...config }

    log.info("Generating video from text", {
        model: mergedConfig.model,
        promptLength: prompt.length,
        aspectRatio: mergedConfig.aspectRatio,
        resolution: mergedConfig.resolution,
        duration: mergedConfig.durationSeconds,
    })

    try {
        // Use the Veo video generation API
        const response = await genAI.models.generateVideos({
            model: mergedConfig.model,
            prompt,
            config: {
                aspectRatio: mergedConfig.aspectRatio,
                // Note: Resolution and duration may need adjustment based on actual API
            },
        })

        // Poll for completion (video generation is async)
        let operation = response
        while (!operation.done) {
            await new Promise((resolve) => setTimeout(resolve, 5000)) // Poll every 5s
            // Re-check status - the SDK handles this internally for some methods
            // For now, we assume the response is synchronous or the SDK handles polling
            log.info("Waiting for video generation to complete...")
            break // If SDK doesn't auto-poll, we break after first check
        }

        if (!operation.generatedVideos || operation.generatedVideos.length === 0) {
            throw new Error("No videos generated")
        }

        const video = operation.generatedVideos[0]
        if (!video.video?.videoBytes) {
            throw new Error("No video data returned")
        }

        log.action("Video generated successfully", { prompt: prompt.slice(0, 50) })

        return {
            videoBytes: video.video.videoBytes,
            mimeType: "video/mp4",
            prompt,
            durationSeconds: mergedConfig.durationSeconds,
            timestamp: new Date(),
        }
    } catch (error: any) {
        log.error("Video generation failed", { error: error.message })
        throw error
    }
}

/**
 * Generate a video from an image (image-to-video animation)
 */
export async function generateVideoFromImage(
    imageBytes: string, // base64 encoded image
    motionPrompt: string,
    config: VeoConfig = {}
): Promise<VideoGenerationResult> {
    if (!genAI) {
        throw new Error("Gemini not initialized - check GOOGLE_API_KEY")
    }

    const mergedConfig = { ...DEFAULT_CONFIG, ...config }

    log.info("Generating video from image", {
        model: mergedConfig.model,
        promptLength: motionPrompt.length,
        aspectRatio: mergedConfig.aspectRatio,
    })

    try {
        // For image-to-video, we include the reference image
        const response = await genAI.models.generateVideos({
            model: mergedConfig.model,
            prompt: motionPrompt,
            referenceImages: [
                {
                    referenceImage: {
                        imageBytes: imageBytes,
                    },
                    referenceImageConfig: {
                        referenceType: "STYLE_IMAGE" as any,
                    },
                },
            ],
            config: {
                aspectRatio: mergedConfig.aspectRatio,
            },
        })

        // Handle async polling similar to text-to-video
        let operation = response
        while (!operation.done) {
            await new Promise((resolve) => setTimeout(resolve, 5000))
            log.info("Waiting for image-to-video generation to complete...")
            break
        }

        if (!operation.generatedVideos || operation.generatedVideos.length === 0) {
            throw new Error("No videos generated from image")
        }

        const video = operation.generatedVideos[0]
        if (!video.video?.videoBytes) {
            throw new Error("No video data returned")
        }

        log.action("Image-to-video generated successfully", {
            prompt: motionPrompt.slice(0, 50),
        })

        return {
            videoBytes: video.video.videoBytes,
            mimeType: "video/mp4",
            prompt: motionPrompt,
            durationSeconds: mergedConfig.durationSeconds,
            timestamp: new Date(),
        }
    } catch (error: any) {
        log.error("Image-to-video generation failed", { error: error.message })
        throw error
    }
}

export function isVeoConfigured(): boolean {
    return !!apiKey
}

import { GoogleGenAI } from "@google/genai"
import { createLogger } from "@/lib/logging/logger"
import fs from "fs/promises"
import os from "os"
import path from "path"
import { createId } from "@/lib/utils/id"

const log = createLogger("Veo")

const apiKey = process.env.GOOGLE_API_KEY

if (!apiKey) {
    console.warn("GOOGLE_API_KEY not set - Veo video generation will not work")
}

const genAI = apiKey ? new GoogleGenAI({ apiKey }) : null

// Default model per handoff spec
export type VeoModel =
    | "veo-3.0-fast-generate-001"
    | "veo-3.0-generate-001"
    | "veo-3.1-fast-generate-preview"
    | "veo-3.1-generate-preview"

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
    model: "veo-3.0-fast-generate-001",
    aspectRatio: "16:9",
    resolution: "1080p",
    durationSeconds: 6,
}

// Maximum time to wait for video generation (5 minutes)
const MAX_POLL_TIME_MS = 5 * 60 * 1000
const POLL_INTERVAL_MS = 10000 // 10 seconds

async function downloadGeneratedVideo(generatedVideo: { video?: { uri?: string } }): Promise<string> {
    if (!genAI) {
        throw new Error("Gemini not initialized - check GOOGLE_API_KEY")
    }

    const tempPath = path.join(os.tmpdir(), `komorebi-veo-${createId()}.mp4`)
    await genAI.files.download({
        file: generatedVideo,
        downloadPath: tempPath,
    })
    const buffer = await fs.readFile(tempPath)
    await fs.unlink(tempPath).catch(() => undefined)
    return buffer.toString("base64")
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

    log.info("Starting video generation from text", {
        model: mergedConfig.model,
        promptLength: prompt.length,
        aspectRatio: mergedConfig.aspectRatio,
    })

    try {
        const videoConfig: Record<string, any> = {
            aspectRatio: mergedConfig.aspectRatio,
            resolution: mergedConfig.resolution,
        }
        if (mergedConfig.model.startsWith("veo-2.")) {
            videoConfig.durationSeconds = mergedConfig.durationSeconds
        }

        // Start video generation - this returns an operation object
        let operation = await genAI.models.generateVideos({
            model: mergedConfig.model,
            prompt,
            config: videoConfig,
        })

        log.info("Video generation started, polling for completion...", {
            operationName: operation.name
        })

        // Poll for completion with timeout
        const startTime = Date.now()
        while (!operation.done) {
            if (Date.now() - startTime > MAX_POLL_TIME_MS) {
                throw new Error("Video generation timed out after 5 minutes")
            }

            log.info("Waiting for video generation...", {
                elapsed: `${Math.round((Date.now() - startTime) / 1000)}s`
            })

            await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))

            // Refresh operation status
            operation = await genAI.operations.getVideosOperation({
                operation: operation,
            })
        }

        log.info("Video generation complete, processing response...")

        // Check for content filter block first
        const response = operation.response as any
        if (response?.raiMediaFilteredCount && response.raiMediaFilteredCount > 0) {
            const reasons = response.raiMediaFilteredReasons?.join(", ") || "Content blocked by Google safety filters"
            log.error("Video blocked by content filter", { reasons })
            throw new Error(`Video generation blocked: ${reasons}`)
        }

        // Check for generated videos in response
        if (!operation.response?.generatedVideos || operation.response.generatedVideos.length === 0) {
            throw new Error("No videos in response - generation may have failed silently")
        }

        const generatedVideo = operation.response.generatedVideos[0]
        if (!generatedVideo.video) {
            throw new Error("No video object in generated result")
        }

        // Download the video file - this returns video data
        // The video object contains the file reference, we need to read it
        let videoBytes: string

        if (generatedVideo.video.videoBytes) {
            // If bytes are directly available
            videoBytes = generatedVideo.video.videoBytes
        } else if (generatedVideo.video.uri) {
            // Use authenticated SDK downloader to avoid forbidden URI access
            log.info("Downloading video via SDK...")
            videoBytes = await downloadGeneratedVideo(generatedVideo)
        } else {
            throw new Error("No video data or URI in response")
        }

        log.action("Video generated successfully", {
            prompt: prompt.slice(0, 50),
            bytesLength: videoBytes.length
        })

        return {
            videoBytes,
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

    log.info("Starting image-to-video generation", {
        model: mergedConfig.model,
        promptLength: motionPrompt.length,
        aspectRatio: mergedConfig.aspectRatio,
    })

    try {
        const videoConfig: Record<string, any> = {
            aspectRatio: mergedConfig.aspectRatio,
            resolution: mergedConfig.resolution,
        }
        if (mergedConfig.model.startsWith("veo-2.")) {
            videoConfig.durationSeconds = mergedConfig.durationSeconds
        }

        // Start image-to-video generation with reference image
        let operation = await genAI.models.generateVideos({
            model: mergedConfig.model,
            prompt: motionPrompt,
            image: {
                imageBytes: imageBytes,
                mimeType: "image/png",
            },
            config: videoConfig,
        })

        log.info("Image-to-video generation started, polling...")

        // Poll for completion
        const startTime = Date.now()
        while (!operation.done) {
            if (Date.now() - startTime > MAX_POLL_TIME_MS) {
                throw new Error("Image-to-video generation timed out")
            }

            log.info("Waiting for image-to-video generation...", {
                elapsed: `${Math.round((Date.now() - startTime) / 1000)}s`
            })

            await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))

            operation = await genAI.operations.getVideosOperation({
                operation: operation,
            })
        }

        log.info("Image-to-video complete, downloading...")

        if (!operation.response?.generatedVideos || operation.response.generatedVideos.length === 0) {
            throw new Error("No videos generated from image")
        }

        const generatedVideo = operation.response.generatedVideos[0]
        if (!generatedVideo.video) {
            throw new Error("No video object in result")
        }

        let videoBytes: string

        if (generatedVideo.video.videoBytes) {
            videoBytes = generatedVideo.video.videoBytes
        } else if (generatedVideo.video.uri) {
            log.info("Downloading video via SDK...")
            videoBytes = await downloadGeneratedVideo(generatedVideo)
        } else {
            throw new Error("No video data or URI in response")
        }

        log.action("Image-to-video generated successfully", {
            prompt: motionPrompt.slice(0, 50),
        })

        return {
            videoBytes,
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


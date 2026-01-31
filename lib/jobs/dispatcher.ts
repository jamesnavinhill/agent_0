import { createJob, updateJobStatus, Job } from "@/lib/db/jobs"
import { GoogleGenAI } from "@google/genai"
import { createLogger } from "@/lib/logging/logger"
import { pushActivity } from "@/lib/activity/bus"
import type { VeoConfig, VideoAspectRatio } from "@/lib/api/veo"

const log = createLogger("JobDispatcher")

const apiKey = process.env.GOOGLE_API_KEY
const genAI = apiKey ? new GoogleGenAI({ apiKey }) : null

const DEFAULT_VEO_CONFIG = {
    model: "veo-3.1-fast-generate-preview",
    aspectRatio: "16:9" as VideoAspectRatio,
}

export interface JobDispatchResult {
    jobId: string
    status: "dispatched" | "error"
    message: string
    operationId?: string
}

/**
 * Dispatch a video generation job (text-to-video)
 * Starts the async operation and returns immediately with job ID
 */
export async function dispatchVideoJob(
    prompt: string,
    config: VeoConfig = {},
    taskId?: string
): Promise<JobDispatchResult> {
    if (!genAI) {
        return {
            jobId: "",
            status: "error",
            message: "Gemini not initialized - check GOOGLE_API_KEY"
        }
    }

    const mergedConfig = { ...DEFAULT_VEO_CONFIG, ...config }

    log.info("Dispatching video generation job", {
        promptLength: prompt.length,
        model: mergedConfig.model,
        aspectRatio: mergedConfig.aspectRatio
    })

    pushActivity({
        action: "Dispatching Video Job",
        details: `Prompt: ${prompt.slice(0, 50)}...`,
        source: "JobDispatcher",
        level: "action"
    })

    try {
        // Start the async video generation - returns operation immediately
        const operation = await genAI.models.generateVideos({
            model: mergedConfig.model,
            prompt,
            config: {
                aspectRatio: mergedConfig.aspectRatio,
            },
        })

        log.info("Video operation started", { operationName: operation.name })

        // Store job in database
        const jobId = await createJob(
            "video-generation",
            {
                prompt,
                config: mergedConfig
            },
            operation.name,
            { operation: JSON.parse(JSON.stringify(operation)) }, // Serialize operation
            taskId
        )

        pushActivity({
            action: "Video Job Dispatched",
            details: `Job ${jobId.slice(0, 8)}... will be checked periodically`,
            source: "JobDispatcher",
            level: "info",
            metadata: { jobId, operationName: operation.name }
        })

        return {
            jobId,
            status: "dispatched",
            message: `Video generation job dispatched. Will complete in background.`,
            operationId: operation.name
        }

    } catch (error: any) {
        log.error("Failed to dispatch video job", { error: error.message })

        pushActivity({
            action: "Video Job Dispatch Failed",
            details: error.message,
            source: "JobDispatcher",
            level: "error"
        })

        return {
            jobId: "",
            status: "error",
            message: error.message
        }
    }
}

/**
 * Dispatch an image-to-video job
 */
export async function dispatchImageToVideoJob(
    imageBase64: string,
    motionPrompt: string,
    config: VeoConfig = {},
    taskId?: string
): Promise<JobDispatchResult> {
    if (!genAI) {
        return {
            jobId: "",
            status: "error",
            message: "Gemini not initialized - check GOOGLE_API_KEY"
        }
    }

    const mergedConfig = { ...DEFAULT_VEO_CONFIG, ...config }

    log.info("Dispatching image-to-video job", {
        promptLength: motionPrompt.length,
        model: mergedConfig.model
    })

    try {
        // Start the async image-to-video generation
        const operation = await genAI.models.generateVideos({
            model: mergedConfig.model,
            prompt: motionPrompt,
            image: {
                imageBytes: imageBase64,
                mimeType: "image/png",
            },
            config: {
                aspectRatio: mergedConfig.aspectRatio,
            },
        })

        log.info("Image-to-video operation started", { operationName: operation.name })

        // Store job in database
        const jobId = await createJob(
            "image-to-video",
            {
                prompt: motionPrompt,
                config: mergedConfig,
                hasImage: true
            },
            operation.name,
            { operation: JSON.parse(JSON.stringify(operation)) },
            taskId
        )

        pushActivity({
            action: "Image-to-Video Job Dispatched",
            details: `Job ${jobId.slice(0, 8)}... animating image`,
            source: "JobDispatcher",
            level: "info",
            metadata: { jobId }
        })

        return {
            jobId,
            status: "dispatched",
            message: `Image-to-video job dispatched. Will complete in background.`,
            operationId: operation.name
        }

    } catch (error: any) {
        log.error("Failed to dispatch image-to-video job", { error: error.message })

        return {
            jobId: "",
            status: "error",
            message: error.message
        }
    }
}

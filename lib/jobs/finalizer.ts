import { Job, updateJobStatus } from "@/lib/db/jobs"
import { saveGalleryItem } from "@/lib/db/gallery"
import { addMemory } from "@/lib/db/memories"
import { pushActivity } from "@/lib/activity/bus"
import { uploadFile } from "@/lib/storage/blob"
import { GoogleGenAI } from "@google/genai"
import { createLogger } from "@/lib/logging/logger"

const log = createLogger("JobFinalizer")

const apiKey = process.env.GOOGLE_API_KEY
const genAI = apiKey ? new GoogleGenAI({ apiKey }) : null

/**
 * Check if a video generation job is complete and finalize if so
 * Returns true if job was finalized, false if still pending
 */
export async function checkAndFinalizeVideoJob(job: Job): Promise<boolean> {
    if (!genAI) {
        await updateJobStatus(job.id, "error", undefined, "Gemini not initialized")
        return true
    }

    if (!job.operation_id) {
        await updateJobStatus(job.id, "error", undefined, "No operation ID stored")
        return true
    }

    log.info("Checking video job status", { jobId: job.id, operationId: job.operation_id })

    try {
        // Get the stored operation data
        const operationData = job.operation_data as any
        if (!operationData?.operation) {
            await updateJobStatus(job.id, "error", undefined, "No operation data stored")
            return true
        }

        // Poll the operation status
        const operation = await genAI.operations.getVideosOperation({
            operation: operationData.operation,
        })

        if (!operation.done) {
            log.info("Video still generating", {
                jobId: job.id,
                checkCount: job.check_count
            })
            return false
        }

        log.info("Video generation complete, finalizing job", { jobId: job.id })

        // Check for content filter block
        const response = operation.response as any
        if (response?.raiMediaFilteredCount && response.raiMediaFilteredCount > 0) {
            const reasons = response.raiMediaFilteredReasons?.join(", ") || "Content blocked by safety filters"
            await updateJobStatus(job.id, "error", undefined, `Video blocked: ${reasons}`)

            pushActivity({
                action: "Video Generation Blocked",
                details: reasons,
                source: "JobFinalizer",
                level: "error",
                metadata: { jobId: job.id }
            })

            return true
        }

        // Check for generated videos
        if (!operation.response?.generatedVideos || operation.response.generatedVideos.length === 0) {
            await updateJobStatus(job.id, "error", undefined, "No videos in response")
            return true
        }

        const generatedVideo = operation.response.generatedVideos[0]
        if (!generatedVideo.video) {
            await updateJobStatus(job.id, "error", undefined, "No video object in result")
            return true
        }

        // Download video bytes
        let videoBytes: string
        if (generatedVideo.video.videoBytes) {
            videoBytes = generatedVideo.video.videoBytes
        } else if (generatedVideo.video.uri) {
            log.info("Downloading video from URI", { uri: generatedVideo.video.uri })
            const response = await fetch(generatedVideo.video.uri)
            if (!response.ok) {
                throw new Error(`Failed to download video: ${response.statusText}`)
            }
            const buffer = await response.arrayBuffer()
            videoBytes = Buffer.from(buffer).toString("base64")
        } else {
            await updateJobStatus(job.id, "error", undefined, "No video data or URI in response")
            return true
        }

        // Upload to Vercel Blob
        const videoBuffer = Buffer.from(videoBytes, "base64")
        const filename = `generated/${job.id}.mp4`
        const blobUrl = await uploadFile(videoBuffer, filename, { contentType: "video/mp4" })

        log.info("Video uploaded to blob storage", { blobUrl })

        // Get input data for metadata
        const input = job.input as { prompt?: string; config?: any }
        const prompt = input.prompt || "Video generation"

        // Save to gallery
        const galleryId = await saveGalleryItem({
            type: "video",
            content: blobUrl,
            category: "art",
            title: `Motion Art: ${new Date().toLocaleDateString()}`,
            prompt: prompt,
            metadata: {
                mode: job.type,
                jobId: job.id,
                aspectRatio: input.config?.aspectRatio,
                generated_at: new Date().toISOString()
            }
        })

        // Add memory of the creation
        await addMemory({
            layer: "episodic",
            content: `Generated a video with prompt: ${prompt.slice(0, 100)}`,
            source: "video_generation",
            relevance: 0.6,
            tags: ["video", "creative", job.type]
        })

        // Push activity
        pushActivity({
            action: "Video Generation Complete",
            details: `Created ${job.type} video`,
            source: "JobFinalizer",
            level: "action",
            metadata: { galleryId, jobId: job.id }
        })

        // Update job status
        await updateJobStatus(job.id, "complete", {
            blobUrl,
            galleryId,
            prompt
        })

        log.action("Video job finalized successfully", { jobId: job.id, galleryId })

        return true

    } catch (error: any) {
        log.error("Failed to finalize video job", { jobId: job.id, error: error.message })

        await updateJobStatus(job.id, "error", undefined, error.message)

        pushActivity({
            action: "Video Finalization Failed",
            details: error.message,
            source: "JobFinalizer",
            level: "error",
            metadata: { jobId: job.id }
        })

        return true
    }
}

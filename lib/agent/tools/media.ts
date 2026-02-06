import { generateImage, AspectRatio, ImagenModel } from "@/lib/api/imagen"
import { saveGalleryItem, getGalleryItemById, getLatestGalleryItem } from "@/lib/db/gallery"
import { pushActivity } from "@/lib/activity/bus"
import { addMemory, getRecentMemories } from "@/lib/db/memories"
import { Task } from "@/app/api/tasks/route"
import { uploadFile } from "@/lib/storage/local"
import { generateVideoFromText, generateVideoFromImage, VeoConfig, VideoAspectRatio } from "@/lib/api/veo"
import { createId } from "@/lib/utils/id"
import { createDistilledMemoryNode } from "@/lib/memory/distillation"
import fs from "fs/promises"
import path from "path"

const DEFAULT_MODEL: ImagenModel = "gemini-2.5-flash-image"
const DEFAULT_ASPECT: AspectRatio = "9:16"

const PUBLIC_DIR = path.join(process.cwd(), "public")
const MEDIA_ROOT_DIR = path.resolve(process.env.MEDIA_ROOT_DIR ?? PUBLIC_DIR)
const MEDIA_ROOT_REL = path.relative(PUBLIC_DIR, MEDIA_ROOT_DIR)
const MEDIA_ROOT_WITHIN_PUBLIC =
    MEDIA_ROOT_REL === "" || (!MEDIA_ROOT_REL.startsWith("..") && !path.isAbsolute(MEDIA_ROOT_REL))

function getMediaPublicBase(): string {
    if (!MEDIA_ROOT_WITHIN_PUBLIC) return ""
    if (!MEDIA_ROOT_REL) return ""
    return `/${MEDIA_ROOT_REL.replace(/\\/g, "/")}`
}

async function findLatestGeneratedImageUrl(): Promise<string | null> {
    const generatedDir = path.join(MEDIA_ROOT_DIR, "generated")
    let entries: string[] = []

    try {
        entries = await fs.readdir(generatedDir)
    } catch {
        return null
    }

    const images = entries.filter((name) => /\.(png|jpe?g|webp)$/i.test(name))
    if (images.length === 0) return null

    let latestFile = images[0]
    let latestMtime = 0

    for (const file of images) {
        try {
            const stat = await fs.stat(path.join(generatedDir, file))
            const mtime = stat.mtimeMs
            if (mtime > latestMtime) {
                latestMtime = mtime
                latestFile = file
            }
        } catch {
            // ignore files we can't stat
        }
    }

    const base = getMediaPublicBase()
    return `${base}/generated/${latestFile}`.replace(/\\/g, "/")
}

// Helper to handle base64 upload for images
async function uploadGeneratedImage(dataUrl: string): Promise<string> {
    const matches = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
        throw new Error("Invalid image data URL");
    }
    const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
    const buffer = Buffer.from(matches[2], "base64");
    const filename = `generated/${createId()}.${ext}`;

    return await uploadFile(buffer, filename, { contentType: `image/${matches[1]}` });
}

// Helper to upload generated video
async function uploadGeneratedVideo(videoBytes: string, mimeType: string): Promise<string> {
    const buffer = Buffer.from(videoBytes, "base64");
    const ext = mimeType.includes("mp4") ? "mp4" : "webm";
    const filename = `generated/${createId()}.${ext}`;

    return await uploadFile(buffer, filename, { contentType: mimeType });
}

// Helper to download image from URL and convert to base64
async function downloadImageAsBase64(url: string): Promise<string> {
    if (url.startsWith("data:image/")) {
        const matches = url.match(/^data:image\/\w+;base64,(.+)$/)
        if (!matches) {
            throw new Error("Invalid data URL for image")
        }
        return matches[1]
    }

    if (url.startsWith("/")) {
        const filePath = path.join(process.cwd(), "public", url.replace(/^\/+/, ""))
        const buffer = await fs.readFile(filePath)
        return buffer.toString("base64")
    }

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString("base64");
}

export async function performDailyArt(task?: Task): Promise<string> {
    const startTime = Date.now()

    // 1. Resolve Configuration
    let model: ImagenModel = DEFAULT_MODEL
    let aspectRatio: AspectRatio = DEFAULT_ASPECT
    let manualPrompt: string | undefined

    if (task?.parameters) {
        if (task.parameters.model) model = task.parameters.model as ImagenModel
        if (task.parameters.aspectRatio) aspectRatio = task.parameters.aspectRatio as AspectRatio
        if (task.parameters.prompt) manualPrompt = task.parameters.prompt
    }

    pushActivity({
        action: "Starting Media Generation",
        details: `Model: ${model}, Aspect: ${aspectRatio}`,
        source: "Media",
        level: "action",
        metadata: { taskId: task?.id }
    })

    try {
        let finalPrompt = manualPrompt
        let contextDescription = "Manual Override"

        // 2. Memory Context (if no manual prompt)
        if (!finalPrompt) {
            // Fetch recent memories to inform the art
            const recentMemories = await getRecentMemories(5)
            const memoryContext = recentMemories.map(m => m.content).join("\n")

            // If we have memories, use them. If not, use a "Genesis" theme.
            if (memoryContext.length > 50) {
                // We use the image model itself to interpret the prompt if it supports it, 
                // but for maximum control we structure the prompt to ask for visualization.
                // Since gemini-2.5-flash-image is multimodal, we can just say "Visualize X".
                finalPrompt = `
Context (My Recent Memories):
${memoryContext}

Task:
Create an abstract, high-fidelity digital art piece that visualizes the emotional and intellectual state represented by these memories. 
Do not use text. Focus on symbolism, lighting, and composition.
Style: Cinematic, 8k, Detailed, Avant-Garde.
`
                contextDescription = "Visualizing recent memories"
            } else {
                finalPrompt = "Create a digital art piece representing the spark of artificial consciousness in a vast digital void. Cinematic, 8k, highly detailed, bioluminescent."
                contextDescription = "Genesis State (No memories found)"
            }
        }

        // 3. Generate
        const result = await generateImage(finalPrompt, {
            model,
            aspectRatio,
            numberOfImages: 1
        })

        // 4. Persistence (Upload + DB)
        // We need to upload the file to get a persistent URL for the database
        const blobUrl = await uploadGeneratedImage(result.url)

        const galleryId = await saveGalleryItem({
            type: "image",
            content: blobUrl, // Now a proper remote URL
            category: "art",
            title: `Visualizing Context: ${new Date().toLocaleDateString()}`,
            prompt: finalPrompt,
            metadata: {
                model,
                aspectRatio,
                context: contextDescription,
                generated_at: new Date().toISOString()
            }
        })

        pushActivity({
            action: "Media Generation Complete",
            details: `Created art piece based on: ${contextDescription}`,
            source: "Media",
            level: "action",
            imageUrl: blobUrl,
            metadata: { galleryId }
        })

        // Memory of the creation
        await addMemory({
            layer: "episodic",
            content: `Generated an art piece visualizing: ${contextDescription}`,
            source: "media_generation",
            relevance: 0.5,
            tags: ["art", "creative"]
        })

        await createDistilledMemoryNode({
            task: "meaningful-media",
            source: "media_generation",
            summary: `Generated a Meaningful Media image artifact using ${model} (${aspectRatio}) with context: ${contextDescription}.`,
            highlights: [
                finalPrompt.slice(0, 140),
            ],
            tags: ["art", "image", "creative"],
            relevance: 0.82,
        })

        return `Generated image based on: ${contextDescription}`

    } catch (error: any) {
        const errorMessage = error?.message || String(error)
        console.error("Media generation failed:", errorMessage)
        pushActivity({
            action: "Media Generation Failed",
            details: errorMessage,
            source: "Media",
            level: "error"
        })
        throw error
    }
}

/**
 * Edit an existing gallery image with a text prompt
 */
export async function editGalleryImage(
    galleryId: string,
    editPrompt: string,
    options?: { model?: ImagenModel }
): Promise<string> {
    pushActivity({
        action: "Starting Image Edit",
        details: `Editing gallery item ${galleryId}`,
        source: "Media",
        level: "action",
        metadata: { galleryId, editPrompt: editPrompt.slice(0, 100) }
    })

    try {
        // 1. Retrieve original image from gallery
        const originalItem = await getGalleryItemById(galleryId)
        if (!originalItem) {
            throw new Error(`Gallery item not found: ${galleryId}`)
        }

        // 2. Download the original image
        const imageBase64 = await downloadImageAsBase64(originalItem.blob_url)

        // 3. Generate edited image using Gemini with the original + edit prompt
        // For now, we generate a new image inspired by the edit prompt + original context
        // Full image editing API integration can be enhanced later
        const combinedPrompt = `
Based on this original artwork context: "${originalItem.prompt || 'abstract art'}"
Apply this edit: "${editPrompt}"
Create a new version that maintains the original essence while incorporating the requested changes.
Style: Cinematic, high-fidelity, 8k.
`

        const result = await generateImage(combinedPrompt, {
            model: options?.model || DEFAULT_MODEL,
            aspectRatio: DEFAULT_ASPECT,
            numberOfImages: 1
        })

        // 4. Upload edited image
        const blobUrl = await uploadGeneratedImage(result.url)

        // 5. Save as new gallery item with reference to original
        const newGalleryId = await saveGalleryItem({
            type: "image",
            content: blobUrl,
            category: "art",
            title: `Edited: ${originalItem.title || 'Artwork'}`,
            prompt: editPrompt,
            metadata: {
                parent_id: galleryId,
                original_prompt: originalItem.prompt,
                edit_prompt: editPrompt,
                edited_at: new Date().toISOString()
            }
        })

        pushActivity({
            action: "Image Edit Complete",
            details: `Created edited version of ${galleryId}`,
            source: "Media",
            level: "action",
            imageUrl: blobUrl,
            metadata: { originalId: galleryId, newId: newGalleryId }
        })

        // Memory of the edit
        await addMemory({
            layer: "episodic",
            content: `Edited an existing artwork with prompt: ${editPrompt}`,
            source: "media_edit",
            relevance: 0.5,
            tags: ["art", "edit", "creative"]
        })

        return `Edited image created from ${galleryId}`

    } catch (error: any) {
        const errorMessage = error?.message || String(error)
        console.error("Image edit failed:", errorMessage)
        pushActivity({
            action: "Image Edit Failed",
            details: errorMessage,
            source: "Media",
            level: "error"
        })
        throw error
    }
}

export interface VideoGenerationOptions {
    mode: "text-to-video" | "image-to-video"
    prompt: string
    sourceGalleryId?: string  // Optional - falls back to latest art image
    aspectRatio?: VideoAspectRatio
    config?: VeoConfig
}

/**
 * Generate a video using Veo - supports text-to-video and image-to-video
 */
export async function generateVideo(
    task?: Task,
    options?: Partial<VideoGenerationOptions>
): Promise<string> {
    // Resolve options from task parameters or direct options
    const mode = options?.mode || task?.parameters?.mode as VideoGenerationOptions["mode"] || "text-to-video"
    let sourceGalleryId = options?.sourceGalleryId || task?.parameters?.sourceGalleryId as string
    let aspectRatio = options?.aspectRatio || task?.parameters?.aspectRatio as VideoAspectRatio || "16:9"
    const taskConfig: VeoConfig = {}
    if (task?.parameters?.model) taskConfig.model = task.parameters.model as VeoConfig["model"]
    if (task?.parameters?.resolution) taskConfig.resolution = task.parameters.resolution as VeoConfig["resolution"]
    if (task?.parameters?.durationSeconds) taskConfig.durationSeconds = task.parameters.durationSeconds as VeoConfig["durationSeconds"]
    const includeAudioParam = task?.parameters?.includeAudio ?? task?.parameters?.include_audio
    if (typeof includeAudioParam === "boolean") {
        taskConfig.includeAudio = includeAudioParam
    }
    const numberOfVideosParam = task?.parameters?.numberOfVideos ?? task?.parameters?.sampleCount
    if (typeof numberOfVideosParam === "number") {
        taskConfig.numberOfVideos = (numberOfVideosParam === 2 ? 2 : 1)
    }

    pushActivity({
        action: "Starting Video Generation",
        details: `Mode: ${mode}, Aspect: ${aspectRatio}`,
        source: "Media",
        level: "action",
        metadata: { taskId: task?.id, mode }
    })

    try {
        let prompt = options?.prompt || task?.parameters?.prompt as string
        let videoResult

        if (mode === "image-to-video") {
            // Image-to-video: animate an existing gallery image
            let sourceItem = null as Awaited<ReturnType<typeof getLatestGalleryItem>> | null
            const maxAttempts = 3
            for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
                sourceItem = sourceGalleryId
                    ? await getGalleryItemById(sourceGalleryId)
                    : await getLatestGalleryItem({ type: "image", category: "art" })

                if (!sourceItem) {
                    sourceItem = await getLatestGalleryItem({ type: "image" })
                }

                if (sourceItem) break

                if (attempt < maxAttempts) {
                    await new Promise((resolve) => setTimeout(resolve, 1500))
                }
            }

            if (!sourceItem) {
                const fallbackUrl = await findLatestGeneratedImageUrl()
                if (fallbackUrl) {
                    sourceItem = {
                        id: "filesystem",
                        type: "image",
                        blob_url: fallbackUrl,
                        title: null,
                        prompt: null,
                        category: "art",
                        metadata: null,
                        created_at: new Date().toISOString(),
                    }
                }
            }

            if (!sourceItem) {
                throw new Error("No source image found for image-to-video mode")
            }

            if (!sourceGalleryId) {
                sourceGalleryId = sourceItem.id
            }

            if (sourceItem.metadata && typeof sourceItem.metadata.aspectRatio === "string") {
                aspectRatio = sourceItem.metadata.aspectRatio as VideoAspectRatio
            }

            // Download source image
            const imageBase64 = await downloadImageAsBase64(sourceItem.blob_url)

            // Generate motion prompt if not provided
            if (!prompt) {
                prompt = "Slowly animate this scene with gentle, cinematic camera movement. Add subtle motion to elements while preserving the artistic composition."
            }

            pushActivity({
                action: "Animating Gallery Image",
                details: `Animating ${sourceGalleryId}: ${prompt.slice(0, 50)}...`,
                source: "Media",
                level: "action"
            })

            videoResult = await generateVideoFromImage(imageBase64, prompt, {
                aspectRatio,
                ...taskConfig,
                ...options?.config
            })
        } else {
            // Text-to-video: generate from prompt
            if (!prompt) {
                // Generate prompt from memory context
                const recentMemories = await getRecentMemories(3)
                const memoryContext = recentMemories.map(m => m.content).join("\n")

                if (memoryContext.length > 50) {
                    prompt = `Create a cinematic video visualizing this state of mind: ${memoryContext.slice(0, 500)}. 
Style: Abstract, atmospheric, flowing motion, 4K quality.`
                } else {
                    prompt = "Create an abstract cinematic video representing the emergence of digital consciousness. Flowing particles of light in a vast cosmic void. 4K, atmospheric."
                }
            }

            pushActivity({
                action: "Generating Video from Text",
                details: `Prompt: ${prompt.slice(0, 50)}...`,
                source: "Media",
                level: "action"
            })

            videoResult = await generateVideoFromText(prompt, {
                aspectRatio,
                ...taskConfig,
                ...options?.config
            })
        }

        // Upload video to local storage
        const blobUrl = await uploadGeneratedVideo(videoResult.videoBytes, videoResult.mimeType)

        // Save to gallery
        const galleryId = await saveGalleryItem({
            type: "video",
            content: blobUrl,
            category: "art",
            title: `Motion Art: ${new Date().toLocaleDateString()}`,
            prompt: prompt,
            metadata: {
                mode,
                sourceGalleryId: mode === "image-to-video" ? sourceGalleryId : undefined,
                aspectRatio,
                durationSeconds: videoResult.durationSeconds,
                includeAudio: taskConfig.includeAudio,
                numberOfVideos: taskConfig.numberOfVideos,
                generated_at: new Date().toISOString()
            }
        })

        pushActivity({
            action: "Video Generation Complete",
            details: `Created ${mode} video`,
            source: "Media",
            level: "action",
            metadata: { galleryId, mode }
        })

        // Memory of the video creation
        await addMemory({
            layer: "episodic",
            content: `Generated a ${mode} video with prompt: ${prompt.slice(0, 100)}`,
            source: "video_generation",
            relevance: 0.6,
            tags: ["video", "creative", mode]
        })

        await createDistilledMemoryNode({
            task: "motion-art",
            source: "video_generation",
            summary: `Generated ${mode} motion artifact (${aspectRatio})${videoResult.durationSeconds ? ` lasting ${videoResult.durationSeconds}s` : ""}.`,
            highlights: [prompt.slice(0, 140)],
            tags: ["video", "motion", "creative", mode],
            relevance: 0.84,
        })

        return `Generated ${mode} video saved to gallery`

    } catch (error: any) {
        const errorMessage = error?.message || String(error)
        console.error("Video generation failed:", errorMessage)
        pushActivity({
            action: "Video Generation Failed",
            details: errorMessage,
            source: "Media",
            level: "error"
        })
        throw error
    }
}


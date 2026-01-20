import { generateImage, AspectRatio, ImagenModel } from "@/lib/api/imagen"
import { saveGalleryItem } from "@/lib/db/gallery"
import { pushActivity } from "@/lib/activity/bus"
import { addMemory, getRecentMemories } from "@/lib/db/memories"
import { Task } from "@/app/api/tasks/route"
import { uploadFile } from "@/lib/storage/blob"

const DEFAULT_MODEL: ImagenModel = "gemini-2.5-flash-image"
const DEFAULT_ASPECT: AspectRatio = "9:16"

// Helper to handle base64 upload
async function uploadGeneratedImage(dataUrl: string): Promise<string> {
    const matches = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
        throw new Error("Invalid image data URL");
    }
    const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
    const buffer = Buffer.from(matches[2], "base64");
    const filename = `generated/${crypto.randomUUID()}.${ext}`;

    return await uploadFile(buffer, filename, { contentType: `image/${matches[1]}` });
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
            image_url: blobUrl,
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

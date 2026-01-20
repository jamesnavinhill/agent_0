import { GoogleGenAI } from "@google/genai"
import dotenv from "dotenv"

// Load env vars
dotenv.config({ path: ".env.local" })

async function testVeo() {
    console.log("Testing Veo API with abstract prompt...")
    console.log("API Key present:", !!process.env.GOOGLE_API_KEY)

    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! })

    // Use abstract prompt to avoid content filters
    const prompt = "An abstract cinematic visualization of flowing light particles in a cosmic void. Ethereal, atmospheric, 4K quality, smooth camera movement through colorful nebulae."

    console.log("\n1. Starting video generation...")
    console.log("   Prompt:", prompt)
    console.log("   Model: veo-3.1-fast-generate-preview")

    try {
        let operation = await ai.models.generateVideos({
            model: "veo-3.1-fast-generate-preview",
            prompt: prompt,
            config: {
                aspectRatio: "16:9",
            },
        })

        console.log("\n2. Operation started:")
        console.log("   Operation name:", operation.name)

        // Poll for completion
        let attempts = 0
        const maxAttempts = 30

        while (!operation.done && attempts < maxAttempts) {
            attempts++
            console.log(`\n3. Polling attempt ${attempts}...`)

            await new Promise((resolve) => setTimeout(resolve, 10000))

            operation = await ai.operations.getVideosOperation({
                operation: operation,
            })
            console.log("   Done:", operation.done)
        }

        console.log("\n4. Operation completed!")
        console.log("   Full response:", JSON.stringify(operation.response, null, 2))

        // Check for content filter
        if (operation.response?.raiMediaFilteredCount && operation.response.raiMediaFilteredCount > 0) {
            console.error("\n❌ Content was blocked by Google content filters:")
            console.error("   Reasons:", operation.response.raiMediaFilteredReasons)
            return
        }

        if (operation.response?.generatedVideos && operation.response.generatedVideos.length > 0) {
            console.log("\n✅ Video generated successfully!")
            const video = operation.response.generatedVideos[0]
            console.log("   Video object keys:", Object.keys(video))
            if (video.video) {
                console.log("   Video property keys:", Object.keys(video.video))
                if (video.video.videoBytes) {
                    console.log("   Video bytes length:", video.video.videoBytes.length)
                }
                if (video.video.uri) {
                    console.log("   Video URI:", video.video.uri)
                }
            }
        } else {
            console.log("\n❌ No videos in response")
        }

    } catch (error: any) {
        console.error("\nERROR:", error.message)
        console.error("Full error:", JSON.stringify(error, null, 2))
    }
}

testVeo()

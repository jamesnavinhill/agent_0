import { generateImage, generateImages, isImagenConfigured, type ImagenConfig } from "@/lib/api/imagen"

export const maxDuration = 120

interface ImageRequest {
  prompt: string
  count?: number
  aspectRatio?: ImagenConfig["aspectRatio"]
  model?: ImagenConfig["model"]
}

export async function POST(req: Request) {
  try {
    const body: ImageRequest = await req.json()

    if (!body.prompt) {
      return Response.json({ error: "Prompt is required" }, { status: 400 })
    }

    if (!isImagenConfigured()) {
      return Response.json({ error: "GOOGLE_API_KEY not configured" }, { status: 500 })
    }

    const config: ImagenConfig = {
      aspectRatio: body.aspectRatio,
      model: body.model,
    }

    if (body.count && body.count > 1) {
      config.numberOfImages = Math.min(body.count, 4)
      const results = await generateImages(body.prompt, config)
      return Response.json({
        success: true,
        images: results.map(r => ({
          url: r.url,
          prompt: r.prompt,
          timestamp: r.timestamp.toISOString(),
        })),
      })
    }

    const result = await generateImage(body.prompt, config)
    return Response.json({
      success: true,
      image: {
        url: result.url,
        prompt: result.prompt,
        timestamp: result.timestamp.toISOString(),
      },
    })
  } catch (error) {
    console.error("Image generation error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}

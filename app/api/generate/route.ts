import { generateText } from "ai"

export const maxDuration = 120

export async function POST(req: Request) {
  const { prompt, type } = await req.json()

  // For image generation, use the Gemini model that supports image output
  if (type === "image") {
    const result = await generateText({
      model: "google/gemini-2.5-flash-image",
      prompt: `Create a detailed, artistic image based on this description: ${prompt}`,
      maxOutputTokens: 8192,
    })

    const images = []
    if (result.files) {
      for (const file of result.files) {
        if (file.mediaType.startsWith("image/")) {
          images.push({
            base64: file.base64,
            mediaType: file.mediaType,
          })
        }
      }
    }

    return Response.json({
      text: result.text,
      images,
      usage: result.usage,
    })
  }

  // For text generation
  const result = await generateText({
    model: "google/gemini-2.5-flash",
    prompt,
    maxOutputTokens: 4096,
  })

  return Response.json({
    text: result.text,
    usage: result.usage,
  })
}

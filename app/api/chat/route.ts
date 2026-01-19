import { chatStream, isConfigured, type ChatMessage } from "@/lib/api/gemini"

export const maxDuration = 60

interface RequestMessage {
  role: "user" | "assistant"
  content: string
}

export async function POST(req: Request) {
  const { messages }: { messages: RequestMessage[] } = await req.json()

  if (!isConfigured()) {
    return new Response(
      JSON.stringify({ error: "GOOGLE_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }

  const geminiMessages: ChatMessage[] = messages.map(msg => ({
    role: msg.role === "assistant" ? "model" : "user",
    content: msg.content,
  }))

  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of chatStream(geminiMessages)) {
          const data = JSON.stringify({ type: "text", content: chunk })
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))
        }
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`))
        controller.close()
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        const data = JSON.stringify({ type: "error", content: errorMessage })
        controller.enqueue(encoder.encode(`data: ${data}\n\n`))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  })
}

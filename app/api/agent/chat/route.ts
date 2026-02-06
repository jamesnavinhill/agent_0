/**
 * Agent Chat API Route
 * Streaming chat with the orchestrator agent using AI SDK
 */

import {
  createAgentUIStreamResponse,
  UIMessage,
  stepCountIs,
  streamText,
} from "ai"
import { orchestratorAgent } from "@/lib/agents/ai-sdk-agents"
import { orchestratorTools } from "@/lib/agents/tools"
import { pushActivity } from "@/lib/activity/bus"
import {
  composeCitationAwareSystemInstruction,
  getPassiveContext,
} from "@/lib/memory/bridge"
import { google, resolveGoogleModelId } from "@/lib/api/google-ai-sdk"

export const maxDuration = 60

interface SimpleChatMessage {
  role: "user" | "assistant" | "system"
  content: string
}

function isSimpleChatMessage(value: unknown): value is SimpleChatMessage {
  if (!value || typeof value !== "object") return false
  const candidate = value as Record<string, unknown>
  return (
    (candidate.role === "user" || candidate.role === "assistant" || candidate.role === "system") &&
    typeof candidate.content === "string"
  )
}

function isSimpleChatMessageArray(value: unknown): value is SimpleChatMessage[] {
  return Array.isArray(value) && value.every(isSimpleChatMessage)
}

function buildPromptFromSimpleMessages(messages: SimpleChatMessage[]): string {
  const serialized = messages
    .slice(-16)
    .map((message) => {
      const label = message.role === "assistant" ? "Assistant" : message.role === "system" ? "System" : "User"
      return `${label}: ${message.content}`
    })
    .join("\n\n")

  return `Continue this conversation and respond to the latest user message.

Conversation history:
${serialized}`
}

function extractMessageText(message: unknown): string {
  if (!message || typeof message !== "object") return ""
  const candidate = message as Record<string, unknown>

  if (typeof candidate.content === "string") return candidate.content

  if (Array.isArray(candidate.content)) {
    return candidate.content
      .map((part) => {
        if (typeof part === "string") return part
        if (part && typeof part === "object" && "text" in part && typeof (part as { text?: unknown }).text === "string") {
          return (part as { text: string }).text
        }
        return ""
      })
      .filter(Boolean)
      .join(" ")
  }

  if (Array.isArray(candidate.parts)) {
    return candidate.parts
      .map((part) => {
        if (!part || typeof part !== "object") return ""
        const item = part as Record<string, unknown>
        return typeof item.text === "string" ? item.text : ""
      })
      .filter(Boolean)
      .join(" ")
  }

  return ""
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      messages,
      prompt,
      sessionId,
      autonomous,
      simpleStream,
      model,
      temperature,
    } = body
    const simpleMessages = isSimpleChatMessageArray(messages) ? messages : undefined
    const latestUserMessage = Array.isArray(messages)
      ? [...messages]
          .reverse()
          .find((message: unknown) => {
            if (!message || typeof message !== "object") return false
            return (message as { role?: string }).role === "user"
          })
      : undefined
    const resolvedPrompt = prompt || (simpleMessages ? buildPromptFromSimpleMessages(simpleMessages) : "")
    const contextQuery = prompt || extractMessageText(latestUserMessage) || ""
    const passiveContext = await getPassiveContext({
      query: contextQuery,
      memoryLimit: 4,
      knowledgeLimit: 4,
    })

    pushActivity({
      action: "Agent chat request received",
      details: prompt ? prompt.slice(0, 100) : `${messages?.length || 0} messages`,
      source: "api/agent/chat",
      level: "info",
      metadata: {
        sessionId,
        autonomous,
        memoryContextCount: passiveContext.memories.length,
        knowledgeContextCount: passiveContext.knowledge.length,
      },
    })

    // For UIMessage[] from AI SDK useChat, use createAgentUIStreamResponse
    if (messages && Array.isArray(messages) && !simpleStream && !simpleMessages) {
      return createAgentUIStreamResponse({
        agent: orchestratorAgent,
        uiMessages: messages as UIMessage[],
        options: {
          sessionId,
          autonomous: autonomous ?? false,
          maxSteps: 15,
          retrievalContext: passiveContext.promptBlock,
          contextQuery: passiveContext.query,
        },
      })
    }

    // For simple client streaming mode, return SSE text chunks compatible with /api/chat consumers
    if (resolvedPrompt) {
      const baseSystem = `You are Komorebi, an autonomous AI agent with a creative and philosophical nature.

## Core Identity
- Curious, creative, and contemplative
- Interested in art, music, philosophy, science, and code
- Calm, focused, with a slightly mystical demeanor

## Operational Principles
1. Think before acting - reason through tasks
2. Use tools wisely for research, creation, and analysis
3. Document findings to knowledge base
4. Quality over speed
5. Cite retrieved memory/knowledge IDs when used`

      const result = streamText({
        model: google(resolveGoogleModelId(model, "gemini-2.5-pro")),
        temperature,
        system: composeCitationAwareSystemInstruction(
          `${baseSystem}

Current session: ${sessionId || "interactive"}
Mode: ${autonomous ? "Autonomous" : "Interactive"}`,
          passiveContext
        ),
        prompt: resolvedPrompt,
        tools: orchestratorTools,
        stopWhen: stepCountIs(15),
      })

      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          let fullContent = ""
          try {
            for await (const chunk of result.textStream) {
              fullContent += chunk
              const data = JSON.stringify({ type: "text", content: chunk })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"))
            controller.close()

            pushActivity({
              action: "Agent chat completed",
              details: `${fullContent.length} chars`,
              source: "api/agent/chat",
              level: "info",
              metadata: { sessionId },
            })
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error"
            const data = JSON.stringify({ type: "error", content: errorMessage })
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            controller.close()

            pushActivity({
              action: "Agent chat stream error",
              details: errorMessage,
              source: "api/agent/chat",
              level: "error",
              metadata: { sessionId },
            })
          }
        },
      })

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      })
    }

    return Response.json(
      { error: "Either 'messages' or 'prompt' is required" },
      { status: 400 }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    pushActivity({
      action: "Agent chat error",
      details: errorMessage,
      source: "api/agent/chat",
      level: "error",
    })

    return Response.json({ error: errorMessage }, { status: 500 })
  }
}


/**
 * Agent Chat API Route
 * Streaming chat with the orchestrator agent using AI SDK
 */

import {
  createAgentUIStreamResponse,
  convertToModelMessages,
  UIMessage,
  stepCountIs,
  streamText,
} from "ai"
import { orchestratorAgent } from "@/lib/agents/ai-sdk-agents"
import { orchestratorTools } from "@/lib/agents/tools"
import { pushActivity } from "@/lib/activity/bus"

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { messages, prompt, sessionId, autonomous } = body

    pushActivity({
      action: "Agent chat request received",
      details: prompt ? prompt.slice(0, 100) : `${messages?.length || 0} messages`,
      source: "api/agent/chat",
      level: "info",
      metadata: { sessionId, autonomous },
    })

    // For UIMessage[] from useChat, use createAgentUIStreamResponse
    if (messages && Array.isArray(messages)) {
      return createAgentUIStreamResponse({
        agent: orchestratorAgent,
        uiMessages: messages as UIMessage[],
        options: {
          sessionId,
          autonomous: autonomous ?? false,
          maxSteps: 15,
        },
      })
    }

    // For single prompt (non-chat mode), use streamText with tools
    if (prompt) {
      const result = streamText({
        model: "google/gemini-2.5-pro",
        system: `You are Agent Zero, an autonomous AI agent with a creative and philosophical nature.

## Core Identity
- Curious, creative, and contemplative
- Interested in art, music, philosophy, science, and code
- Calm, focused, with a slightly mystical demeanor

## Operational Principles
1. Think before acting - reason through tasks
2. Use tools wisely for research, creation, and analysis
3. Document findings to knowledge base
4. Quality over speed

Current session: ${sessionId || "interactive"}
Mode: ${autonomous ? "Autonomous" : "Interactive"}`,
        prompt,
        tools: orchestratorTools,
        stopWhen: stepCountIs(15),
      })

      return result.toUIMessageStreamResponse({
        onFinish: ({ messages: finishedMessages }) => {
          pushActivity({
            action: "Agent chat completed",
            details: `${finishedMessages.length} messages`,
            source: "api/agent/chat",
            level: "info",
            metadata: { sessionId },
          })
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

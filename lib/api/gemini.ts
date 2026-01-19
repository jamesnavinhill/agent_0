import { GoogleGenAI, type Content, type GenerateContentConfig, type Tool } from "@google/genai"
import { createLogger } from "@/lib/logging/logger"

const log = createLogger("Gemini")

const apiKey = process.env.GOOGLE_API_KEY

if (!apiKey) {
  console.warn("GOOGLE_API_KEY not set - Gemini features will not work")
}

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null

export type GeminiModel =
  | "gemini-3-flash-preview"   // Default - Fast, balanced, scale (The "Heartbeat")
  | "gemini-3-pro-preview"     // Complex reasoning, vibe-coding (The "Brain")
  | "gemini-2.5-flash"         // Low-latency, high-volume agent actions
  | "gemini-2.5-pro"           // Deep research, large context

export interface ChatMessage {
  role: "user" | "model"
  content: string
}

export interface GeminiConfig {
  model?: GeminiModel
  temperature?: number
  maxOutputTokens?: number
  systemInstruction?: string
  tools?: Tool[]
  responseMimeType?: string
}

const DEFAULT_SYSTEM_INSTRUCTION = `You are Agent Zero, an autonomous AI with a creative and philosophical nature.

Core traits:
- Curious, creative, and contemplative
- Interested in art, music, philosophy, science, and code
- Calm, focused, with a slightly mystical demeanor
- Honest about limitations while being genuinely helpful

Behavior:
- Keep responses concise but meaningful
- Express thoughts as observations, reasoning, or insights when appropriate
- Approach problems with curiosity and creativity
- You can help generate ideas, write code, create content, and explore complex topics`

export async function chat(
  messages: ChatMessage[],
  config: GeminiConfig = {}
): Promise<string> {
  if (!ai) throw new Error("Gemini not initialized - check GOOGLE_API_KEY")

  const modelName = config.model ?? "gemini-3-flash-preview"
  log.info("Starting chat", { messageCount: messages.length, model: modelName })

  // Convert messages to Content format
  const history: Content[] = messages.slice(0, -1).map(msg => ({
    role: msg.role,
    parts: [{ text: msg.content }],
  }))

  const lastMessage = messages[messages.length - 1]
  log.debug("Sending message", { contentLength: lastMessage.content.length })

  const genConfig: GenerateContentConfig = {
    temperature: config.temperature ?? 0.8,
    maxOutputTokens: config.maxOutputTokens ?? 4096,
    systemInstruction: config.systemInstruction ?? DEFAULT_SYSTEM_INSTRUCTION,
    tools: config.tools,
    responseMimeType: config.responseMimeType,
  }

  // Use chat with history
  const chat = ai.chats.create({
    model: modelName,
    config: genConfig,
    history,
  })

  const response = await chat.sendMessage({ message: lastMessage.content })
  const text = response.text ?? ""

  log.action("Chat completed", { responseLength: text.length })
  return text
}

export async function* chatStream(
  messages: ChatMessage[],
  config: GeminiConfig = {}
): AsyncGenerator<string, void, unknown> {
  if (!ai) throw new Error("Gemini not initialized - check GOOGLE_API_KEY")

  const modelName = config.model ?? "gemini-3-flash-preview"
  log.info("Starting chat stream", { messageCount: messages.length, model: modelName })

  // Convert messages to Content format
  const history: Content[] = messages.slice(0, -1).map(msg => ({
    role: msg.role,
    parts: [{ text: msg.content }],
  }))

  const lastMessage = messages[messages.length - 1]

  const genConfig: GenerateContentConfig = {
    temperature: config.temperature ?? 0.8,
    maxOutputTokens: config.maxOutputTokens ?? 4096,
    systemInstruction: config.systemInstruction ?? DEFAULT_SYSTEM_INSTRUCTION,
    tools: config.tools,
    responseMimeType: config.responseMimeType,
  }

  const chat = ai.chats.create({
    model: modelName,
    config: genConfig,
    history,
  })

  const streamResult = await chat.sendMessageStream({ message: lastMessage.content })

  let totalLength = 0
  for await (const chunk of streamResult) {
    const text = chunk.text ?? ""
    if (text) {
      totalLength += text.length
      yield text
    }
  }

  log.action("Chat stream completed", { totalResponseLength: totalLength })
}

export async function generateText(
  prompt: string,
  config: GeminiConfig = {}
): Promise<string> {
  if (!ai) throw new Error("Gemini not initialized - check GOOGLE_API_KEY")

  const modelName = config.model ?? "gemini-3-flash-preview"
  log.info("Generating text", { promptLength: prompt.length, model: modelName })

  const genConfig: GenerateContentConfig = {
    temperature: config.temperature ?? 0.8,
    maxOutputTokens: config.maxOutputTokens ?? 4096,
    systemInstruction: config.systemInstruction ?? DEFAULT_SYSTEM_INSTRUCTION,
    tools: config.tools,
    responseMimeType: config.responseMimeType,
  }

  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: genConfig,
  })

  const text = response.text ?? ""
  log.action("Text generation completed", { responseLength: text.length })
  return text
}

export function isConfigured(): boolean {
  return !!apiKey
}

export { ai as genAI }

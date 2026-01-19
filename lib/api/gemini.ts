import { GoogleGenerativeAI, type GenerativeModel, type GenerationConfig } from "@google/generative-ai"
import { createLogger } from "@/lib/logging/logger"

const log = createLogger("Gemini")

const apiKey = process.env.GOOGLE_API_KEY

if (!apiKey) {
  console.warn("GOOGLE_API_KEY not set - Gemini features will not work")
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null

export type GeminiModel = 
  | "gemini-2.0-flash" 
  | "gemini-2.0-pro" 
  | "gemini-1.5-flash" 
  | "gemini-1.5-pro"
  | "gemini-3-pro-preview"
  | "gemini-3-flash-preview"
  | "gemini-2.5-flash"
  | "gemini-2.5-pro"

export interface ChatMessage {
  role: "user" | "model"
  content: string
}

export interface GeminiConfig {
  model?: GeminiModel
  temperature?: number
  maxOutputTokens?: number
  systemInstruction?: string
  tools?: any[]
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

function getModel(config: GeminiConfig = {}): GenerativeModel | null {
  if (!genAI) return null

  const modelName = config.model ?? "gemini-2.0-flash"

  const generationConfig: GenerationConfig = {
    temperature: config.temperature ?? 0.8,
    maxOutputTokens: config.maxOutputTokens ?? 4096,
    responseMimeType: config.responseMimeType,
  }

  return genAI.getGenerativeModel({
    model: modelName,
    generationConfig,
    systemInstruction: config.systemInstruction ?? DEFAULT_SYSTEM_INSTRUCTION,
    tools: config.tools,
  })
}

export async function chat(
  messages: ChatMessage[],
  config: GeminiConfig = {}
): Promise<string> {
  const model = getModel(config)
  if (!model) throw new Error("Gemini not initialized - check GOOGLE_API_KEY")

  log.info("Starting chat", { messageCount: messages.length, model: config.model ?? "gemini-2.0-flash" })

  const chatSession = model.startChat({
    history: messages.slice(0, -1).map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }],
    })),
  })

  const lastMessage = messages[messages.length - 1]
  log.debug("Sending message", { contentLength: lastMessage.content.length })

  const result = await chatSession.sendMessage(lastMessage.content)
  const response = result.response.text()

  log.action("Chat completed", { responseLength: response.length })
  return response
}

export async function* chatStream(
  messages: ChatMessage[],
  config: GeminiConfig = {}
): AsyncGenerator<string, void, unknown> {
  const model = getModel(config)
  if (!model) throw new Error("Gemini not initialized - check GOOGLE_API_KEY")

  log.info("Starting chat stream", { messageCount: messages.length, model: config.model ?? "gemini-2.0-flash" })

  const chatSession = model.startChat({
    history: messages.slice(0, -1).map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }],
    })),
  })

  const lastMessage = messages[messages.length - 1]
  const result = await chatSession.sendMessageStream(lastMessage.content)

  let totalLength = 0
  for await (const chunk of result.stream) {
    const text = chunk.text()
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
  const model = getModel(config)
  if (!model) throw new Error("Gemini not initialized - check GOOGLE_API_KEY")

  log.info("Generating text", { promptLength: prompt.length, model: config.model ?? "gemini-2.0-flash" })

  const result = await model.generateContent(prompt)
  const response = result.response.text()

  log.action("Text generation completed", { responseLength: response.length })
  return response
}

export function isConfigured(): boolean {
  return !!apiKey
}

export { genAI }

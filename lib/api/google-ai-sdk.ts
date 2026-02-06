import { createGoogleGenerativeAI } from "@ai-sdk/google"

const DEFAULT_MODEL = "gemini-2.5-pro"

const apiKey =
  process.env.GOOGLE_API_KEY ||
  process.env.GOOGLE_GENERATIVE_AI_API_KEY

export const google = createGoogleGenerativeAI({
  apiKey,
})

export function resolveGoogleModelId(
  model: string | undefined,
  fallback = DEFAULT_MODEL
): string {
  const candidate = (model && model.trim()) || fallback
  return candidate.startsWith("google/")
    ? candidate.slice("google/".length)
    : candidate
}

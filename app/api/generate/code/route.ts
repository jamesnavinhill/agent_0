import { generateCode, generateCodeWithExplanation, refactorCode, explainCode } from "@/lib/api/code-gen"
import { isConfigured } from "@/lib/api/gemini"

export const maxDuration = 60

type ActionType = "generate" | "generate-with-explanation" | "refactor" | "explain"

interface CodeRequest {
  action: ActionType
  prompt?: string
  code?: string
  language?: string
  context?: string
  instructions?: string
}

export async function POST(req: Request) {
  try {
    const body: CodeRequest = await req.json()

    if (!isConfigured()) {
      return Response.json({ error: "GOOGLE_API_KEY not configured" }, { status: 500 })
    }

    const action = body.action || "generate"

    switch (action) {
      case "generate": {
        if (!body.prompt) {
          return Response.json({ error: "Prompt is required" }, { status: 400 })
        }
        const result = await generateCode({
          prompt: body.prompt,
          language: body.language,
          context: body.context,
        })
        return Response.json({ success: true, result })
      }

      case "generate-with-explanation": {
        if (!body.prompt) {
          return Response.json({ error: "Prompt is required" }, { status: 400 })
        }
        const result = await generateCodeWithExplanation({
          prompt: body.prompt,
          language: body.language,
          context: body.context,
        })
        return Response.json({ success: true, result })
      }

      case "refactor": {
        if (!body.code || !body.instructions || !body.language) {
          return Response.json(
            { error: "Code, instructions, and language are required for refactoring" },
            { status: 400 }
          )
        }
        const result = await refactorCode(body.code, body.instructions, body.language)
        return Response.json({ success: true, result })
      }

      case "explain": {
        if (!body.code || !body.language) {
          return Response.json(
            { error: "Code and language are required for explanation" },
            { status: 400 }
          )
        }
        const explanation = await explainCode(body.code, body.language)
        return Response.json({ success: true, explanation })
      }

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (error) {
    console.error("Code generation error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}

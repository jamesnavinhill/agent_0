"use client"

import { useState, useCallback } from "react"
import { useAgentStore } from "@/lib/store/agent-store"

interface CodeResult {
  code: string
  language: string
  explanation?: string
}

interface UseCodeGenerationReturn {
  generateCode: (prompt: string, language?: string, context?: string) => Promise<CodeResult>
  refactor: (code: string, instructions: string, language: string) => Promise<CodeResult>
  explain: (code: string, language: string) => Promise<string>
  isGenerating: boolean
  error: string | null
  lastGenerated: CodeResult | null
}

export function useCodeGeneration(): UseCodeGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastGenerated, setLastGenerated] = useState<CodeResult | null>(null)
  
  const { setState, addOutput, addActivity, updateActivity, addThought } = useAgentStore()

  const generateCode = useCallback(async (
    prompt: string,
    language?: string,
    context?: string
  ): Promise<CodeResult> => {
    setIsGenerating(true)
    setError(null)
    setState("creating")

    const activityId = crypto.randomUUID()
    addActivity("Generating code", `${language ?? "code"}: "${prompt.slice(0, 50)}..."`)
    addThought(`Writing ${language ?? "code"}: "${prompt.slice(0, 60)}"`, "action")

    try {
      const response = await fetch("/api/generate/code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-with-explanation",
          prompt,
          language,
          context,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate code")
      }

      const result: CodeResult = data.result
      
      addOutput({
        type: "code",
        content: result.code,
        title: prompt.slice(0, 50),
        category: "code",
        metadata: {
          language: result.language,
          prompt,
        },
      })

      updateActivity(activityId, "complete")
      addThought(`Generated ${result.language} code successfully`, "observation")
      
      setLastGenerated(result)
      setState("idle")
      
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      setError(message)
      updateActivity(activityId, "error")
      addThought(`Code generation failed: ${message}`, "observation")
      setState("error")
      throw err
    } finally {
      setIsGenerating(false)
    }
  }, [setState, addOutput, addActivity, updateActivity, addThought])

  const refactor = useCallback(async (
    code: string,
    instructions: string,
    language: string
  ): Promise<CodeResult> => {
    setIsGenerating(true)
    setError(null)
    setState("thinking")

    addThought(`Refactoring ${language} code: "${instructions.slice(0, 60)}"`, "action")

    try {
      const response = await fetch("/api/generate/code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "refactor",
          code,
          instructions,
          language,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to refactor code")
      }

      setLastGenerated(data.result)
      setState("idle")
      
      return data.result
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      setError(message)
      setState("error")
      throw err
    } finally {
      setIsGenerating(false)
    }
  }, [setState, addThought])

  const explain = useCallback(async (
    code: string,
    language: string
  ): Promise<string> => {
    setIsGenerating(true)
    setError(null)
    setState("thinking")

    addThought(`Analyzing ${language} code...`, "reasoning")

    try {
      const response = await fetch("/api/generate/code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "explain",
          code,
          language,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to explain code")
      }

      setState("idle")
      return data.explanation
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      setError(message)
      setState("error")
      throw err
    } finally {
      setIsGenerating(false)
    }
  }, [setState, addThought])

  return {
    generateCode,
    refactor,
    explain,
    isGenerating,
    error,
    lastGenerated,
  }
}

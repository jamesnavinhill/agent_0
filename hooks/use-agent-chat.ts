"use client"

import { useState, useCallback, useRef } from "react"
import { useAgentStore } from "@/lib/store/agent-store"
import { useSettings } from "@/hooks/use-settings"
import { createId } from "@/lib/utils/id"

export type ChatStatus = "idle" | "loading" | "streaming" | "error"

interface UseAgentChatOptions {
  onStreamStart?: () => void
  onStreamEnd?: (content: string) => void
  onError?: (error: Error) => void
}

export function useAgentChat(options: UseAgentChatOptions = {}) {
  const [status, setStatus] = useState<ChatStatus>("idle")
  const [streamingContent, setStreamingContent] = useState("")
  const abortControllerRef = useRef<AbortController | null>(null)
  
  const { messages, addMessage, setState, addThought, addActivity, updateActivity } = useAgentStore()
  const { settings } = useSettings()

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    addMessage("user", content)
    setState("thinking")
    setStatus("loading")
    setStreamingContent("")
    
    addThought(`Received: "${content.slice(0, 50)}${content.length > 50 ? "..." : ""}"`, "observation")
    
    const activityId = createId()
    addActivity("Processing message", content.slice(0, 100))
    
    const chatMessages = [
      ...messages.map(m => ({ role: m.role, content: m.content })),
      { role: "user" as const, content }
    ]

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: chatMessages,
          model: settings.model,
          temperature: settings.temperature,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      if (!response.body) {
        throw new Error("No response body")
      }

      setStatus("streaming")
      setState("thinking")
      options.onStreamStart?.()
      addThought("Formulating response...", "reasoning")

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split("\n")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim()
            if (data === "[DONE]") continue
            
            try {
              const parsed = JSON.parse(data)
              if (parsed.type === "text") {
                fullContent += parsed.content
                setStreamingContent(fullContent)
              } else if (parsed.type === "error") {
                throw new Error(parsed.content)
              }
            } catch (e) {
              if (data !== "[DONE]") {
                console.warn("Failed to parse SSE data:", data)
              }
            }
          }
        }
      }

      addMessage("assistant", fullContent)
      setState("idle")
      setStatus("idle")
      setStreamingContent("")
      addThought("Response complete.", "decision")
      options.onStreamEnd?.(fullContent)
      
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        setStatus("idle")
        setState("idle")
        return
      }
      
      console.error("Chat error:", error)
      setState("error")
      setStatus("error")
      addThought(`Error: ${(error as Error).message}`, "observation")
      options.onError?.(error as Error)
      
      setTimeout(() => {
        setState("idle")
        setStatus("idle")
      }, 3000)
    }
  }, [messages, addMessage, setState, addThought, addActivity, options, settings.model, settings.temperature])

  const abort = useCallback(() => {
    abortControllerRef.current?.abort()
    setStatus("idle")
    setState("idle")
  }, [setState])

  return {
    sendMessage,
    abort,
    status,
    streamingContent,
    isStreaming: status === "streaming",
    isLoading: status === "loading" || status === "streaming",
  }
}

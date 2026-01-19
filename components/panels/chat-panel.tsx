"use client"

import { useAgentStore } from "@/lib/store/agent-store"
import { cn } from "@/lib/utils"
import { useRef, useEffect } from "react"
import { AgentOrb } from "@/components/agent/agent-orb"

export function ChatPanel() {
  const { messages, state } = useAgentStore()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
            <AgentOrb size="lg" />
            <div className="space-y-2 max-w-md">
              <h2 className="text-xl font-medium text-foreground">Agent Zero</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                A multimodal AI agent ready for creative exploration, research, and autonomous task execution. 
                Speak, type, or upload files to begin.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "flex gap-3 max-w-3xl",
                msg.role === "user" ? "ml-auto flex-row-reverse" : ""
              )}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <div className="w-4 h-4 rounded-full bg-accent" />
                </div>
              )}
              <div
                className={cn(
                  "px-4 py-3 rounded-2xl",
                  msg.role === "user"
                    ? "bg-accent text-accent-foreground rounded-br-md"
                    : "bg-surface-2 text-foreground rounded-bl-md"
                )}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                <span className="text-[10px] opacity-50 mt-1 block">
                  {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          ))
        )}
        
        {/* Typing indicator */}
        {(state === "thinking" || state === "creating") && (
          <div className="flex gap-3 max-w-3xl">
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
              <div className="w-4 h-4 rounded-full bg-accent animate-pulse" />
            </div>
            <div className="px-4 py-3 rounded-2xl bg-surface-2 rounded-bl-md">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

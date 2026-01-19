"use client"

import React from "react"

import { useAgentStore, type ThoughtEntry } from "@/lib/store/agent-store"
import { cn } from "@/lib/utils"
import { useEffect, useRef } from "react"
import { Brain, Lightbulb, GitBranch, Zap } from "lucide-react"

const thoughtIcons: Record<ThoughtEntry["type"], React.ElementType> = {
  observation: Brain,
  reasoning: GitBranch,
  decision: Lightbulb,
  action: Zap,
}

const thoughtColors: Record<ThoughtEntry["type"], string> = {
  observation: "text-blue-400 bg-blue-400/10",
  reasoning: "text-purple-400 bg-purple-400/10",
  decision: "text-amber-400 bg-amber-400/10",
  action: "text-accent bg-accent/10",
}

export function ThoughtsPanel() {
  const { thoughts, state } = useAgentStore()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [thoughts])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium">Thought Stream</span>
        </div>
        <div className={cn(
          "w-2 h-2 rounded-full",
          state === "thinking" || state === "creating" 
            ? "bg-accent animate-pulse" 
            : "bg-muted"
        )} />
      </div>
      
      {/* Thoughts stream */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {thoughts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <Brain className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">Thoughts will appear here as the agent processes</p>
          </div>
        ) : (
          thoughts.map((thought) => {
            const Icon = thoughtIcons[thought.type]
            return (
              <div
                key={thought.id}
                className="flex gap-3 animate-in slide-in-from-bottom-2 duration-300"
              >
                <div className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                  thoughtColors[thought.type]
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground leading-relaxed">{thought.content}</p>
                  <span className="text-[10px] text-muted-foreground mt-1 block">
                    {thought.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                </div>
              </div>
            )
          })
        )}
        
        {/* Active thinking indicator */}
        {state === "thinking" && (
          <div className="flex gap-3 items-center text-muted-foreground">
            <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            </div>
            <span className="text-sm">Processing...</span>
          </div>
        )}
      </div>
    </div>
  )
}

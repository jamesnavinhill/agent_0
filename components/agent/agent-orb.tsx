"use client"

import { useAgentStore, type AgentState } from "@/lib/store/agent-store"
import { cn } from "@/lib/utils"
import { useMemo } from "react"

interface StateConfig {
  label: string
  orbAnimation: string
  glowAnimation: string
  colorClass: string
  rings: number
  particles: boolean
}

const stateConfig: Record<AgentState, StateConfig> = {
  idle: {
    label: "Ready",
    orbAnimation: "animate-breathe-deep",
    glowAnimation: "",
    colorClass: "orb-idle",
    rings: 2,
    particles: false,
  },
  listening: {
    label: "Listening",
    orbAnimation: "animate-breathe",
    glowAnimation: "animate-pulse-glow",
    colorClass: "orb-listening",
    rings: 3,
    particles: false,
  },
  thinking: {
    label: "Processing",
    orbAnimation: "animate-think-pulse",
    glowAnimation: "animate-pulse-glow",
    colorClass: "orb-thinking",
    rings: 4,
    particles: true,
  },
  creating: {
    label: "Creating",
    orbAnimation: "animate-create-glow",
    glowAnimation: "",
    colorClass: "orb-creating",
    rings: 5,
    particles: true,
  },
  speaking: {
    label: "Speaking",
    orbAnimation: "animate-breathe",
    glowAnimation: "animate-pulse-glow",
    colorClass: "orb-speaking",
    rings: 3,
    particles: false,
  },
  error: {
    label: "Error",
    orbAnimation: "animate-error",
    glowAnimation: "",
    colorClass: "orb-error",
    rings: 1,
    particles: false,
  },
}

interface AgentOrbProps {
  size?: "sm" | "md" | "lg"
  showLabel?: boolean
}

export function AgentOrb({ size = "md", showLabel = true }: AgentOrbProps) {
  const state = useAgentStore((s) => s.state)
  const config = stateConfig[state]

  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-24 h-24",
    lg: "w-32 h-32",
  }

  const particles = useMemo(() => {
    if (!config.particles) return []
    return Array.from({ length: 6 }).map((_, i) => ({
      id: i,
      delay: i * 0.5,
      duration: 4 + Math.random() * 2,
      size: 2 + Math.random() * 2,
    }))
  }, [config.particles])

  return (
    <div className={cn("flex flex-col items-center gap-3", config.colorClass)}>
      <div className={cn("relative", sizeClasses[size])}>
        {/* Animated expanding rings */}
        {state !== "idle" && state !== "error" && (
          <>
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={`expand-${i}`}
                className="absolute inset-0 rounded-full border border-accent/30 animate-ring-expand"
                style={{
                  animationDelay: `${i * 1}s`,
                  animationDuration: "2s",
                }}
              />
            ))}
          </>
        )}

        {/* Static rings */}
        {Array.from({ length: config.rings }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "absolute inset-0 rounded-full border transition-all duration-500",
              state === "error"
                ? "border-destructive/30"
                : "border-accent/20"
            )}
            style={{
              transform: `scale(${1 + (i + 1) * 0.12})`,
              opacity: 1 - i * 0.2,
              animation:
                state !== "idle" && state !== "error"
                  ? `pulse ${2 + i * 0.3}s ease-in-out infinite ${i * 0.15}s`
                  : undefined,
            }}
          />
        ))}

        {/* Orbiting particles for thinking/creating */}
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute inset-0 flex items-center justify-center"
            style={{
              animation: `orbit ${particle.duration}s linear infinite`,
              animationDelay: `${particle.delay}s`,
            }}
          >
            <div
              className="rounded-full bg-accent/60"
              style={{
                width: particle.size,
                height: particle.size,
                boxShadow: "0 0 6px var(--accent-glow)",
              }}
            />
          </div>
        ))}

        {/* Core orb */}
        <div
          className={cn(
            "absolute inset-0 rounded-full transition-all duration-300",
            "bg-gradient-to-br from-accent/80 via-accent/60 to-accent/40",
            "shadow-[0_0_30px_var(--accent-glow)]",
            config.orbAnimation,
            config.glowAnimation,
            state === "error" &&
              "from-destructive/80 via-destructive/60 to-destructive/40 shadow-[0_0_30px_rgba(239,68,68,0.3)]"
          )}
        >
          {/* Inner gradient highlight */}
          <div className="absolute inset-[10%] rounded-full bg-gradient-to-br from-white/25 via-white/10 to-transparent" />

          {/* Core light */}
          <div
            className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
              "w-1/3 h-1/3 rounded-full bg-white/30 blur-sm",
              state === "thinking" && "animate-pulse"
            )}
          />

          {/* Shimmer overlay for creating state */}
          {state === "creating" && (
            <div className="absolute inset-0 rounded-full animate-shimmer overflow-hidden" />
          )}
        </div>

        {/* Thinking spinner overlay */}
        {state === "thinking" && (
          <svg
            className="absolute inset-0 w-full h-full animate-thinking"
            viewBox="0 0 100 100"
          >
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="50 150"
              strokeLinecap="round"
              className="text-accent/70"
            />
            <circle
              cx="50"
              cy="50"
              r="38"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="30 120"
              strokeLinecap="round"
              className="text-accent/40"
              style={{ animationDirection: "reverse" }}
            />
          </svg>
        )}

        {/* Audio waveform for speaking/listening */}
        {(state === "listening" || state === "speaking") && (
          <div className="absolute inset-0 flex items-center justify-center gap-[3px]">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="w-[3px] bg-white/70 rounded-full animate-wave"
                style={{
                  height: `${25 + Math.random() * 35}%`,
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: `${0.4 + Math.random() * 0.3}s`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {showLabel && (
        <span
          className={cn(
            "text-xs font-medium tracking-wide uppercase transition-colors duration-300",
            state === "error" ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {config.label}
        </span>
      )}
    </div>
  )
}

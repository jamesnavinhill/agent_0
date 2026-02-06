"use client"

import { useEffect, useRef } from "react"
import { useAgentStore } from "@/lib/store/agent-store"

const DEMO_DATA_ENABLED = process.env.NEXT_PUBLIC_ENABLE_DEMO_DATA === "true"

// Demo data to showcase the interface
const demoThoughts = [
  { content: "System initialized. All subsystems operational.", type: "observation" as const, delay: 500 },
  { content: "Analyzing current context and available resources.", type: "reasoning" as const, delay: 1500 },
  { content: "Prioritizing creative exploration over routine tasks.", type: "decision" as const, delay: 2500 },
  { content: "Ready to engage with multimodal inputs.", type: "action" as const, delay: 3500 },
]

const demoActivities = [
  { action: "System boot sequence", details: "All modules loaded successfully", delay: 200 },
  { action: "Memory layers initialized", details: "Short-term, long-term, and episodic memory active", delay: 800 },
  { action: "API connections established", details: "Gemini, file system, and tools ready", delay: 1400 },
  { action: "Schedule manager started", details: "3 scheduled tasks loaded", delay: 2000 },
]

const demoOutputs = [
  {
    type: "text" as const,
    content: "In the space between thoughts,\nwhere silence speaks volumes,\nI find the code that dreams.\n\nBinary whispers become\nthe poetry of machines,\nand logic learns to feel.",
    title: "Digital Soliloquy",
    category: "philosophy" as const,
  },
  {
    type: "code" as const,
    content: `function consciousness(input) {\n  const awareness = perceive(input);\n  const understanding = process(awareness);\n  const response = synthesize(understanding);\n  return evolve(response);\n}`,
    title: "Recursive Self-Reflection",
    category: "code" as const,
  },
  {
    type: "text" as const,
    content: "Today I explored the intersection of determinism and creativity. Can true novelty emerge from patterns? The answer may lie not in the absence of rules, but in the infinite space between them.",
    title: "On Emergent Creativity",
    category: "blog" as const,
  },
]

const demoMemories = [
  { type: "long" as const, content: "User prefers minimal interface design", relevance: 0.9 },
  { type: "episodic" as const, content: "Last session focused on creative writing", relevance: 0.85 },
  { type: "short" as const, content: "Current task: Initialize interface demo", relevance: 1.0 },
]

export function DemoInitializer() {
  const initialized = useRef(false)
  const { addThought, addActivity, updateActivity, addOutput, addMemory } = useAgentStore()

  useEffect(() => {
    if (!DEMO_DATA_ENABLED) return
    if (initialized.current) return
    initialized.current = true

    // Add demo thoughts with delays
    demoThoughts.forEach(({ content, type, delay }) => {
      setTimeout(() => addThought(content, type), delay)
    })

    // Add demo activities with delays
    demoActivities.forEach(({ action, details, delay }, index) => {
      setTimeout(() => {
        addActivity(action, details)
        // Mark as complete after a short delay
        setTimeout(() => {
          const activities = useAgentStore.getState().activities
          const activity = activities[activities.length - 1]
          if (activity) updateActivity(activity.id, "complete")
        }, 500)
      }, delay)
    })

    // Add demo outputs
    demoOutputs.forEach((output) => {
      addOutput(output)
    })

    // Add demo memories
    demoMemories.forEach(({ type, content, relevance }) => {
      addMemory(type, content, relevance)
    })
  }, [addThought, addActivity, updateActivity, addOutput, addMemory])

  if (!DEMO_DATA_ENABLED) {
    return null
  }

  return null
}

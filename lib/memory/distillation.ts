import { pushActivity } from "@/lib/activity/bus"
import { addMemory } from "@/lib/db/memories"

export type DistillationTaskType =
  | "morning-read"
  | "meaningful-media"
  | "motion-art"
  | "morning-ritual"

export interface DistilledMemoryInput {
  task: DistillationTaskType
  summary: string
  highlights?: string[]
  source: string
  tags?: string[]
  relevance?: number
}

function compactText(text: string, maxLength = 180): string {
  const normalized = text.replace(/\s+/g, " ").trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 3)}...`
}

function taskLabel(task: DistillationTaskType): string {
  switch (task) {
    case "morning-read":
      return "Morning Read"
    case "meaningful-media":
      return "Meaningful Media"
    case "motion-art":
      return "Motion Art"
    case "morning-ritual":
      return "Morning Ritual"
    default:
      return task
  }
}

function uniqueTags(task: DistillationTaskType, tags: string[] | undefined): string[] {
  const base = ["distilled", "task", task]
  return Array.from(new Set([...base, ...(tags ?? [])]))
}

function buildContent(input: DistilledMemoryInput): string {
  const summary = compactText(input.summary, 220)
  const highlights = (input.highlights ?? [])
    .map((entry) => compactText(entry, 120))
    .filter(Boolean)
    .slice(0, 3)

  if (highlights.length === 0) {
    return `[Distilled ${taskLabel(input.task)}] ${summary}`
  }

  return `[Distilled ${taskLabel(input.task)}] ${summary}\nHighlights: ${highlights.join(" | ")}`
}

export async function createDistilledMemoryNode(input: DistilledMemoryInput): Promise<boolean> {
  try {
    const content = buildContent(input)
    const success = await addMemory({
      layer: "semantic",
      content,
      source: input.source,
      relevance: input.relevance ?? 0.85,
      tags: uniqueTags(input.task, input.tags),
    })

    if (success) {
      pushActivity({
        action: "Distilled memory saved",
        details: `${taskLabel(input.task)} -> semantic memory node`,
        source: "memory-distillation",
        level: "info",
      })
    }

    return success
  } catch (error) {
    console.error("[Distillation] Failed to create distilled memory node:", error)
    return false
  }
}

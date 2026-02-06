import { isDatabaseConfigured } from "@/lib/db/neon"
import {
  recallMemories,
  type RecallMemoryOptions,
  type RecalledMemoryEntry,
} from "@/lib/db/memories"
import {
  searchKnowledge,
  type SearchedKnowledgeItem,
} from "@/lib/db/knowledge"

export interface PassiveContextOptions {
  query: string
  memoryLayer?: RecallMemoryOptions["layer"]
  memoryLimit?: number
  knowledgeLimit?: number
  knowledgeTags?: string[]
}

export interface PassiveContextResult {
  query: string
  memories: RecalledMemoryEntry[]
  knowledge: SearchedKnowledgeItem[]
  hasContext: boolean
  promptBlock: string
}

function clampLimit(limit: number | undefined, fallback: number): number {
  if (!limit || Number.isNaN(limit)) return fallback
  return Math.max(1, Math.min(limit, 10))
}

function compactText(text: string, maxLength = 260): string {
  const normalized = text.replace(/\s+/g, " ").trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 3)}...`
}

function formatTags(tags: string[] | null | undefined): string {
  if (!tags || tags.length === 0) return "none"
  return tags.join(", ")
}

function formatMemoryEntries(memories: RecalledMemoryEntry[]): string {
  return memories
    .map((memory) => {
      const source = memory.source || "unknown"
      const createdAt = new Date(memory.created_at).toISOString()
      return [
        `- [memory:${memory.id}] layer=${memory.layer}; source=${source}; score=${memory.score.toFixed(2)}; created=${createdAt}; tags=${formatTags(memory.tags)}`,
        `  ${compactText(memory.content)}`,
      ].join("\n")
    })
    .join("\n")
}

function formatKnowledgeEntries(knowledge: SearchedKnowledgeItem[]): string {
  return knowledge
    .map((item) => {
      const createdAt = new Date(item.created_at).toISOString()
      const lines = [
        `- [knowledge:${item.id}] title="${compactText(item.title, 120)}"; score=${item.score.toFixed(2)}; created=${createdAt}; tags=${formatTags(item.tags)}`,
        `  summary: ${compactText(item.summary ?? "")}`,
      ]

      if (item.url) {
        lines.push(`  url: ${item.url}`)
      }

      return lines.join("\n")
    })
    .join("\n")
}

export const CITATION_POLICY = `If you reference retrieved memory or knowledge, append inline citations with exact IDs:
- Memory citation format: [memory:<id>]
- Knowledge citation format: [knowledge:<id>]
Never invent citations. If context is unavailable, answer without citations.`

export function composeCitationAwareSystemInstruction(
  baseInstruction: string,
  context: PassiveContextResult
): string {
  const retrievalBlock = context.hasContext
    ? context.promptBlock
    : "## Retrieved Context\nNo relevant stored memory or knowledge was found for this request."

  return `${baseInstruction}

## Memory Bridge
${CITATION_POLICY}

${retrievalBlock}`
}

export async function getPassiveContext(
  options: PassiveContextOptions
): Promise<PassiveContextResult> {
  const query = options.query.trim()

  if (!isDatabaseConfigured()) {
    return {
      query,
      memories: [],
      knowledge: [],
      hasContext: false,
      promptBlock: "",
    }
  }

  try {
    const memoryLimit = clampLimit(options.memoryLimit, 4)
    const knowledgeLimit = clampLimit(options.knowledgeLimit, 4)

    const [memories, knowledge] = await Promise.all([
      recallMemories(query, { layer: options.memoryLayer, limit: memoryLimit }),
      searchKnowledge(query, {
        limit: knowledgeLimit,
        tags: options.knowledgeTags,
      }),
    ])

    const sections: string[] = ["## Retrieved Context"]

    if (memories.length > 0) {
      sections.push("### Memories")
      sections.push(formatMemoryEntries(memories))
    } else {
      sections.push("### Memories")
      sections.push("- none")
    }

    if (knowledge.length > 0) {
      sections.push("### Knowledge")
      sections.push(formatKnowledgeEntries(knowledge))
    } else {
      sections.push("### Knowledge")
      sections.push("- none")
    }

    return {
      query,
      memories,
      knowledge,
      hasContext: memories.length > 0 || knowledge.length > 0,
      promptBlock: sections.join("\n"),
    }
  } catch (error) {
    console.error("[MemoryBridge] Failed to build passive context:", error)
    return {
      query,
      memories: [],
      knowledge: [],
      hasContext: false,
      promptBlock: "",
    }
  }
}

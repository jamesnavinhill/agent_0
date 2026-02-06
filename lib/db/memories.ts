import { sql } from "./neon"

export interface MemoryEntry {
    id: string
    layer: "shortTerm" | "longTerm" | "episodic" | "semantic"
    content: string
    source?: string
    relevance: number
    tags: string[]
    created_at: Date
}

export interface RecallMemoryOptions {
    layer?: MemoryEntry["layer"]
    limit?: number
}

export interface RecalledMemoryEntry extends MemoryEntry {
    score: number
}

function clampLimit(limit: number | undefined, fallback: number): number {
    if (!limit || Number.isNaN(limit)) return fallback
    return Math.max(1, Math.min(limit, 20))
}

function escapeLikePattern(input: string): string {
    return input.replace(/[\\%_]/g, "\\$&")
}

export async function addMemory(entry: Omit<MemoryEntry, "id" | "created_at">): Promise<boolean> {
    try {
        await sql(`
      INSERT INTO memories (layer, content, source, relevance, tags)
      VALUES ($1, $2, $3, $4, $5)
    `, [entry.layer, entry.content, entry.source, entry.relevance, entry.tags])
        console.log(`[Memory] Saved: ${entry.content.slice(0, 50)}...`)
        return true
    } catch (error) {
        console.error(`[Memory] Failed to save: ${entry.content}`, error)
        return false
    }
}

export async function getRecentMemories(limit = 10, layer?: string): Promise<MemoryEntry[]> {
    if (layer) {
        return await sql<MemoryEntry>(`
      SELECT id, layer, content, source, relevance, tags, created_at 
      FROM memories 
      WHERE layer = $2
      ORDER BY created_at DESC 
      LIMIT $1
    `, [limit, layer])
    }
    return await sql<MemoryEntry>(`
    SELECT id, layer, content, source, relevance, tags, created_at 
    FROM memories 
    ORDER BY created_at DESC 
    LIMIT $1
  `, [limit])
}

export async function recallMemories(
    query: string,
    options: RecallMemoryOptions = {}
): Promise<RecalledMemoryEntry[]> {
    const limit = clampLimit(options.limit, 5)
    const layer = options.layer
    const normalizedQuery = query.trim()

    if (!normalizedQuery) {
        const recent = await getRecentMemories(limit, layer)
        return recent.map((memory) => ({ ...memory, score: memory.relevance ?? 0 }))
    }

    const likeQuery = `%${escapeLikePattern(normalizedQuery)}%`

    return await sql<RecalledMemoryEntry>(
        `
      SELECT
        id,
        layer,
        content,
        source,
        relevance,
        tags,
        created_at,
        (
          CASE WHEN content ILIKE $2 ESCAPE '\\' THEN 4 ELSE 0 END +
          CASE WHEN COALESCE(source, '') ILIKE $2 ESCAPE '\\' THEN 2 ELSE 0 END +
          CASE
            WHEN EXISTS (
              SELECT 1
              FROM unnest(COALESCE(tags, ARRAY[]::text[])) AS tag
              WHERE tag ILIKE $2 ESCAPE '\\'
            )
            THEN 1
            ELSE 0
          END +
          COALESCE(relevance, 0)
        ) AS score
      FROM memories
      WHERE ($3::text IS NULL OR layer = $3)
        AND (
          content ILIKE $2 ESCAPE '\\'
          OR COALESCE(source, '') ILIKE $2 ESCAPE '\\'
          OR EXISTS (
            SELECT 1
            FROM unnest(COALESCE(tags, ARRAY[]::text[])) AS tag
            WHERE tag ILIKE $2 ESCAPE '\\'
          )
        )
      ORDER BY score DESC, created_at DESC
      LIMIT $1
    `,
        [limit, likeQuery, layer ?? null]
    )
}

export async function deleteMemory(id: string): Promise<boolean> {
    try {
        await sql(`DELETE FROM memories WHERE id = $1`, [id])
        return true
    } catch (error) {
        console.error(`[Memory] Failed to delete: ${id}`, error)
        return false
    }
}

export async function clearMemories(layer?: string): Promise<boolean> {
    try {
        if (layer) {
            await sql(`DELETE FROM memories WHERE layer = $1`, [layer])
        } else {
            await sql(`DELETE FROM memories`)
        }
        return true
    } catch (error) {
        console.error(`[Memory] Failed to clear`, error)
        return false
    }
}

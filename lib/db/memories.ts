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

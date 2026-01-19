import type { MemoryStore, MemoryItem, MemoryLayer } from "./index"
import { sql, isDatabaseConfigured } from "../db/neon"

interface MemoryRow {
    id: string
    layer: MemoryLayer
    content: string
    source: string | null
    relevance: number | null
    tags: string[] | null
    access_count: number
    created_at: string
    updated_at: string
}

function rowToMemoryItem(row: MemoryRow): MemoryItem {
    return {
        id: row.id,
        layer: row.layer,
        content: row.content,
        timestamp: new Date(row.created_at),
        metadata: {
            source: row.source ?? undefined,
            relevance: row.relevance ?? undefined,
            tags: row.tags ?? undefined,
            accessCount: row.access_count,
        },
    }
}

export class NeonMemoryStore implements MemoryStore {
    async save(item: Omit<MemoryItem, "id" | "timestamp">): Promise<MemoryItem> {
        if (!isDatabaseConfigured()) throw new Error("Database not configured")

        const rows = await sql<MemoryRow>(
            `INSERT INTO memories (layer, content, source, relevance, tags)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
            [
                item.layer,
                item.content,
                item.metadata?.source ?? null,
                item.metadata?.relevance ?? 0.5,
                item.metadata?.tags ?? null,
            ]
        )

        return rowToMemoryItem(rows[0])
    }

    async retrieve(id: string): Promise<MemoryItem | null> {
        if (!isDatabaseConfigured()) throw new Error("Database not configured")

        const rows = await sql<MemoryRow>(
            `UPDATE memories 
       SET access_count = access_count + 1, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
            [id]
        )

        return rows.length > 0 ? rowToMemoryItem(rows[0]) : null
    }

    async search(queryStr: string, layer?: MemoryLayer): Promise<MemoryItem[]> {
        if (!isDatabaseConfigured()) throw new Error("Database not configured")

        // Use PostgreSQL full-text search with optional layer filter
        let queryText = `
      SELECT *, ts_rank(to_tsvector('english', content), plainto_tsquery('english', $1)) as rank
      FROM memories
      WHERE to_tsvector('english', content) @@ plainto_tsquery('english', $1)
    `
        const params: unknown[] = [queryStr]

        if (layer) {
            queryText += ` AND layer = $2`
            params.push(layer)
        }

        queryText += ` ORDER BY rank DESC, relevance DESC NULLS LAST LIMIT 50`

        const rows = await sql<MemoryRow & { rank: number }>(queryText, params)

        // Fallback to ILIKE search if full-text returns no results
        if (rows.length === 0) {
            let fallbackQuery = `
        SELECT * FROM memories
        WHERE content ILIKE $1
      `
            const fallbackParams: unknown[] = [`%${queryStr}%`]

            if (layer) {
                fallbackQuery += ` AND layer = $2`
                fallbackParams.push(layer)
            }

            fallbackQuery += ` ORDER BY relevance DESC NULLS LAST, created_at DESC LIMIT 50`

            const fallbackRows = await sql<MemoryRow>(fallbackQuery, fallbackParams)
            return fallbackRows.map(rowToMemoryItem)
        }

        return rows.map(rowToMemoryItem)
    }

    async list(layer?: MemoryLayer, limit = 50): Promise<MemoryItem[]> {
        if (!isDatabaseConfigured()) throw new Error("Database not configured")

        let queryText = `SELECT * FROM memories`
        const params: unknown[] = []

        if (layer) {
            queryText += ` WHERE layer = $1`
            params.push(layer)
        }

        queryText += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`
        params.push(limit)

        const rows = await sql<MemoryRow>(queryText, params)
        return rows.map(rowToMemoryItem)
    }

    async delete(id: string): Promise<void> {
        if (!isDatabaseConfigured()) throw new Error("Database not configured")
        await sql(`DELETE FROM memories WHERE id = $1`, [id])
    }

    async clear(layer?: MemoryLayer): Promise<void> {
        if (!isDatabaseConfigured()) throw new Error("Database not configured")

        if (layer) {
            await sql(`DELETE FROM memories WHERE layer = $1`, [layer])
        } else {
            await sql(`DELETE FROM memories`, [])
        }
    }

    async getStats(): Promise<{
        total: number
        byLayer: Record<MemoryLayer, number>
    }> {
        if (!isDatabaseConfigured()) throw new Error("Database not configured")

        const countRows = await sql<{ layer: MemoryLayer; count: string }>(
            `SELECT layer, COUNT(*) as count FROM memories GROUP BY layer`,
            []
        )

        const byLayer: Record<MemoryLayer, number> = {
            shortTerm: 0,
            longTerm: 0,
            episodic: 0,
            semantic: 0,
        }

        let total = 0
        for (const row of countRows) {
            const count = parseInt(row.count, 10)
            byLayer[row.layer] = count
            total += count
        }

        return { total, byLayer }
    }
}

export const neonMemoryStore = new NeonMemoryStore()

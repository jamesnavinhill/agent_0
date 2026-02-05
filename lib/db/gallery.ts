import { sql, isDatabaseConfigured } from "./neon"
import { uploadFile, isBlobConfigured } from "@/lib/storage/local"
import { createId } from "@/lib/utils/id"

interface GalleryItemInput {
    type: "image" | "code" | "text" | "audio" | "video"
    content: string
    title?: string
    prompt?: string
    category: string
    metadata?: Record<string, unknown>
}

/**
 * Save an item to the gallery database
 * Works in server-side context (no fetch required)
 */
export async function saveGalleryItem(item: GalleryItemInput): Promise<string | null> {
    if (!isDatabaseConfigured()) {
        console.warn("[Gallery] DB not configured, skipping save")
        return null
    }

    try {
        let blobUrl = ""

        // For text content, store to local media or inline as a data URL
        if (item.type === "text" && isBlobConfigured()) {
            const id = createId()
            const buffer = Buffer.from(item.content, "utf-8")
            blobUrl = await uploadFile(buffer, `research/${id}.md`, { contentType: "text/markdown" })
        } else if (item.type === "text") {
            // Store content inline as data URL for text when blob not configured
            blobUrl = `data:text/markdown;base64,${Buffer.from(item.content).toString("base64")}`
        } else if (
            (item.type === "image" || item.type === "video" || item.type === "audio") &&
            (item.content.startsWith("http") || item.content.startsWith("/"))
        ) {
            // Already a URL (remote or local)
            blobUrl = item.content
        } else {
            // Fallback - store as JSON
            blobUrl = `data:application/json;base64,${Buffer.from(JSON.stringify({ content: item.content })).toString("base64")}`
        }

        const rows = await sql<{ id: string }>(`
      INSERT INTO gallery_items (type, blob_url, title, prompt, category, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [
            item.type,
            blobUrl,
            item.title ?? null,
            item.prompt ?? null,
            item.category,
            item.metadata ? JSON.stringify(item.metadata) : null
        ])

        const id = rows[0]?.id
        console.log(`[Gallery] Saved item: ${item.title} (${id})`)
        return id ?? null
    } catch (error) {
        console.error("[Gallery] Failed to save item:", item.title, error)
        return null
    }
}

/**
 * Get a single gallery item by ID
 */
export async function getGalleryItemById(id: string): Promise<{
    id: string
    type: string
    blob_url: string
    title: string | null
    prompt: string | null
    category: string
    metadata: Record<string, unknown> | null
    created_at: string
} | null> {
    if (!isDatabaseConfigured()) return null

    try {
        const rows = await sql<{
            id: string
            type: string
            blob_url: string
            title: string | null
            prompt: string | null
            category: string
            metadata: string | null
            created_at: string
        }>(`
            SELECT id, type, blob_url, title, prompt, category, metadata, created_at
            FROM gallery_items
            WHERE id = $1
        `, [id])

        if (rows.length === 0) return null

        const row = rows[0]
        return {
            ...row,
            metadata: row.metadata ? JSON.parse(row.metadata) : null
        }
    } catch (error) {
        console.error("[Gallery] Failed to get item by ID:", id, error)
        return null
    }
}

/**
 * Get gallery items from database
 */
export async function getGalleryItems(filter?: {
    category?: string
    type?: string
    limit?: number
}): Promise<Array<{
    id: string
    type: string
    blob_url: string
    title: string | null
    category: string
    created_at: string
}>> {
    if (!isDatabaseConfigured()) return []

    try {
        let query = `SELECT id, type, blob_url, title, category, created_at FROM gallery_items WHERE 1=1`
        const params: unknown[] = []
        let paramIndex = 1

        if (filter?.category) {
            query += ` AND category = $${paramIndex++}`
            params.push(filter.category)
        }

        if (filter?.type) {
            query += ` AND type = $${paramIndex++}`
            params.push(filter.type)
        }

        query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`
        params.push(filter?.limit ?? 50)

        return await sql(query, params)
    } catch (error) {
        console.error("[Gallery] Failed to get items:", error)
        return []
    }
}

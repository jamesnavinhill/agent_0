import { sql, isDatabaseConfigured } from "../db/neon"
import { createId } from "@/lib/utils/id"
import type { ActivityEvent, ActivityLevel } from "./bus"

interface ActivityRow {
    id: string
    action: string
    details: string | null
    status: string
    level: string
    source: string | null
    image_url: string | null
    metadata: Record<string, unknown> | null
    created_at: string
}

function rowToActivityEvent(row: ActivityRow): ActivityEvent {
    return {
        id: row.id,
        action: row.action,
        details: row.details ?? undefined,
        timestamp: new Date(row.created_at).getTime(),
        status: row.status as ActivityEvent["status"],
        level: row.level as ActivityLevel,
        source: row.source ?? undefined,
        imageUrl: row.image_url ?? undefined,
        metadata: row.metadata ?? undefined,
    }
}

/**
 * Save an activity event to the database
 */
export async function saveActivity(event: ActivityEvent): Promise<ActivityEvent | null> {
    if (!isDatabaseConfigured()) return null

    try {
        const rows = await sql<ActivityRow>(
            `INSERT INTO activities (id, action, details, status, level, source, image_url, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
            [
                event.id ?? createId(),
                event.action,
                event.details ?? null,
                event.status ?? "complete",
                event.level ?? "info",
                event.source ?? null,
                event.imageUrl ?? null,
                event.metadata ? JSON.stringify(event.metadata) : null,
            ]
        )

        return rows.length > 0 ? rowToActivityEvent(rows[0]) : null
    } catch (error) {
        console.error("Failed to save activity to database:", error)
        return null
    }
}

/**
 * Get recent activities from the database
 */
export async function getDbActivities(options?: {
    level?: ActivityLevel
    source?: string
    limit?: number
    since?: number
}): Promise<ActivityEvent[]> {
    if (!isDatabaseConfigured()) return []

    try {
        let queryText = `SELECT * FROM activities WHERE 1=1`
        const params: unknown[] = []
        let paramIndex = 1

        if (options?.level) {
            queryText += ` AND level = $${paramIndex++}`
            params.push(options.level)
        }

        if (options?.source) {
            queryText += ` AND source = $${paramIndex++}`
            params.push(options.source)
        }

        if (options?.since) {
            queryText += ` AND created_at > to_timestamp($${paramIndex++})`
            params.push(options.since / 1000) // Convert ms to seconds
        }

        queryText += ` ORDER BY created_at DESC LIMIT $${paramIndex}`
        params.push(options?.limit ?? 200)

        const rows = await sql<ActivityRow>(queryText, params)
        return rows.map(rowToActivityEvent).reverse() // Oldest first for display
    } catch (error) {
        console.error("Failed to fetch activities from database:", error)
        return []
    }
}

/**
 * Clear all activities from the database
 */
export async function clearDbActivities(): Promise<void> {
    if (!isDatabaseConfigured()) return

    try {
        await sql(`DELETE FROM activities`, [])
    } catch (error) {
        console.error("Failed to clear activities from database:", error)
    }
}

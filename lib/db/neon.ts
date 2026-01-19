import { Pool } from "@neondatabase/serverless"

/**
 * Get database connection string from environment
 */
export function getDatabaseUrl(): string | undefined {
    return process.env.DATABASE_URL
}

/**
 * Check if database is configured
 */
export function isDatabaseConfigured(): boolean {
    return !!getDatabaseUrl()
}

/**
 * Single instance of the Pool for reuse
 */
let _pool: Pool | null = null

export function getPool(): Pool | null {
    if (!_pool) {
        const connectionString = getDatabaseUrl()
        if (connectionString) {
            console.log("Initializing Pool with URL:", connectionString.substring(0, 15) + "...")
            _pool = new Pool({ connectionString })
        } else {
            console.error("No DATABASE_URL found")
        }
    }
    return _pool
}

/**
 * Helper to execute parameterized SQL queries
 */
export async function sql<T = Record<string, unknown>>(
    queryText: string,
    params: unknown[] = []
): Promise<T[]> {
    const pool = getPool()
    if (!pool) throw new Error("Database not configured")

    try {
        const result = await pool.query(queryText, params)
        console.log(`[DB] Query: ${queryText.substring(0, 30)}... Rows: ${result.rows.length}`)
        return result.rows as T[]
    } catch (error) {
        console.error("Database query error:", error)
        throw error
    }
}

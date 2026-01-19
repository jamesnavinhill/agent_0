import { neon, neonConfig, NeonQueryFunction } from "@neondatabase/serverless"



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
 * Type for the SQL client
 */
export type SqlClient = NeonQueryFunction<false, false>

/**
 * Create a SQL query function with the configured database
 * Returns null if DATABASE_URL is not set
 */
export function createSqlClient(): SqlClient | null {
    const url = getDatabaseUrl()
    if (!url) return null
    return neon(url)
}

/**
 * Single instance of the SQL client for reuse
 */
let _sql: SqlClient | null = null

export function getSql(): SqlClient | null {
    if (!_sql) {
        _sql = createSqlClient()
    }
    return _sql
}

/**
 * Helper to execute parameterized SQL queries
 * Builds a tagged template literal from a query string and parameters
 */
export async function sql<T = Record<string, unknown>>(
    queryText: string,
    params: unknown[] = []
): Promise<T[]> {
    const client = getSql()
    if (!client) throw new Error("Database not configured")

    try {
        // Build template strings array with placeholders replaced
        // For neon, we need to use $1, $2 etc. placeholders in the query
        // and pass the values separately
        const result = await client(queryText as unknown as TemplateStringsArray, ...params)
        return result as T[]
    } catch (error) {
        console.error("Database query error:", error)
        throw error
    }
}

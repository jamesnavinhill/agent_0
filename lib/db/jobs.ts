import { sql } from "./neon"

export type JobStatus = "pending" | "processing" | "complete" | "error" | "timeout"
export type JobType = "video-generation" | "image-to-video" | "image-generation"

export interface Job {
    id: string
    type: JobType
    status: JobStatus
    operation_id: string | null
    operation_data: Record<string, unknown> | null
    task_id: string | null
    input: Record<string, unknown>
    result: Record<string, unknown> | null
    error: string | null
    check_count: number
    max_checks: number
    created_at: string
    updated_at: string
    completed_at: string | null
}

/**
 * Create a new pending job
 */
export async function createJob(
    type: JobType,
    input: Record<string, unknown>,
    operationId?: string,
    operationData?: Record<string, unknown>,
    taskId?: string
): Promise<string> {
    const rows = await sql<{ id: string }>(`
        INSERT INTO jobs (type, input, operation_id, operation_data, task_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
    `, [type, JSON.stringify(input), operationId, operationData ? JSON.stringify(operationData) : null, taskId])

    return rows[0].id
}

/**
 * Get a job by ID
 */
export async function getJob(id: string): Promise<Job | null> {
    const rows = await sql<Job>(`SELECT * FROM jobs WHERE id = $1`, [id])
    return rows[0] ?? null
}

/**
 * Get all pending jobs that need checking
 */
export async function getPendingJobs(): Promise<Job[]> {
    return await sql<Job>(`
        SELECT * FROM jobs 
        WHERE status = 'pending' 
        AND check_count < max_checks
        ORDER BY created_at ASC
    `)
}

/**
 * Update job status
 */
export async function updateJobStatus(
    id: string,
    status: JobStatus,
    result?: Record<string, unknown>,
    error?: string
): Promise<void> {
    const completedAt = status === "complete" || status === "error" || status === "timeout"
        ? "NOW()"
        : "NULL"

    await sql(`
        UPDATE jobs
        SET status = $1,
            result = $2,
            error = $3,
            completed_at = ${completedAt},
            updated_at = NOW()
        WHERE id = $4
    `, [status, result ? JSON.stringify(result) : null, error, id])
}

/**
 * Mark job as processing and increment check count
 */
export async function incrementCheckCount(id: string): Promise<Job | null> {
    const rows = await sql<Job>(`
        UPDATE jobs
        SET check_count = check_count + 1,
            status = 'processing',
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
    `, [id])

    return rows[0] ?? null
}

/**
 * Get all jobs for a specific task
 */
export async function getJobsByTaskId(taskId: string): Promise<Job[]> {
    return await sql<Job>(`
        SELECT * FROM jobs WHERE task_id = $1 ORDER BY created_at DESC
    `, [taskId])
}

/**
 * Get recent jobs with optional status filter
 */
export async function getRecentJobs(limit = 20, status?: JobStatus): Promise<Job[]> {
    if (status) {
        return await sql<Job>(`
            SELECT * FROM jobs WHERE status = $1 ORDER BY created_at DESC LIMIT $2
        `, [status, limit])
    }
    return await sql<Job>(`
        SELECT * FROM jobs ORDER BY created_at DESC LIMIT $1
    `, [limit])
}

/**
 * Mark timed out jobs
 */
export async function markTimedOutJobs(): Promise<number> {
    const result = await sql(`
        UPDATE jobs
        SET status = 'timeout',
            error = 'Job exceeded maximum check attempts',
            completed_at = NOW(),
            updated_at = NOW()
        WHERE status IN ('pending', 'processing')
        AND check_count >= max_checks
        RETURNING id
    `)

    return result.length
}

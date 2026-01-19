import { sql } from "./neon"
import { Task } from "@/app/api/tasks/route"

/**
 * Get all tasks enabled and due for execution
 */
export async function getDueTasks(): Promise<Task[]> {
  // Logic: 
  // 1. Task must be enabled
  // 2. next_run must be in the past (or null, if we want to run immediately? usually defaults to future)
  // For now, simple check where next_run < NOW()

  return await sql<Task>(`
    SELECT * FROM tasks 
    WHERE enabled = true 
    AND (next_run IS NULL OR next_run <= NOW())
    AND (last_status != 'running' OR last_status IS NULL) -- Don't pick up already running tasks (basic lock)
  `)
}

/**
 * Get a specific task by ID
 */
export async function getTask(id: string): Promise<Task | null> {
  const rows = await sql<Task>(`SELECT * FROM tasks WHERE id = $1`, [id])
  return rows[0] ?? null
}

/**
 * Update task status and timestamps
 */
export async function updateTaskStatus(id: string, status: string, result?: string) {
  await sql(`
    UPDATE tasks 
    SET last_status = $1, 
        last_result = $2,
        updated_at = NOW()
    WHERE id = $3
  `, [status, result, id])
}

/**
 * Update task execution times
 */
export async function updateTaskSchedule(id: string, lastRun: Date, nextRun: Date) {
  await sql(`
    UPDATE tasks 
    SET last_run = $1,
        next_run = $2,
        run_count = run_count + 1,
        last_status = 'complete'
    WHERE id = $3
  `, [lastRun.toISOString(), nextRun.toISOString(), id])
}

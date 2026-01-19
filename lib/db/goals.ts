import { sql } from "./neon"

export interface Goal {
  id: string
  title: string
  description: string
  progress: number
  priority: "high" | "medium" | "low"
  subtasks: string[]
  deadline?: Date
  completed: boolean
  created_at: Date
}

export async function getGoals(): Promise<Goal[]> {
  const goals = await sql<Goal>(`
    SELECT * FROM goals 
    ORDER BY completed ASC, 
    CASE priority 
      WHEN 'high' THEN 1 
      WHEN 'medium' THEN 2 
      WHEN 'low' THEN 3 
    END,
    created_at DESC
  `)
  
  // Ensure subtasks is always an array (DB might return null/json)
  return goals.map(g => ({
    ...g,
    subtasks: Array.isArray(g.subtasks) ? g.subtasks : []
  }))
}

export async function createGoal(goal: Omit<Goal, "id" | "created_at" | "completed">): Promise<Goal> {
  const result = await sql<Goal>(`
    INSERT INTO goals (title, description, progress, priority, subtasks, deadline)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [
    goal.title,
    goal.description,
    goal.progress || 0,
    goal.priority,
    JSON.stringify(goal.subtasks || []),
    goal.deadline ? new Date(goal.deadline).toISOString() : null
  ])
  return result[0]
}

export async function updateGoal(id: string, updates: Partial<Goal>): Promise<Goal> {
  // Dynamic update query builder
  const fields: string[] = []
  const values: any[] = []
  let idx = 1

  if (updates.title !== undefined) { fields.push(`title = $${idx++}`); values.push(updates.title) }
  if (updates.description !== undefined) { fields.push(`description = $${idx++}`); values.push(updates.description) }
  if (updates.progress !== undefined) { fields.push(`progress = $${idx++}`); values.push(updates.progress) }
  if (updates.priority !== undefined) { fields.push(`priority = $${idx++}`); values.push(updates.priority) }
  if (updates.subtasks !== undefined) { fields.push(`subtasks = $${idx++}`); values.push(JSON.stringify(updates.subtasks)) }
  if (updates.deadline !== undefined) { fields.push(`deadline = $${idx++}`); values.push(updates.deadline) }
  if (updates.completed !== undefined) { fields.push(`completed = $${idx++}`); values.push(updates.completed) }

  fields.push(`updated_at = NOW()`)

  if (fields.length === 1) return (await getGoals()).find(g => g.id === id)! // No updates

  const result = await sql<Goal>(`
    UPDATE goals 
    SET ${fields.join(", ")}
    WHERE id = $${idx}
    RETURNING *
  `, [...values, id])

  return result[0]
}

export async function deleteGoal(id: string): Promise<void> {
  await sql(`DELETE FROM goals WHERE id = $1`, [id])
}

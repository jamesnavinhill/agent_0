import { sql } from "./neon"

export interface KnowledgeItem {
  id: string
  title: string
  url?: string
  summary: string
  tags: string[]
  created_at: Date
}

export async function addKnowledge(item: Omit<KnowledgeItem, "id" | "created_at">): Promise<boolean> {
  // Validate required fields
  if (!item.title || typeof item.title !== 'string' || item.title.trim() === '') {
    console.error(`[Knowledge] Cannot save: title is required but got "${item.title}"`)
    return false
  }
  if (!item.summary || typeof item.summary !== 'string' || item.summary.trim() === '') {
    console.error(`[Knowledge] Cannot save: summary is required but got "${item.summary}"`)
    return false
  }

  try {
    await sql(`
      INSERT INTO knowledge (title, url, summary, tags)
      VALUES ($1, $2, $3, $4)
    `, [item.title.trim(), item.url || null, item.summary.trim(), item.tags || []])
    console.log(`[Knowledge] Saved: ${item.title}`)
    return true
  } catch (error) {
    console.error(`[Knowledge] Failed to save: ${item.title}`, error)
    return false
  }
}

export async function getRecentKnowledge(limit = 10): Promise<KnowledgeItem[]> {
  return await sql<KnowledgeItem>(`
    SELECT id, title, url, summary, tags, created_at 
    FROM knowledge 
    ORDER BY created_at DESC 
    LIMIT $1
  `, [limit])
}

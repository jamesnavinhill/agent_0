import { sql } from "./neon"

export interface KnowledgeItem {
  id: string
  title: string
  url?: string
  summary: string
  tags: string[]
  created_at: Date
}

export async function addKnowledge(item: Omit<KnowledgeItem, "id" | "created_at">) {
  await sql(`
    INSERT INTO knowledge (title, url, summary, tags)
    VALUES ($1, $2, $3, $4)
  `, [item.title, item.url, item.summary, item.tags])
}

export async function getRecentKnowledge(limit = 10): Promise<KnowledgeItem[]> {
  return await sql<KnowledgeItem>(`
    SELECT id, title, url, summary, tags, created_at 
    FROM knowledge 
    ORDER BY created_at DESC 
    LIMIT $1
  `, [limit])
}

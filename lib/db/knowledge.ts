import { sql } from "./neon"

export interface KnowledgeItem {
  id: string
  title: string
  url?: string
  summary: string
  tags: string[]
  created_at: Date
}

export interface SearchKnowledgeOptions {
  tags?: string[]
  limit?: number
}

export interface SearchedKnowledgeItem extends KnowledgeItem {
  score: number
}

function clampLimit(limit: number | undefined, fallback: number): number {
  if (!limit || Number.isNaN(limit)) return fallback
  return Math.max(1, Math.min(limit, 20))
}

function escapeLikePattern(input: string): string {
  return input.replace(/[\\%_]/g, "\\$&")
}

function normalizeTags(tags: string[] | undefined): string[] {
  if (!tags || tags.length === 0) return []
  return tags
    .map((tag) => tag.trim())
    .filter(Boolean)
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

export async function searchKnowledge(
  query: string,
  options: SearchKnowledgeOptions = {}
): Promise<SearchedKnowledgeItem[]> {
  const limit = clampLimit(options.limit, 5)
  const tags = normalizeTags(options.tags)
  const normalizedQuery = query.trim()

  if (!normalizedQuery && tags.length === 0) {
    const recent = await getRecentKnowledge(limit)
    return recent.map((item) => ({ ...item, score: 0 }))
  }

  if (!normalizedQuery && tags.length > 0) {
    return await sql<SearchedKnowledgeItem>(`
      SELECT
        id,
        title,
        url,
        summary,
        tags,
        created_at,
        0::float AS score
      FROM knowledge
      WHERE COALESCE(tags, ARRAY[]::text[]) && $2::text[]
      ORDER BY created_at DESC
      LIMIT $1
    `, [limit, tags])
  }

  const likeQuery = `%${escapeLikePattern(normalizedQuery)}%`

  return await sql<SearchedKnowledgeItem>(`
    SELECT
      id,
      title,
      url,
      summary,
      tags,
      created_at,
      (
        CASE WHEN title ILIKE $2 ESCAPE '\\' THEN 4 ELSE 0 END +
        CASE WHEN COALESCE(summary, '') ILIKE $2 ESCAPE '\\' THEN 3 ELSE 0 END +
        CASE WHEN COALESCE(content, '') ILIKE $2 ESCAPE '\\' THEN 2 ELSE 0 END +
        CASE
          WHEN EXISTS (
            SELECT 1
            FROM unnest(COALESCE(tags, ARRAY[]::text[])) AS tag
            WHERE tag ILIKE $2 ESCAPE '\\'
          )
          THEN 1
          ELSE 0
        END
      )::float AS score
    FROM knowledge
    WHERE (
      title ILIKE $2 ESCAPE '\\'
      OR COALESCE(summary, '') ILIKE $2 ESCAPE '\\'
      OR COALESCE(content, '') ILIKE $2 ESCAPE '\\'
      OR EXISTS (
        SELECT 1
        FROM unnest(COALESCE(tags, ARRAY[]::text[])) AS tag
        WHERE tag ILIKE $2 ESCAPE '\\'
      )
    )
    AND ($3::text[] IS NULL OR COALESCE(tags, ARRAY[]::text[]) && $3::text[])
    ORDER BY score DESC, created_at DESC
    LIMIT $1
  `, [limit, likeQuery, tags.length > 0 ? tags : null])
}

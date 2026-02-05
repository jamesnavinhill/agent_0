import { NextRequest } from "next/server"
import { sql as dbQuery, isDatabaseConfigured } from "@/lib/db/neon"
import { uploadFile, deleteFile, isBlobConfigured } from "@/lib/storage/local"
import fs from "fs/promises"
import path from "path"

// Fallback filesystem paths for local development
const GALLERY_DIR = path.join(process.cwd(), "public", "gallery")
const GALLERY_INDEX = path.join(GALLERY_DIR, "index.json")

interface GalleryItem {
  id: string
  type: "image" | "code" | "text" | "audio" | "video"
  blob_url: string
  title?: string
  prompt?: string
  category: string
  metadata?: Record<string, unknown>
  created_at: string
}

// ============================================================================
// Database helpers
// ============================================================================

async function dbSaveItem(item: Omit<GalleryItem, "id" | "created_at">): Promise<GalleryItem | null> {
  if (!isDatabaseConfigured()) return null

  try {
    const rows = await dbQuery<GalleryItem>(
      `INSERT INTO gallery_items (type, blob_url, title, prompt, category, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        item.type,
        item.blob_url,
        item.title ?? null,
        item.prompt ?? null,
        item.category ?? "art",
        item.metadata ? JSON.stringify(item.metadata) : null,
      ]
    )
    return rows[0] ?? null
  } catch (e) {
    console.error("dbSaveItem error:", e)
    return null
  }
}

async function dbGetItems(filter?: { category?: string; type?: string; limit?: number }): Promise<GalleryItem[]> {
  if (!isDatabaseConfigured()) return []

  let sqlQuery = `SELECT * FROM gallery_items WHERE 1=1`
  const params: unknown[] = []
  let paramIndex = 1

  if (filter?.category) {
    sqlQuery += ` AND category = $${paramIndex++}`
    params.push(filter.category)
  }

  if (filter?.type) {
    sqlQuery += ` AND type = $${paramIndex++}`
    params.push(filter.type)
  }

  sqlQuery += ` ORDER BY created_at DESC LIMIT $${paramIndex}`
  params.push(filter?.limit ?? 50)

  try {
    return await dbQuery<GalleryItem>(sqlQuery, params)
  } catch (e) {
    console.error("dbGetItems error:", e)
    return []
  }
}

async function dbDeleteItem(id: string): Promise<GalleryItem | null> {
  if (!isDatabaseConfigured()) return null

  try {
    const rows = await dbQuery<GalleryItem>(
      `DELETE FROM gallery_items WHERE id = $1 RETURNING *`,
      [id]
    )
    return rows[0] ?? null
  } catch (e) {
    console.error("dbDeleteItem error:", e)
    return null
  }
}

// ============================================================================
// Filesystem helpers (local storage)
// ============================================================================

async function ensureGalleryDir() {
  try {
    await fs.access(GALLERY_DIR)
  } catch {
    await fs.mkdir(GALLERY_DIR, { recursive: true })
  }
}

interface LocalGalleryItem {
  id: string
  type: "image" | "code" | "text" | "audio" | "video"
  filename: string
  title?: string
  prompt?: string
  category: string
  timestamp: string
  metadata?: Record<string, unknown>
}

async function loadLocalIndex(): Promise<LocalGalleryItem[]> {
  try {
    const data = await fs.readFile(GALLERY_INDEX, "utf-8")
    return JSON.parse(data)
  } catch {
    return []
  }
}

async function saveLocalIndex(items: LocalGalleryItem[]) {
  await ensureGalleryDir()
  await fs.writeFile(GALLERY_INDEX, JSON.stringify(items, null, 2))
}

// ============================================================================
// API Routes
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    const category = req.nextUrl.searchParams.get("category") ?? undefined
    const type = req.nextUrl.searchParams.get("type") ?? undefined
    const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "50")

    // Use database if configured
    if (isDatabaseConfigured()) {
      const items = await dbGetItems({ category, type, limit })
      return Response.json({
        items: items.map((i) => ({
          ...i,
          url: i.blob_url,
          timestamp: i.created_at,
        })),
        source: "database",
      })
    }

    // Fallback to filesystem
    await ensureGalleryDir()
    let items = await loadLocalIndex()

    if (category) {
      items = items.filter((i) => i.category === category)
    }
    if (type) {
      items = items.filter((i) => i.type === type)
    }

    items = items
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
      .map((i) => ({
        ...i,
        url: `/gallery/${i.filename}`,
      }))

    return Response.json({ items, source: "filesystem" })
  } catch (error) {
    console.error("Gallery GET error:", error)
    return Response.json({ error: "Failed to load gallery" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { type, content, title, prompt, category, metadata } = body

    if (!type || !content) {
      return Response.json({ error: "Type and content are required" }, { status: 400 })
    }

    const id = crypto.randomUUID()
    const timestamp = new Date().toISOString()

    // Try local storage + database first if both are configured
    if (isBlobConfigured() && isDatabaseConfigured()) {
      let blobUrl: string

      if (type === "image" && content.startsWith("data:image/")) {
        const matches = content.match(/data:image\/(\w+);base64,(.+)/)
        if (matches) {
          const ext = matches[1] === "jpeg" ? "jpg" : matches[1]
          const buffer = Buffer.from(matches[2], "base64")
          blobUrl = await uploadFile(buffer, `gallery/${id}.${ext}`, {
            contentType: `image/${matches[1]}`,
          })
        } else {
          return Response.json({ error: "Invalid image data" }, { status: 400 })
        }
      } else if (type === "code" || type === "text") {
        const ext = type === "code" ? (metadata?.language || "txt") : "txt"
        const buffer = Buffer.from(content, "utf-8")
        blobUrl = await uploadFile(buffer, `gallery/${id}.${ext}`, {
          contentType: "text/plain",
        })
      } else {
        const buffer = Buffer.from(JSON.stringify({ content }), "utf-8")
        blobUrl = await uploadFile(buffer, `gallery/${id}.json`, {
          contentType: "application/json",
        })
      }

      // Save to database if configured
      if (isDatabaseConfigured()) {
        const item = await dbSaveItem({
          type,
          blob_url: blobUrl,
          title,
          prompt,
          category: category ?? "art",
          metadata,
        })

        if (item) {
          return Response.json({
            success: true,
            item: { ...item, url: item.blob_url },
            source: "filesystem+database",
          })
        }
      }

      // Stored locally but no database - return file URL directly
      return Response.json({
        success: true,
        item: { id, type, url: blobUrl, title, prompt, category: category ?? "art", timestamp },
        source: "filesystem",
      })
    }

    // Fallback to filesystem
    await ensureGalleryDir()
    let filename = ""

    if (type === "image" && content.startsWith("data:image/")) {
      const matches = content.match(/data:image\/(\w+);base64,(.+)/)
      if (matches) {
        const ext = matches[1] === "jpeg" ? "jpg" : matches[1]
        filename = `${id}.${ext}`
        const buffer = Buffer.from(matches[2], "base64")
        await fs.writeFile(path.join(GALLERY_DIR, filename), buffer)
      }
    } else if (type === "code" || type === "text") {
      const ext = type === "code" ? (metadata?.language ?? "txt") : "txt"
      filename = `${id}.${ext}`
      await fs.writeFile(path.join(GALLERY_DIR, filename), content)
    } else {
      filename = `${id}.json`
      await fs.writeFile(path.join(GALLERY_DIR, filename), JSON.stringify({ content }))
    }

    const item: LocalGalleryItem = {
      id,
      type,
      filename,
      title,
      prompt,
      category: category ?? "art",
      timestamp,
      metadata,
    }

    const items = await loadLocalIndex()
    items.push(item)
    await saveLocalIndex(items)

    return Response.json({
      success: true,
      item: { ...item, url: `/gallery/${filename}` },
      source: "filesystem",
    })
  } catch (error) {
    console.error("Gallery POST error:", error)
    return Response.json({ error: "Failed to save to gallery" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id")
    if (!id) {
      return Response.json({ error: "ID is required" }, { status: 400 })
    }

    // Try database first
    if (isDatabaseConfigured()) {
      const item = await dbDeleteItem(id)

      if (item) {
        // Also delete from local storage if it's a local URL
        if (item.blob_url && isBlobConfigured()) {
          try {
            await deleteFile(item.blob_url)
          } catch (e) {
            console.warn("Failed to delete local file:", e)
          }
        }

        return Response.json({ success: true, source: "database" })
      }
    }

    // Fallback to filesystem
    const items = await loadLocalIndex()
    const item = items.find((i) => i.id === id)

    if (!item) {
      return Response.json({ error: "Item not found" }, { status: 404 })
    }

    try {
      await fs.unlink(path.join(GALLERY_DIR, item.filename))
    } catch { }

    const newItems = items.filter((i) => i.id !== id)
    await saveLocalIndex(newItems)

    return Response.json({ success: true, source: "filesystem" })
  } catch (error) {
    console.error("Gallery DELETE error:", error)
    return Response.json({ error: "Failed to delete from gallery" }, { status: 500 })
  }
}

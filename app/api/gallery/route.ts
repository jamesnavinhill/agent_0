import { NextRequest } from "next/server"
import fs from "fs/promises"
import path from "path"

const GALLERY_DIR = path.join(process.cwd(), "public", "gallery")
const GALLERY_INDEX = path.join(GALLERY_DIR, "index.json")

interface GalleryItem {
  id: string
  type: "image" | "code" | "text" | "audio" | "video"
  filename: string
  title?: string
  prompt?: string
  category: string
  timestamp: string
  metadata?: Record<string, unknown>
}

async function ensureGalleryDir() {
  try {
    await fs.access(GALLERY_DIR)
  } catch {
    await fs.mkdir(GALLERY_DIR, { recursive: true })
  }
}

async function loadIndex(): Promise<GalleryItem[]> {
  try {
    const data = await fs.readFile(GALLERY_INDEX, "utf-8")
    return JSON.parse(data)
  } catch {
    return []
  }
}

async function saveIndex(items: GalleryItem[]) {
  await fs.writeFile(GALLERY_INDEX, JSON.stringify(items, null, 2))
}

export async function GET(req: NextRequest) {
  try {
    await ensureGalleryDir()
    const items = await loadIndex()
    
    const category = req.nextUrl.searchParams.get("category")
    const type = req.nextUrl.searchParams.get("type")
    const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "50")
    
    let filtered = items
    if (category) {
      filtered = filtered.filter(i => i.category === category)
    }
    if (type) {
      filtered = filtered.filter(i => i.type === type)
    }
    
    filtered = filtered
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
    
    return Response.json({ items: filtered })
  } catch (error) {
    console.error("Gallery GET error:", error)
    return Response.json({ error: "Failed to load gallery" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    await ensureGalleryDir()
    
    const body = await req.json()
    const { type, content, title, prompt, category, metadata } = body
    
    if (!type || !content) {
      return Response.json({ error: "Type and content are required" }, { status: 400 })
    }
    
    const id = crypto.randomUUID()
    const timestamp = new Date().toISOString()
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
    
    const item: GalleryItem = {
      id,
      type,
      filename,
      title,
      prompt,
      category: category ?? "art",
      timestamp,
      metadata,
    }
    
    const items = await loadIndex()
    items.push(item)
    await saveIndex(items)
    
    return Response.json({
      success: true,
      item: {
        ...item,
        url: `/gallery/${filename}`,
      },
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
    
    const items = await loadIndex()
    const item = items.find(i => i.id === id)
    
    if (!item) {
      return Response.json({ error: "Item not found" }, { status: 404 })
    }
    
    try {
      await fs.unlink(path.join(GALLERY_DIR, item.filename))
    } catch {
    }
    
    const newItems = items.filter(i => i.id !== id)
    await saveIndex(newItems)
    
    return Response.json({ success: true })
  } catch (error) {
    console.error("Gallery DELETE error:", error)
    return Response.json({ error: "Failed to delete from gallery" }, { status: 500 })
  }
}

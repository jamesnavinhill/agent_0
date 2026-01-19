import type { AgentOutput, OutputType } from "@/lib/store/agent-store"

export interface GalleryItem {
  id: string
  type: OutputType
  content: string
  title?: string
  category: AgentOutput["category"]
  prompt?: string
  timestamp: Date
  metadata?: {
    model?: string
    aspectRatio?: string
    duration?: number
    fileSize?: number
    dimensions?: { width: number; height: number }
  }
}

export interface GalleryStore {
  save(item: Omit<GalleryItem, "id" | "timestamp">): Promise<GalleryItem>
  get(id: string): Promise<GalleryItem | null>
  list(category?: GalleryItem["category"], limit?: number): Promise<GalleryItem[]>
  delete(id: string): Promise<void>
  clear(): Promise<void>
  getStats(): Promise<{
    total: number
    byCategory: Record<GalleryItem["category"], number>
    byType: Record<OutputType, number>
  }>
}

const GALLERY_STORAGE_KEY = "agent_zero_gallery"

export class LocalGalleryStore implements GalleryStore {
  private items: Map<string, GalleryItem> = new Map()
  private initialized = false

  private async init(): Promise<void> {
    if (this.initialized || typeof window === "undefined") return

    try {
      const stored = localStorage.getItem(GALLERY_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as GalleryItem[]
        for (const item of parsed) {
          item.timestamp = new Date(item.timestamp)
          this.items.set(item.id, item)
        }
      }
    } catch (error) {
      console.warn("Failed to load gallery from localStorage:", error)
    }

    this.initialized = true
  }

  private persist(): void {
    if (typeof window === "undefined") return

    try {
      const items = Array.from(this.items.values())
      localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(items))
    } catch (error) {
      console.warn("Failed to persist gallery:", error)
    }
  }

  async save(item: Omit<GalleryItem, "id" | "timestamp">): Promise<GalleryItem> {
    await this.init()

    const galleryItem: GalleryItem = {
      ...item,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    }

    this.items.set(galleryItem.id, galleryItem)
    this.persist()

    return galleryItem
  }

  async get(id: string): Promise<GalleryItem | null> {
    await this.init()
    return this.items.get(id) ?? null
  }

  async list(category?: GalleryItem["category"], limit = 50): Promise<GalleryItem[]> {
    await this.init()

    let items = Array.from(this.items.values())

    if (category) {
      items = items.filter(i => i.category === category)
    }

    return items
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }

  async delete(id: string): Promise<void> {
    await this.init()
    this.items.delete(id)
    this.persist()
  }

  async clear(): Promise<void> {
    await this.init()
    this.items.clear()
    this.persist()
  }

  async getStats(): Promise<{
    total: number
    byCategory: Record<GalleryItem["category"], number>
    byType: Record<OutputType, number>
  }> {
    await this.init()

    const byCategory: Record<GalleryItem["category"], number> = {
      art: 0,
      music: 0,
      code: 0,
      philosophy: 0,
      research: 0,
      blog: 0,
      game: 0,
    }

    const byType: Record<OutputType, number> = {
      text: 0,
      image: 0,
      video: 0,
      audio: 0,
      code: 0,
    }

    for (const item of this.items.values()) {
      byCategory[item.category]++
      byType[item.type]++
    }

    return {
      total: this.items.size,
      byCategory,
      byType,
    }
  }
}

export const galleryStore = new LocalGalleryStore()

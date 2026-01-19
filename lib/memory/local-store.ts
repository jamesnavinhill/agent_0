import type { MemoryStore, MemoryItem, MemoryLayer } from "./index"

const STORAGE_KEY = "agent_zero_memory"

export class LocalMemoryStore implements MemoryStore {
  private memories: Map<string, MemoryItem> = new Map()
  private initialized = false

  private async init(): Promise<void> {
    if (this.initialized || typeof window === "undefined") return
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as MemoryItem[]
        for (const item of parsed) {
          item.timestamp = new Date(item.timestamp)
          this.memories.set(item.id, item)
        }
      }
    } catch (error) {
      console.warn("Failed to load memories from localStorage:", error)
    }
    
    this.initialized = true
  }

  private persist(): void {
    if (typeof window === "undefined") return
    
    try {
      const items = Array.from(this.memories.values())
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch (error) {
      console.warn("Failed to persist memories:", error)
    }
  }

  async save(item: Omit<MemoryItem, "id" | "timestamp">): Promise<MemoryItem> {
    await this.init()
    
    const memory: MemoryItem = {
      ...item,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    }
    
    this.memories.set(memory.id, memory)
    this.persist()
    
    return memory
  }

  async retrieve(id: string): Promise<MemoryItem | null> {
    await this.init()
    const item = this.memories.get(id)
    
    if (item && item.metadata) {
      item.metadata.accessCount = (item.metadata.accessCount ?? 0) + 1
      this.persist()
    }
    
    return item ?? null
  }

  async search(query: string, layer?: MemoryLayer): Promise<MemoryItem[]> {
    await this.init()
    
    const lowerQuery = query.toLowerCase()
    const results: MemoryItem[] = []
    
    for (const item of this.memories.values()) {
      if (layer && item.layer !== layer) continue
      
      const matchesContent = item.content.toLowerCase().includes(lowerQuery)
      const matchesTags = item.metadata?.tags?.some(t => 
        t.toLowerCase().includes(lowerQuery)
      )
      
      if (matchesContent || matchesTags) {
        results.push(item)
      }
    }
    
    return results.sort((a, b) => 
      (b.metadata?.relevance ?? 0) - (a.metadata?.relevance ?? 0)
    )
  }

  async list(layer?: MemoryLayer, limit = 50): Promise<MemoryItem[]> {
    await this.init()
    
    let items = Array.from(this.memories.values())
    
    if (layer) {
      items = items.filter(i => i.layer === layer)
    }
    
    return items
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }

  async delete(id: string): Promise<void> {
    await this.init()
    this.memories.delete(id)
    this.persist()
  }

  async clear(layer?: MemoryLayer): Promise<void> {
    await this.init()
    
    if (layer) {
      for (const [id, item] of this.memories) {
        if (item.layer === layer) {
          this.memories.delete(id)
        }
      }
    } else {
      this.memories.clear()
    }
    
    this.persist()
  }

  async getStats(): Promise<{
    total: number
    byLayer: Record<MemoryLayer, number>
  }> {
    await this.init()
    
    const byLayer: Record<MemoryLayer, number> = {
      shortTerm: 0,
      longTerm: 0,
      episodic: 0,
      semantic: 0,
    }
    
    for (const item of this.memories.values()) {
      byLayer[item.layer]++
    }
    
    return {
      total: this.memories.size,
      byLayer,
    }
  }
}

export const memoryStore = new LocalMemoryStore()

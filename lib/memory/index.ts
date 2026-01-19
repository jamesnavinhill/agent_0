export type MemoryLayer = "shortTerm" | "longTerm" | "episodic" | "semantic"

export interface MemoryItem {
  id: string
  layer: MemoryLayer
  content: string
  timestamp: Date
  metadata?: {
    source?: string
    relevance?: number
    tags?: string[]
    accessCount?: number
  }
}

export interface MemoryStore {
  save(item: Omit<MemoryItem, "id" | "timestamp">): Promise<MemoryItem>
  retrieve(id: string): Promise<MemoryItem | null>
  search(query: string, layer?: MemoryLayer): Promise<MemoryItem[]>
  list(layer?: MemoryLayer, limit?: number): Promise<MemoryItem[]>
  delete(id: string): Promise<void>
  clear(layer?: MemoryLayer): Promise<void>
}

export { LocalMemoryStore, memoryStore } from "./local-store"

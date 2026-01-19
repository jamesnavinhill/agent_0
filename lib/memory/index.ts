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
  getStats?(): Promise<{ total: number; byLayer: Record<MemoryLayer, number> }>
}

export { LocalMemoryStore, memoryStore as localMemoryStore } from "./local-store"
export { NeonMemoryStore, neonMemoryStore } from "./neon-store"

import { isDatabaseConfigured } from "../db/neon"
import { memoryStore as _localStore } from "./local-store"
import { neonMemoryStore } from "./neon-store"

/**
 * Default memory store - uses Neon if DATABASE_URL is set, otherwise localStorage
 */
export const memoryStore: MemoryStore = isDatabaseConfigured()
  ? neonMemoryStore
  : _localStore


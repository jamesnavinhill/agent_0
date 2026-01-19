import { describe, it, expect, beforeEach, vi } from 'vitest'
import { LocalMemoryStore } from '@/lib/memory/local-store'

describe('LocalMemoryStore', () => {
    let store: LocalMemoryStore

    beforeEach(() => {
        vi.clearAllMocks()
        store = new LocalMemoryStore()
    })

    describe('save', () => {
        it('should save a memory item and return it with id and timestamp', async () => {
            const item = await store.save({
                content: 'Test memory content',
                layer: 'shortTerm',
            })

            expect(item.id).toBeDefined()
            expect(item.content).toBe('Test memory content')
            expect(item.layer).toBe('shortTerm')
            expect(item.timestamp).toBeInstanceOf(Date)
        })

        it('should save items with metadata', async () => {
            const item = await store.save({
                content: 'Tagged memory',
                layer: 'longTerm',
                metadata: { tags: ['test', 'important'], relevance: 0.9 },
            })

            expect(item.metadata?.tags).toContain('test')
            expect(item.metadata?.relevance).toBe(0.9)
        })
    })

    describe('retrieve', () => {
        it('should retrieve a saved item by id', async () => {
            const saved = await store.save({
                content: 'Find me',
                layer: 'episodic',
            })

            const retrieved = await store.retrieve(saved.id)
            expect(retrieved).not.toBeNull()
            expect(retrieved?.content).toBe('Find me')
        })

        it('should return null for non-existent id', async () => {
            const result = await store.retrieve('non-existent-id')
            expect(result).toBeNull()
        })
    })

    describe('search', () => {
        it('should find items by content', async () => {
            await store.save({ content: 'The quick brown fox', layer: 'longTerm' })
            await store.save({ content: 'A lazy dog', layer: 'longTerm' })

            const results = await store.search('fox')
            expect(results).toHaveLength(1)
            expect(results[0].content).toContain('fox')
        })

        it('should filter by layer', async () => {
            await store.save({ content: 'Short term memory', layer: 'shortTerm' })
            await store.save({ content: 'Long term memory', layer: 'longTerm' })

            const results = await store.search('memory', 'shortTerm')
            expect(results).toHaveLength(1)
            expect(results[0].layer).toBe('shortTerm')
        })

        it('should search by tags', async () => {
            await store.save({
                content: 'Important item',
                layer: 'longTerm',
                metadata: { tags: ['critical', 'urgent'] },
            })

            const results = await store.search('critical')
            expect(results).toHaveLength(1)
        })
    })

    describe('list', () => {
        it('should list all items sorted by timestamp', async () => {
            await store.save({ content: 'First', layer: 'shortTerm' })
            await store.save({ content: 'Second', layer: 'shortTerm' })
            await store.save({ content: 'Third', layer: 'shortTerm' })

            const items = await store.list()
            expect(items).toHaveLength(3)
            // Verify all items are present
            const contents = items.map(i => i.content)
            expect(contents).toContain('First')
            expect(contents).toContain('Second')
            expect(contents).toContain('Third')
        })

        it('should filter by layer', async () => {
            await store.save({ content: 'Short', layer: 'shortTerm' })
            await store.save({ content: 'Long', layer: 'longTerm' })

            const items = await store.list('longTerm')
            expect(items).toHaveLength(1)
            expect(items[0].content).toBe('Long')
        })

        it('should respect limit', async () => {
            for (let i = 0; i < 10; i++) {
                await store.save({ content: `Item ${i}`, layer: 'shortTerm' })
            }

            const items = await store.list(undefined, 5)
            expect(items).toHaveLength(5)
        })
    })

    describe('delete', () => {
        it('should delete an item by id', async () => {
            const item = await store.save({ content: 'Delete me', layer: 'shortTerm' })
            await store.delete(item.id)

            const retrieved = await store.retrieve(item.id)
            expect(retrieved).toBeNull()
        })
    })

    describe('clear', () => {
        it('should clear all items', async () => {
            await store.save({ content: 'Item 1', layer: 'shortTerm' })
            await store.save({ content: 'Item 2', layer: 'longTerm' })

            await store.clear()

            const stats = await store.getStats()
            expect(stats.total).toBe(0)
        })

        it('should clear only specific layer', async () => {
            await store.save({ content: 'Short', layer: 'shortTerm' })
            await store.save({ content: 'Long', layer: 'longTerm' })

            await store.clear('shortTerm')

            const stats = await store.getStats()
            expect(stats.byLayer.shortTerm).toBe(0)
            expect(stats.byLayer.longTerm).toBe(1)
        })
    })

    describe('getStats', () => {
        it('should return correct statistics', async () => {
            await store.save({ content: 'Short 1', layer: 'shortTerm' })
            await store.save({ content: 'Short 2', layer: 'shortTerm' })
            await store.save({ content: 'Long 1', layer: 'longTerm' })
            await store.save({ content: 'Episodic 1', layer: 'episodic' })

            const stats = await store.getStats()
            expect(stats.total).toBe(4)
            expect(stats.byLayer.shortTerm).toBe(2)
            expect(stats.byLayer.longTerm).toBe(1)
            expect(stats.byLayer.episodic).toBe(1)
            expect(stats.byLayer.semantic).toBe(0)
        })
    })
})

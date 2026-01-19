"use client"

import { useState, useEffect, useCallback } from "react"
import { memoryStore, type MemoryItem, type MemoryLayer } from "@/lib/memory"

export function useMemory() {
    const [memories, setMemories] = useState<MemoryItem[]>([])
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState<{
        total: number
        byLayer: Record<MemoryLayer, number>
    }>({ total: 0, byLayer: { shortTerm: 0, longTerm: 0, episodic: 0, semantic: 0 } })

    const refresh = useCallback(async () => {
        setLoading(true)
        try {
            const items = await memoryStore.list()
            const memoryStats = await memoryStore.getStats()
            setMemories(items)
            setStats(memoryStats)
        } catch (error) {
            console.error("Failed to load memories:", error)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        refresh()
    }, [refresh])

    const save = useCallback(async (
        content: string,
        layer: MemoryLayer,
        metadata?: MemoryItem["metadata"]
    ) => {
        const item = await memoryStore.save({ content, layer, metadata })
        await refresh()
        return item
    }, [refresh])

    const remove = useCallback(async (id: string) => {
        await memoryStore.delete(id)
        await refresh()
    }, [refresh])

    const clear = useCallback(async (layer?: MemoryLayer) => {
        await memoryStore.clear(layer)
        await refresh()
    }, [refresh])

    const search = useCallback(async (query: string, layer?: MemoryLayer) => {
        return memoryStore.search(query, layer)
    }, [])

    const exportToJSON = useCallback(() => {
        const data = {
            exportedAt: new Date().toISOString(),
            memories: memories.map(m => ({
                ...m,
                timestamp: m.timestamp.toISOString()
            }))
        }
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `agent-zero-memories-${new Date().toISOString().split("T")[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }, [memories])

    return {
        memories,
        loading,
        stats,
        save,
        remove,
        clear,
        search,
        refresh,
        exportToJSON
    }
}

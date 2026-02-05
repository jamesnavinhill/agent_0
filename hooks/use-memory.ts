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
            const res = await fetch("/api/agent/memory?limit=100")
            if (res.ok) {
                const data = await res.json()
                setMemories(data.memories || [])
                const knowledgeItems = data.knowledge || []

                // Calculate stats client side for now or fetch from API
                const items = data.memories || []
                const stats = {
                    total: items.length + knowledgeItems.length,
                    byLayer: {
                        shortTerm: items.filter((m: any) => m.type === "shortTerm").length,
                        longTerm: items.filter((m: any) => m.type === "longTerm").length,
                        episodic: items.filter((m: any) => m.type === "episodic").length,
                        semantic: items.filter((m: any) => m.type === "semantic").length,
                    },
                    knowledge: knowledgeItems
                }
                setStats(stats)
            }
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
        try {
            await fetch("/api/agent/memory", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "add",
                    item: {
                        content,
                        layer,
                        relevance: metadata?.relevance ?? 0.5,
                        tags: metadata?.tags ?? [],
                        source: metadata?.source ?? "manual"
                    }
                })
            })
            await refresh()
        } catch (error) {
            console.error("Failed to save memory:", error)
        }
    }, [refresh])

    const remove = useCallback(async (id: string) => {
        await fetch(`/api/agent/memory?id=${id}`, { method: "DELETE" })
        await refresh()
    }, [refresh])

    const clear = useCallback(async (layer?: MemoryLayer) => {
        const url = layer ? `/api/agent/memory?layer=${layer}` : "/api/agent/memory"
        await fetch(url, { method: "DELETE" })
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
        a.download = `komorebi-memories-${new Date().toISOString().split("T")[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }, [memories])

    return {
        memories,
        knowledge: (stats as any).knowledge || [],
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


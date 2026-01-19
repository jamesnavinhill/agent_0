
import { NextResponse } from "next/server"
import { getRecentMemories, addMemory, deleteMemory, clearMemories } from "@/lib/db/memories"
import { getRecentKnowledge } from "@/lib/db/knowledge"

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const type = searchParams.get("type") as string | undefined
        const limit = parseInt(searchParams.get("limit") || "50")

        const [memories, knowledge] = await Promise.all([
            getRecentMemories(limit, type !== "all" ? type : undefined),
            getRecentKnowledge(limit)
        ])

        return NextResponse.json({
            memories,
            knowledge
        })
    } catch (error) {
        console.error("Failed to fetch memory data:", error)
        return NextResponse.json({ error: "Failed to fetch memory data" }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { action, item } = body

        if (action === "add" && item) {
            const success = await addMemory(item)
            return NextResponse.json({ success })
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get("id")
        const layer = searchParams.get("layer")

        if (id) {
            await deleteMemory(id)
        } else {
            await clearMemories(layer || undefined)
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 })
    }
}

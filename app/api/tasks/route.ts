import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/neon"

export const dynamic = "force-dynamic"

export interface Task {
    id: string
    name: string
    description: string | null
    schedule: string
    enabled: boolean
    last_run: string | null
    next_run: string | null
    last_status: string | null
    created_at: string
}

export async function GET() {
    try {
        console.log("Fetching tasks...")
        const tasks = await sql<Task>(`SELECT * FROM tasks ORDER BY created_at DESC`)
        console.log("Fetched tasks:", tasks.length)
        return NextResponse.json(tasks)
    } catch (error) {
        console.error("Error fetching tasks:", error)
        return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { name, description, schedule, enabled } = body

        const rows = await sql<Task>(
            `INSERT INTO tasks (name, description, schedule, enabled)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
            [name, description, schedule, enabled ?? true]
        )

        return NextResponse.json(rows[0])
    } catch (error: any) {
        console.error("Error creating task:", error)
        return NextResponse.json({
            error: "Failed to create task",
            details: error.message
        }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams
        const id = searchParams.get("id")

        if (!id) {
            return NextResponse.json({ error: "Task ID required" }, { status: 400 })
        }

        await sql(`DELETE FROM tasks WHERE id = $1`, [id])
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting task:", error)
        return NextResponse.json({ error: "Failed to delete task" }, { status: 500 })
    }
}

import { NextRequest, NextResponse } from "next/server"
import { getTask } from "@/lib/db/tasks"
import { executeTask } from "@/lib/agent/runner"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { taskId } = body

        if (!taskId) {
            return NextResponse.json({ error: "taskId is required" }, { status: 400 })
        }

        const task = await getTask(taskId)
        if (!task) {
            return NextResponse.json({ error: "Task not found" }, { status: 404 })
        }

        const result = await executeTask(task, true) // isManual = true

        if (result.status === "error") {
            return NextResponse.json({ error: result.error }, { status: 500 })
        }

        return NextResponse.json(result)

    } catch (error: any) {
        console.error("Execute API failed:", error)
        return NextResponse.json({
            error: "Failed to execute task",
            details: error.message
        }, { status: 500 })
    }
}

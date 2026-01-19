import { NextRequest, NextResponse } from "next/server"
import { getDueTasks, updateTaskStatus, updateTaskSchedule } from "@/lib/db/tasks"
import { generateText } from "@/lib/api/gemini"
import { getNextRunTime } from "@/lib/scheduler/cron"
import { pushActivity } from "@/lib/activity/bus"
import { performMorningRead } from "@/lib/agent/tools/research"
import { executeTask } from "@/lib/agent/runner"

export const dynamic = "force-dynamic"
export const maxDuration = 60 // Allow longer timeout for cron jobs

export async function GET(req: NextRequest) {
    // Verify Cron Secret if set
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
        const authHeader = req.headers.get("authorization")
        if (authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
    }

    try {
        const tasks = await getDueTasks()

        if (tasks.length === 0) {
            return NextResponse.json({ message: "No tasks due" })
        }

        const results = await Promise.all(tasks.map(async (task) => {
            return await executeTask(task, false) // isManual = false
        }))

        return NextResponse.json({ results })
    } catch (error) {
        console.error("Cron execution failed:", error)
        return NextResponse.json({ error: "Cron execution failed" }, { status: 500 })
    }
}

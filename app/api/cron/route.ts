import { NextRequest, NextResponse } from "next/server"
import { getDueTasks, updateTaskStatus, updateTaskSchedule } from "@/lib/db/tasks"
import { generateText } from "@/lib/api/gemini"
import { getNextRunTime } from "@/lib/scheduler/cron"
import { pushActivity } from "@/lib/activity/bus"
import { performMorningRead } from "@/lib/agent/tools/research"

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
            // 1. Mark as running
            await updateTaskStatus(task.id, "running")

            pushActivity({
                action: `Executing task: ${task.name}`,
                source: "Scheduler",
                level: "action",
                metadata: { taskId: task.id, category: task.category }
            })

            try {
                // 2. Execute
                let output = ""
                
                // Route tasks to specialized handlers
                if (task.name.includes("Morning Read") || task.category === "research") {
                     output = await performMorningRead()
                } else if (task.prompt) {
                    // Use prompt if available
                    output = await generateText(task.prompt)
                } else {
                    // Fallback based on category
                    const prompt = `Perform the task: ${task.name}. ${task.description || ""}`
                    output = await generateText(prompt)
                }

                // 3. Update Schedule
                const nextRun = getNextRunTime(task.schedule) || new Date(Date.now() + 24 * 60 * 60 * 1000)
                await updateTaskSchedule(task.id, new Date(), nextRun)

                await updateTaskStatus(task.id, "complete", output.slice(0, 100) + "...") // Store snippet?

                pushActivity({
                    action: `Task completed: ${task.name}`,
                    details: output.slice(0, 100) + "...",
                    source: "Scheduler",
                    level: "info",
                    metadata: { taskId: task.id }
                })

                return { id: task.id, status: "success", nextRun }
            } catch (error: any) {
                console.error(`Task ${task.id} failed:`, error)
                await updateTaskStatus(task.id, "error", error.message)

                pushActivity({
                    action: `Task failed: ${task.name}`,
                    details: error.message,
                    source: "Scheduler",
                    level: "error",
                    metadata: { taskId: task.id }
                })

                return { id: task.id, status: "error", error: error.message }
            }
        }))

        return NextResponse.json({ results })
    } catch (error) {
        console.error("Cron execution failed:", error)
        return NextResponse.json({ error: "Cron execution failed" }, { status: 500 })
    }
}

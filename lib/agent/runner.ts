import { Task } from "@/app/api/tasks/route"
import { updateTaskStatus, updateTaskSchedule } from "@/lib/db/tasks"
import { generateText } from "@/lib/api/gemini"
import { getNextRunTime } from "@/lib/scheduler/cron"
import { pushActivity } from "@/lib/activity/bus"
import { performMorningRead } from "@/lib/agent/tools/research"
import { performDailyArt, generateVideo, editGalleryImage } from "@/lib/agent/tools/media"

export interface ExecutionResult {
    id: string
    status: "success" | "error"
    nextRun?: Date
    error?: string
    output?: string
}

/**
 * Execute a single task with full lifecycle management (DB updates, activity logging)
 */
export async function executeTask(task: Task, isManual = false): Promise<ExecutionResult> {
    try {
        // 1. Mark as running
        await updateTaskStatus(task.id, "running")

        pushActivity({
            action: `Executing task: ${task.name}`,
            source: isManual ? "User" : "Scheduler",
            level: "action",
            metadata: { taskId: task.id, category: task.category, manual: isManual }
        })

        // 2. Execute Logic
        let output = ""

        console.log(`[Runner] Routing task: name="${task.name}", category="${task.category}"`)

        // Route tasks to specialized handlers
        if (task.name.includes("Morning Read") || task.category === "research") {
            console.log("[Runner] -> Research path")
            output = await performMorningRead()
        } else if (task.name.includes("Motion") || task.category === "video") {
            console.log("[Runner] -> Video generation path")
            output = await generateVideo(task)
            console.log("[Runner] Video generation completed:", output)
        } else if (task.name.includes("Edit") && task.parameters?.galleryId) {
            console.log("[Runner] -> Image edit path")
            const galleryId = task.parameters.galleryId as string
            const editPrompt = task.parameters.editPrompt as string || "Enhance and refine this artwork"
            output = await editGalleryImage(galleryId, editPrompt)
        } else if (task.name.includes("Media") || task.category === "art") {
            console.log("[Runner] -> Image generation path")
            output = await performDailyArt(task)
        } else if (task.prompt) {
            console.log("[Runner] -> Prompt-based path")
            output = await generateText(task.prompt)
        } else {
            console.log("[Runner] -> Fallback path")
            const prompt = `Perform the task: ${task.name}. ${task.description || ""}`
            output = await generateText(prompt)
        }

        // 3. Update Schedule
        // If manual, we still update the "last_run" but maybe we respect the original next_run?
        // Actually, adhering to standard cron behavior: if run now, next run is calculated from schedule relative to now.
        const nextRun = getNextRunTime(task.schedule) || new Date(Date.now() + 24 * 60 * 60 * 1000)
        await updateTaskSchedule(task.id, new Date(), nextRun)

        const resultSnippet = output.slice(0, 100) + (output.length > 100 ? "..." : "")
        await updateTaskStatus(task.id, "complete", resultSnippet)

        pushActivity({
            action: `Task completed: ${task.name}`,
            details: resultSnippet,
            source: isManual ? "User" : "Scheduler",
            level: "info",
            metadata: { taskId: task.id }
        })

        return { id: task.id, status: "success", nextRun, output }

    } catch (error: any) {
        console.error(`Task ${task.id} failed:`, error)
        await updateTaskStatus(task.id, "error", error.message)

        pushActivity({
            action: `Task failed: ${task.name}`,
            details: error.message,
            source: isManual ? "User" : "Scheduler",
            level: "error",
            metadata: { taskId: task.id }
        })

        return { id: task.id, status: "error", error: error.message }
    }
}

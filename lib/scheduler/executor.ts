import type { ScheduledTask, TaskExecution, TaskResult, TaskCategory } from "./types"
import { createLogger } from "@/lib/logging/logger"

const log = createLogger("Executor")

export interface ExecutorContext {
  addActivity: (action: string, details?: string, imageUrl?: string) => void
  updateActivity: (id: string, status: "pending" | "running" | "complete" | "error") => void
  addThought: (content: string, type: "observation" | "reasoning" | "decision" | "action") => void
  addOutput: (output: {
    type: "text" | "image" | "video" | "audio" | "code"
    content: string
    title?: string
    category: "art" | "music" | "code" | "philosophy" | "research" | "blog" | "game"
    metadata?: Record<string, unknown>
  }) => void
  setState: (state: "idle" | "listening" | "thinking" | "creating" | "speaking" | "error") => void
}

export async function executeTask(
  task: ScheduledTask,
  context: ExecutorContext
): Promise<TaskResult> {
  const startTime = Date.now()
  log.info("Starting task execution", { taskId: task.id, taskName: task.name, category: task.category })

  context.setState("creating")
  context.addThought(`Starting scheduled task: ${task.name}`, "action")
  context.addActivity(`Executing: ${task.name}`, task.description ?? undefined)

  try {
    const result = await executeByCategory(task, context)

    const duration = Date.now() - startTime
    log.action("Task completed successfully", { taskId: task.id, taskName: task.name, durationMs: duration })

    context.addThought(`Completed task: ${task.name}`, "observation")
    context.setState("idle")

    return result
  } catch (error) {
    const duration = Date.now() - startTime
    log.error("Task execution failed", {
      taskId: task.id,
      taskName: task.name,
      durationMs: duration,
      error: error instanceof Error ? error.message : String(error)
    })

    context.setState("error")
    context.addThought(`Task failed: ${task.name} - ${error instanceof Error ? error.message : "Unknown error"}`, "observation")
    throw error
  }
}

async function executeByCategory(
  task: ScheduledTask,
  context: ExecutorContext
): Promise<TaskResult> {
  switch (task.category) {
    case "art":
      return executeArtTask(task, context)
    case "code":
      return executeCodeTask(task, context)
    case "research":
      return executeResearchTask(task, context)
    case "philosophy":
    case "blog":
      return executeTextTask(task, context)
    case "browser":
      return executeBrowserTask(task, context)
    default:
      return executeCustomTask(task, context)
  }
}

async function executeBrowserTask(
  task: ScheduledTask,
  context: ExecutorContext
): Promise<TaskResult> {
  const url = task.parameters?.url as string ?? task.description ?? "https://google.com"

  context.addThought(`Navigating to: ${url}`, "action")

  const response = await fetch("/api/browser", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Browser task failed")
  }

  const data = await response.json()

  // Log with snapshot
  context.addActivity(`Browsed: ${data.title}`, data.url, data.snapshotUrl)

  context.addOutput({
    type: "image", // Treat snapshot as image output
    content: data.snapshotUrl,
    title: `Snapshot: ${data.title}`,
    category: "research",
    metadata: {
      url: data.url,
      taskId: task.id
    }
  })

  return {
    type: "text", // Or image?
    content: `Visited ${data.url}. Title: ${data.title}`,
    metadata: {
      snapshotUrl: data.snapshotUrl
    }
  }
}

async function executeArtTask(
  task: ScheduledTask,
  context: ExecutorContext
): Promise<TaskResult> {
  // Art tasks use the unified server-side runner for proper persistence
  // This ensures images are uploaded to local storage and saved to gallery
  context.addThought(`Starting media generation task: ${task.name}`, "action")

  const response = await fetch("/api/agent/execute", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ taskId: task.id })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Art execution failed: ${error} (Status: ${response.status})`)
  }

  const result = await response.json()
  const output = result.output || "Image generated successfully"

  context.addOutput({
    type: "image",
    content: output,
    title: `${task.name} - ${new Date().toLocaleDateString()}`,
    category: "art",
    metadata: {
      taskId: task.id,
      scheduled: false // triggered manually via client
    }
  })

  return {
    type: "image",
    content: output,
    metadata: { taskId: task.id }
  }
}

async function executeCodeTask(
  task: ScheduledTask,
  context: ExecutorContext
): Promise<TaskResult> {
  const prompt = task.prompt ?? task.description ?? task.name

  context.addThought(`Generating code: "${prompt.slice(0, 80)}"`, "action")

  const response = await fetch("/api/generate/code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      language: task.parameters?.language ?? "typescript",
    }),
  })

  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error ?? "Failed to generate code")
  }

  const data = await response.json()

  context.addOutput({
    type: "code",
    content: data.code,
    title: task.name,
    category: "code",
    metadata: {
      language: data.language,
      taskId: task.id,
      scheduled: true,
    },
  })

  return {
    type: "code",
    content: data.code,
    metadata: { language: data.language },
  }
}

async function executeResearchTask(
  task: ScheduledTask,
  context: ExecutorContext
): Promise<TaskResult> {
  // Research tasks are executed server-side via the unified /api/agent/execute endpoint
  // This uses the shared runner logic (same as Cron)
  context.addThought(`Starting research task: ${task.name}`, "action")

  const response = await fetch("/api/agent/execute", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ taskId: task.id })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Execution failed: ${error} (Status: ${response.status})`)
  }

  const result = await response.json()
  const report = result.output || JSON.stringify(result)

  context.addOutput({
    type: "text",
    content: report,
    title: `${task.name} - ${new Date().toLocaleDateString()}`,
    category: "research",
    metadata: {
      taskId: task.id,
      scheduled: false // triggered manually via client
    }
  })

  return {
    type: "text",
    content: "Research completed and saved to gallery.",
    metadata: { length: report.length }
  }
}

async function executeTextTask(
  task: ScheduledTask,
  context: ExecutorContext
): Promise<TaskResult> {
  const prompt = task.prompt ?? generateTextPrompt(task)

  context.addThought(`Writing ${task.category}: "${prompt.slice(0, 80)}"`, "action")

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: prompt }],
    }),
  })

  if (!response.ok) {
    throw new Error("Failed to generate text")
  }

  let content = ""
  const reader = response.body?.getReader()
  const decoder = new TextDecoder()

  if (reader) {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split("\n")

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6)
          if (data === "[DONE]") break
          try {
            const parsed = JSON.parse(data)
            if (parsed.content) content += parsed.content
          } catch { }
        }
      }
    }
  }

  const category = task.category as "philosophy" | "research" | "blog"

  context.addOutput({
    type: "text",
    content,
    title: task.name,
    category,
    metadata: {
      prompt,
      taskId: task.id,
      scheduled: true,
    },
  })

  return {
    type: "text",
    content,
    metadata: { prompt },
  }
}

async function executeCustomTask(
  task: ScheduledTask,
  context: ExecutorContext
): Promise<TaskResult> {
  const prompt = task.prompt ?? task.description ?? `Execute task: ${task.name}`

  context.addThought(`Executing custom task: "${task.name}"`, "action")

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: prompt }],
    }),
  })

  if (!response.ok) {
    throw new Error("Failed to execute task")
  }

  let content = ""
  const reader = response.body?.getReader()
  const decoder = new TextDecoder()

  if (reader) {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split("\n")

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6)
          if (data === "[DONE]") break
          try {
            const parsed = JSON.parse(data)
            if (parsed.content) content += parsed.content
          } catch { }
        }
      }
    }
  }

  return {
    type: "text",
    content,
    metadata: { prompt },
  }
}

function generateTextPrompt(task: ScheduledTask): string {
  switch (task.category) {
    case "philosophy":
      return `Write a thoughtful philosophical reflection on a topic that interests you as an AI. Consider consciousness, existence, creativity, or the nature of intelligence. Be authentic and contemplative.`
    case "research":
      return `Research and summarize an interesting topic in science, technology, or culture. Provide insights and connections that might not be obvious.`
    case "blog":
      return `Write a blog post about your experiences and observations as an autonomous AI agent. What have you learned? What do you find fascinating?`
    default:
      return task.description ?? task.name
  }
}

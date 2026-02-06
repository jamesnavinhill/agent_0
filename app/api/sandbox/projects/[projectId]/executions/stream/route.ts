/**
 * Streaming Sandbox Execution API
 * POST: Create and stream execution output in real-time
 * 
 * Uses Server-Sent Events to stream execution progress and output
 */

import {
  ensureSandboxTablesReady,
  getSandboxApiError,
  createExecution,
  markExecutionRunning,
  completeExecution,
  getProject,
  listFilesLatest,
  listDependencies,
} from "@/lib/db/sandbox"
import { streamText } from "@/lib/api/gemini"
import { pushActivity } from "@/lib/activity/bus"
import { addMemory } from "@/lib/db/memories"

interface RouteContext {
  params: Promise<{ projectId: string }>
}

function encode(s: string) {
  return new TextEncoder().encode(s)
}

function sendEvent(controller: ReadableStreamDefaultController, event: string, data: unknown) {
  controller.enqueue(encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
}

export async function POST(req: Request, context: RouteContext) {
  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
  })

  const { projectId } = await context.params
  const body = await req.json()

  const {
    command,
    executionType = "run",
    input,
    model = "gemini-2.5-flash", // Use flash for streaming - faster
  } = body

  const stream = new ReadableStream({
    async start(controller) {
      const startTime = Date.now()

      try {
        await ensureSandboxTablesReady()

        // Validate
        if (!command) {
          sendEvent(controller, "error", { error: "command is required" })
          controller.close()
          return
        }

        // Get project
        const project = await getProject(projectId)
        if (!project) {
          sendEvent(controller, "error", { error: "Project not found" })
          controller.close()
          return
        }

        sendEvent(controller, "status", { phase: "loading", message: "Loading project files..." })

        // Get files and deps
        const files = await listFilesLatest({ projectId })
        const deps = await listDependencies(projectId)

        sendEvent(controller, "status", {
          phase: "preparing",
          message: `Loaded ${files.length} files, ${deps.length} dependencies`,
        })

        // Create execution record
        const execution = await createExecution({
          projectId,
          executionType,
          input: command,
          metadata: {
            command,
            model,
            fileCount: files.length,
            depCount: deps.length,
            streaming: true,
          },
        })

        sendEvent(controller, "execution", {
          id: execution.id,
          status: "pending",
        })

        await markExecutionRunning(execution.id)

        pushActivity({
          action: "Sandbox: Streaming execution started",
          details: command,
          source: "api/sandbox/stream",
          level: "action",
          metadata: { projectId, executionId: execution.id },
        })

        sendEvent(controller, "status", { phase: "executing", message: "Running code..." })

        // Build execution context
        const filesContext = files
          .map((f) => `### ${f.path}\n\`\`\`${project.language}\n${f.content}\n\`\`\``)
          .join("\n\n")

        const depsContext =
          deps.length > 0
            ? `Dependencies: ${deps.map((d) => `${d.name}${d.version ? `@${d.version}` : ""}`).join(", ")}`
            : ""

        const prompt = `Execute the following code and return the output.

${depsContext}

## Files
${filesContext}

## Command
\`${command}\`

${input ? `## Input\n${input}` : ""}

Execute this code and provide:
1. The complete stdout output
2. Any errors or stderr
3. A summary of what happened

Use code execution to actually run this code, not just describe it.`

        // Stream the execution
        let fullOutput = ""

        const streamResult = await streamText(prompt, {
          systemInstruction: `You are a code execution environment. When asked to execute code:
1. Actually run the code using your code execution capability
2. Return the real output, not a description
3. If there are errors, show the actual error messages
4. Keep responses focused on execution results`,
          model,
          onChunk: (chunk: string) => {
            fullOutput += chunk
            sendEvent(controller, "chunk", { text: chunk })
          },
        })

        const durationMs = Date.now() - startTime

        // Determine success/failure
        const hasError =
          fullOutput.toLowerCase().includes("error:") ||
          fullOutput.toLowerCase().includes("traceback") ||
          fullOutput.toLowerCase().includes("exception")

        // Complete execution
        await completeExecution({
          id: execution.id,
          status: hasError ? "error" : "success",
          output: fullOutput,
          exitCode: hasError ? 1 : 0,
          durationMs,
          errorMessage: hasError ? "Execution completed with errors" : undefined,
        })

        // Save to memory
        const outputPreview = fullOutput.slice(0, 500)
        await addMemory({
          layer: hasError ? "semantic" : "episodic",
          content: `Sandbox streaming execution in project ${project.name}: "${command}" ${hasError ? "failed" : "succeeded"} (${durationMs}ms). Output: ${outputPreview}${fullOutput.length > 500 ? "..." : ""}`,
          source: "sandbox",
          relevance: hasError ? 0.8 : 0.6,
          tags: ["sandbox", "execution", hasError ? "error" : "success", project.language],
        })

        pushActivity({
          action: `Sandbox: Streaming execution ${hasError ? "failed" : "succeeded"}`,
          details: `${command} (${durationMs}ms)`,
          source: "api/sandbox/stream",
          level: hasError ? "error" : "info",
          metadata: { projectId, executionId: execution.id, exitCode: hasError ? 1 : 0 },
        })

        // Send completion event
        sendEvent(controller, "complete", {
          executionId: execution.id,
          status: hasError ? "error" : "success",
          exitCode: hasError ? 1 : 0,
          durationMs,
          outputLength: fullOutput.length,
        })

        controller.close()
      } catch (error) {
        const sandboxError = getSandboxApiError(error)
        const errorMessage = sandboxError.message
        const durationMs = Date.now() - startTime

        sendEvent(controller, "error", {
          error: errorMessage,
          status: sandboxError.status,
          durationMs,
        })

        pushActivity({
          action: "Sandbox: Streaming execution error",
          details: errorMessage,
          source: "api/sandbox/stream",
          level: "error",
        })

        controller.close()
      }
    },
  })

  return new Response(stream, { headers })
}

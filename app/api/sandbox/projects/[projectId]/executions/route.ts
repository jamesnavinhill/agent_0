/**
 * Sandbox Executions API
 * GET: List executions for a project
 * POST: Create and run a new execution
 */

import { NextResponse } from "next/server"
import {
  listExecutions,
  createExecution,
  markExecutionRunning,
  completeExecution,
  getProject,
  listFilesLatest,
  listDependencies,
  getExecution,
} from "@/lib/db/sandbox"
import { generateText } from "@/lib/api/gemini"
import { pushActivity } from "@/lib/activity/bus"

interface RouteContext {
  params: Promise<{ projectId: string }>
}

export async function GET(req: Request, context: RouteContext) {
  try {
    const { projectId } = await context.params
    const { searchParams } = new URL(req.url)
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : 50
    const offset = searchParams.get("offset")
      ? parseInt(searchParams.get("offset")!)
      : 0

    // Check for specific execution ID
    const executionId = searchParams.get("id")
    if (executionId) {
      const execution = await getExecution(executionId)
      if (!execution) {
        return NextResponse.json({ error: "Execution not found" }, { status: 404 })
      }
      return NextResponse.json(execution)
    }

    const executions = await listExecutions({ projectId, limit, offset })
    return NextResponse.json({ executions, count: executions.length })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list executions"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request, context: RouteContext) {
  try {
    const { projectId } = await context.params
    const body = await req.json()

    const {
      command,
      executionType = "run",
      input,
      model = "gemini-2.5-pro",
    } = body

    if (!command) {
      return NextResponse.json({ error: "command is required" }, { status: 400 })
    }

    // Get project info
    const project = await getProject(projectId)
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Get files and deps
    const files = await listFilesLatest({ projectId })
    const deps = await listDependencies(projectId)

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
      },
    })

    await markExecutionRunning(execution.id)

    pushActivity({
      action: "Sandbox: Execution started via API",
      details: command,
      source: "api/sandbox",
      level: "action",
      metadata: { projectId, executionId: execution.id },
    })

    const startTime = Date.now()

    try {
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

      const result = await generateText(prompt, {
        systemInstruction: `You are a code execution environment. When asked to execute code:
1. Actually run the code using your code execution capability
2. Return the real output, not a description
3. If there are errors, show the actual error messages
4. Keep responses focused on execution results`,
        model,
      })

      const durationMs = Date.now() - startTime
      const hasError =
        result.toLowerCase().includes("error:") ||
        result.toLowerCase().includes("traceback")

      // Complete execution
      const completed = await completeExecution({
        id: execution.id,
        status: hasError ? "error" : "success",
        output: result,
        exitCode: hasError ? 1 : 0,
        durationMs,
        errorMessage: hasError ? "Execution completed with errors" : undefined,
      })

      pushActivity({
        action: `Sandbox: Execution ${hasError ? "failed" : "succeeded"} via API`,
        details: `${command} (${durationMs}ms)`,
        source: "api/sandbox",
        level: hasError ? "error" : "info",
        metadata: { projectId, executionId: execution.id, exitCode: hasError ? 1 : 0 },
      })

      return NextResponse.json(completed)
    } catch (execError) {
      const errorMessage =
        execError instanceof Error ? execError.message : "Execution failed"
      const durationMs = Date.now() - startTime

      const completed = await completeExecution({
        id: execution.id,
        status: "error",
        output: "",
        exitCode: 1,
        durationMs,
        errorMessage,
      })

      return NextResponse.json(completed)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create execution"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

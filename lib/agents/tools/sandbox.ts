/**
 * Sandbox Tool
 * Unified tool for agents to interact with the code sandbox environment
 * Supports project management, file operations, and code execution
 */

import { tool } from "ai"
import { z } from "zod"
import {
  ensureSandboxTablesReady,
  createProject,
  getProject,
  listProjects,
  updateProject,
  writeFile,
  getFileLatest,
  listFilesLatest,
  deleteFile,
  setDependencies,
  listDependencies,
  createExecution,
  markExecutionRunning,
  completeExecution,
  getExecution,
  listExecutions,
  getFullProject,
  type SandboxProject,
  type SandboxFile,
  type SandboxExecution,
} from "@/lib/db/sandbox"
import { pushActivity } from "@/lib/activity/bus"
import { generateText, type GeminiModel } from "@/lib/api/gemini"
import { addMemory } from "@/lib/db/memories"

/**
 * Execution adapter - uses Gemini code execution capability
 */
async function executeCode(options: {
  language: "typescript" | "javascript" | "python"
  files: Array<{ path: string; content: string }>
  deps: Array<{ name: string; version?: string | null }>
  command: string
  input?: string
  model?: string
}): Promise<{
  output: string
  exitCode: number
  durationMs: number
  error?: string
}> {
  const startTime = Date.now()

  try {
    // Build execution harness prompt
    const filesContext = options.files
      .map((f) => `### ${f.path}\n\`\`\`${options.language}\n${f.content}\n\`\`\``)
      .join("\n\n")

    const depsContext =
      options.deps.length > 0
        ? `Dependencies: ${options.deps.map((d) => `${d.name}${d.version ? `@${d.version}` : ""}`).join(", ")}`
        : ""

    const prompt = `Execute the following code and return the output.

${depsContext}

## Files
${filesContext}

## Command
\`${options.command}\`

${options.input ? `## Input\n${options.input}` : ""}

Execute this code and provide:
1. The complete stdout output
2. Any errors or stderr
3. A summary of what happened

Use code execution to actually run this code, not just describe it.`

    const systemPrompt = `You are a code execution environment. When asked to execute code:
1. Actually run the code using your code execution capability
2. Return the real output, not a description
3. If there are errors, show the actual error messages
4. Keep responses focused on execution results`

    const result = await generateText(prompt, {
      systemInstruction: systemPrompt,
      model: (options.model || "gemini-2.5-pro") as GeminiModel,
    })

    const durationMs = Date.now() - startTime

    // Parse the result for success/failure indicators
    const hasError =
      result.toLowerCase().includes("error:") ||
      result.toLowerCase().includes("traceback") ||
      result.toLowerCase().includes("exception")

    return {
      output: result,
      exitCode: hasError ? 1 : 0,
      durationMs,
      error: hasError ? "Execution completed with errors" : undefined,
    }
  } catch (error) {
    return {
      output: "",
      exitCode: 1,
      durationMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : "Unknown execution error",
    }
  }
}

/**
 * Sandbox Tool Schema
 */
const sandboxActionSchema = z.discriminatedUnion("action", [
  // Project actions
  z.object({
    action: z.literal("create_project"),
    name: z.string().describe("Project name"),
    description: z.string().optional().describe("Project description"),
    framework: z.string().optional().describe("Framework (e.g., next.js, react, node, python)"),
    language: z.enum(["typescript", "javascript", "python"]).default("typescript"),
  }),
  z.object({
    action: z.literal("get_project"),
    projectId: z.string().describe("Project ID"),
  }),
  z.object({
    action: z.literal("list_projects"),
    status: z.enum(["active", "archived"]).optional(),
    limit: z.number().optional(),
  }),
  z.object({
    action: z.literal("update_project"),
    projectId: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    status: z.enum(["active", "archived"]).optional(),
    framework: z.string().optional(),
  }),

  // File actions
  z.object({
    action: z.literal("write_file"),
    projectId: z.string(),
    path: z.string().describe("File path relative to project root (e.g., 'src/index.ts')"),
    content: z.string().describe("File content"),
    fileType: z.string().optional(),
  }),
  z.object({
    action: z.literal("read_file"),
    projectId: z.string(),
    path: z.string(),
  }),
  z.object({
    action: z.literal("list_files"),
    projectId: z.string(),
    prefix: z.string().optional().describe("Filter by path prefix (e.g., 'src/')"),
  }),
  z.object({
    action: z.literal("delete_file"),
    projectId: z.string(),
    path: z.string(),
  }),

  // Dependency actions
  z.object({
    action: z.literal("set_dependencies"),
    projectId: z.string(),
    dependencies: z.array(
      z.object({
        name: z.string(),
        version: z.string().optional(),
        dev: z.boolean().optional(),
      })
    ),
  }),
  z.object({
    action: z.literal("list_dependencies"),
    projectId: z.string(),
  }),

  // Execution actions
  z.object({
    action: z.literal("run"),
    projectId: z.string(),
    command: z.string().describe("Command to run (e.g., 'node index.js' or 'python main.py')"),
    entryPath: z.string().optional().describe("Entry file path (defaults to main file)"),
    input: z.string().optional().describe("Input to pass to the program"),
    model: z.string().optional().describe("Model to use for execution (default: gemini-2.5-pro)"),
  }),
  z.object({
    action: z.literal("get_execution"),
    executionId: z.string(),
  }),
  z.object({
    action: z.literal("list_executions"),
    projectId: z.string(),
    limit: z.number().optional(),
  }),
])

type SandboxAction = z.infer<typeof sandboxActionSchema>

/**
 * Sandbox Tool Implementation
 */
export const sandboxTool = tool({
  description: `Interact with the code sandbox environment. Actions:
- create_project: Create a new coding project
- get_project/list_projects: View project details
- write_file/read_file/list_files/delete_file: Manage project files
- set_dependencies/list_dependencies: Manage npm/pip packages
- run: Execute code in the sandbox
- get_execution/list_executions: View execution results

Use this for building, testing, and iterating on code.`,

  inputSchema: sandboxActionSchema,

  execute: async function* (input: SandboxAction) {
    const actionName = input.action.replace(/_/g, " ")
    yield { state: "validating" as const, message: `Validating ${actionName}...` }

    try {
      await ensureSandboxTablesReady()

      switch (input.action) {
        // ====================================================================
        // Project Actions
        // ====================================================================
        case "create_project": {
          yield { state: "persisting" as const, message: "Creating project..." }

          const project = await createProject({
            name: input.name,
            description: input.description,
            framework: input.framework,
            language: input.language,
          })

          pushActivity({
            action: "Sandbox: Project created",
            details: `${project.name} (${project.language})`,
            source: "sandbox-tool",
            level: "action",
            metadata: { projectId: project.id, framework: project.framework },
          })

          // Save to memory
          await addMemory({
            layer: "episodic",
            content: `Created sandbox project "${project.name}" (${project.language}${project.framework ? `, ${project.framework}` : ""}) with ID ${project.id}`,
            source: "sandbox",
            relevance: 0.7,
            tags: ["sandbox", "project", project.language, project.framework || ""].filter(Boolean),
          })

          yield {
            state: "complete" as const,
            project: {
              id: project.id,
              name: project.name,
              language: project.language,
              framework: project.framework,
            },
            message: `Created project "${project.name}" with ID ${project.id}`,
          }
          break
        }

        case "get_project": {
          yield { state: "fetching" as const, message: "Loading project..." }

          const fullProject = await getFullProject(input.projectId)
          if (!fullProject) {
            yield { state: "error" as const, error: `Project not found: ${input.projectId}` }
            break
          }

          yield {
            state: "complete" as const,
            project: {
              id: fullProject.id,
              name: fullProject.name,
              description: fullProject.description,
              framework: fullProject.framework,
              language: fullProject.language,
              fileCount: fullProject.files.length,
              files: fullProject.files.map((f) => f.path),
              dependencyCount: fullProject.dependencies.length,
              recentExecutions: fullProject.recentExecutions.length,
            },
          }
          break
        }

        case "list_projects": {
          yield { state: "fetching" as const, message: "Loading projects..." }

          const projects = await listProjects({
            status: input.status,
            limit: input.limit,
          })

          yield {
            state: "complete" as const,
            projects: projects.map((p) => ({
              id: p.id,
              name: p.name,
              framework: p.framework,
              language: p.language,
              status: p.status,
              updatedAt: p.updated_at,
            })),
            count: projects.length,
          }
          break
        }

        case "update_project": {
          yield { state: "persisting" as const, message: "Updating project..." }

          const updated = await updateProject(input.projectId, {
            name: input.name,
            description: input.description,
            status: input.status,
            framework: input.framework,
          })

          if (!updated) {
            yield { state: "error" as const, error: `Project not found: ${input.projectId}` }
            break
          }

          pushActivity({
            action: "Sandbox: Project updated",
            details: updated.name,
            source: "sandbox-tool",
            level: "info",
            metadata: { projectId: updated.id },
          })

          yield {
            state: "complete" as const,
            project: { id: updated.id, name: updated.name, status: updated.status },
          }
          break
        }

        // ====================================================================
        // File Actions
        // ====================================================================
        case "write_file": {
          yield { state: "persisting" as const, message: `Writing ${input.path}...` }

          const file = await writeFile({
            projectId: input.projectId,
            path: input.path,
            content: input.content,
            fileType: input.fileType,
          })

          pushActivity({
            action: "Sandbox: File written",
            details: `${input.path} (v${file.version}, ${file.size_bytes} bytes)`,
            source: "sandbox-tool",
            level: "action",
            metadata: { projectId: input.projectId, path: input.path, version: file.version },
          })

          // Save significant files to memory (skip small config files)
          if (file.size_bytes && file.size_bytes > 100) {
            await addMemory({
              layer: "episodic",
              content: `Wrote file "${input.path}" (v${file.version}) to sandbox project ${input.projectId}. Size: ${file.size_bytes} bytes.`,
              source: "sandbox",
              relevance: 0.5,
              tags: ["sandbox", "file", file.file_type || "code"],
            })
          }

          yield {
            state: "complete" as const,
            file: {
              id: file.id,
              path: file.path,
              version: file.version,
              sizeBytes: file.size_bytes,
            },
            message: `Wrote ${input.path} (version ${file.version})`,
          }
          break
        }

        case "read_file": {
          yield { state: "fetching" as const, message: `Reading ${input.path}...` }

          const file = await getFileLatest(input.projectId, input.path)
          if (!file) {
            yield { state: "error" as const, error: `File not found: ${input.path}` }
            break
          }

          yield {
            state: "complete" as const,
            file: {
              path: file.path,
              content: file.content,
              version: file.version,
              fileType: file.file_type,
              sizeBytes: file.size_bytes,
            },
          }
          break
        }

        case "list_files": {
          yield { state: "fetching" as const, message: "Listing files..." }

          const files = await listFilesLatest({
            projectId: input.projectId,
            prefix: input.prefix,
          })

          yield {
            state: "complete" as const,
            files: files.map((f) => ({
              path: f.path,
              version: f.version,
              fileType: f.file_type,
              sizeBytes: f.size_bytes,
            })),
            count: files.length,
          }
          break
        }

        case "delete_file": {
          yield { state: "persisting" as const, message: `Deleting ${input.path}...` }

          await deleteFile(input.projectId, input.path)

          pushActivity({
            action: "Sandbox: File deleted",
            details: input.path,
            source: "sandbox-tool",
            level: "info",
            metadata: { projectId: input.projectId, path: input.path },
          })

          yield {
            state: "complete" as const,
            message: `Deleted ${input.path}`,
          }
          break
        }

        // ====================================================================
        // Dependency Actions
        // ====================================================================
        case "set_dependencies": {
          yield { state: "persisting" as const, message: "Setting dependencies..." }

          const deps = await setDependencies(
            input.projectId,
            input.dependencies.map((d) => ({
              name: d.name,
              version: d.version,
              devDependency: d.dev,
            }))
          )

          pushActivity({
            action: "Sandbox: Dependencies updated",
            details: `${deps.length} packages`,
            source: "sandbox-tool",
            level: "info",
            metadata: { projectId: input.projectId, count: deps.length },
          })

          yield {
            state: "complete" as const,
            dependencies: deps.map((d) => ({
              name: d.name,
              version: d.version,
              dev: d.dev_dependency,
            })),
            count: deps.length,
          }
          break
        }

        case "list_dependencies": {
          yield { state: "fetching" as const, message: "Loading dependencies..." }

          const deps = await listDependencies(input.projectId)

          yield {
            state: "complete" as const,
            dependencies: deps.map((d) => ({
              name: d.name,
              version: d.version,
              dev: d.dev_dependency,
            })),
            count: deps.length,
          }
          break
        }

        // ====================================================================
        // Execution Actions
        // ====================================================================
        case "run": {
          yield { state: "preparing" as const, message: "Preparing execution..." }

          // Get project and files
          const project = await getProject(input.projectId)
          if (!project) {
            yield { state: "error" as const, error: `Project not found: ${input.projectId}` }
            break
          }

          const files = await listFilesLatest({ projectId: input.projectId })
          const deps = await listDependencies(input.projectId)

          // Create execution record
          const execution = await createExecution({
            projectId: input.projectId,
            executionType: "run",
            input: input.command,
            metadata: {
              command: input.command,
              entryPath: input.entryPath,
              model: input.model,
              fileCount: files.length,
            },
          })

          yield { state: "executing" as const, message: "Running code...", executionId: execution.id }

          pushActivity({
            action: "Sandbox: Execution started",
            details: input.command,
            source: "sandbox-tool",
            level: "action",
            metadata: { projectId: input.projectId, executionId: execution.id },
          })

          await markExecutionRunning(execution.id)

          // Execute via adapter
          const result = await executeCode({
            language: project.language as "typescript" | "javascript" | "python",
            files: files.map((f) => ({ path: f.path, content: f.content })),
            deps: deps.map((d) => ({ name: d.name, version: d.version })),
            command: input.command,
            input: input.input,
            model: input.model,
          })

          // Complete execution record
          await completeExecution({
            id: execution.id,
            status: result.exitCode === 0 ? "success" : "error",
            output: result.output,
            exitCode: result.exitCode,
            durationMs: result.durationMs,
            errorMessage: result.error,
          })

          pushActivity({
            action: `Sandbox: Execution ${result.exitCode === 0 ? "succeeded" : "failed"}`,
            details: `${input.command} (${result.durationMs}ms)`,
            source: "sandbox-tool",
            level: result.exitCode === 0 ? "info" : "error",
            metadata: { projectId: input.projectId, executionId: execution.id, exitCode: result.exitCode },
          })

          // Save execution to memory - important for learning from successes and errors
          const outputPreview = result.output.slice(0, 500)
          await addMemory({
            layer: result.exitCode === 0 ? "episodic" : "semantic",
            content: `Sandbox execution in project ${project.name}: "${input.command}" ${result.exitCode === 0 ? "succeeded" : "failed"} (${result.durationMs}ms). Output: ${outputPreview}${result.output.length > 500 ? "..." : ""}`,
            source: "sandbox",
            relevance: result.exitCode === 0 ? 0.6 : 0.8, // Errors are more important to remember
            tags: ["sandbox", "execution", result.exitCode === 0 ? "success" : "error", project.language],
          })

          yield {
            state: "complete" as const,
            execution: {
              id: execution.id,
              status: result.exitCode === 0 ? "success" : "error",
              output: result.output,
              exitCode: result.exitCode,
              durationMs: result.durationMs,
              error: result.error,
            },
          }
          break
        }

        case "get_execution": {
          yield { state: "fetching" as const, message: "Loading execution..." }

          const execution = await getExecution(input.executionId)
          if (!execution) {
            yield { state: "error" as const, error: `Execution not found: ${input.executionId}` }
            break
          }

          yield {
            state: "complete" as const,
            execution: {
              id: execution.id,
              type: execution.execution_type,
              status: execution.status,
              output: execution.output,
              exitCode: execution.exit_code,
              durationMs: execution.duration_ms,
              error: execution.error_message,
              createdAt: execution.created_at,
            },
          }
          break
        }

        case "list_executions": {
          yield { state: "fetching" as const, message: "Loading executions..." }

          const executions = await listExecutions({
            projectId: input.projectId,
            limit: input.limit,
          })

          yield {
            state: "complete" as const,
            executions: executions.map((e) => ({
              id: e.id,
              type: e.execution_type,
              status: e.status,
              exitCode: e.exit_code,
              durationMs: e.duration_ms,
              createdAt: e.created_at,
            })),
            count: executions.length,
          }
          break
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"

      pushActivity({
        action: "Sandbox: Error",
        details: errorMessage,
        source: "sandbox-tool",
        level: "error",
      })

      yield {
        state: "error" as const,
        error: errorMessage,
      }
    }
  },
})

export default sandboxTool

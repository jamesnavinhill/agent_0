/**
 * React hook for sandbox project management
 */

"use client"

import { useState, useEffect, useCallback } from "react"

// Types matching the database schema
export interface SandboxProject {
  id: string
  name: string
  description: string | null
  status: "active" | "archived" | "deleted"
  framework: string | null
  language: string
  created_at: string
  updated_at: string
}

export interface SandboxFile {
  id: string
  path: string
  content: string
  file_type: string | null
  version: number
  size_bytes: number | null
}

export interface SandboxExecution {
  id: string
  execution_type: string
  status: "pending" | "running" | "success" | "error" | "timeout"
  output: string | null
  exit_code: number | null
  duration_ms: number | null
  created_at: string
}

export interface SandboxDependency {
  id: string
  name: string
  version: string | null
  dev_dependency: boolean
}

export interface FullProject extends SandboxProject {
  files: SandboxFile[]
  dependencies: SandboxDependency[]
  recentExecutions: SandboxExecution[]
}

export interface UseSandboxReturn {
  // State
  projects: SandboxProject[]
  selectedProject: FullProject | null
  isLoading: boolean
  isRunning: boolean
  error: string | null

  // Actions
  fetchProjects: () => Promise<void>
  selectProject: (projectId: string | null) => Promise<void>
  createProject: (input: {
    name: string
    description?: string
    framework?: string
    language?: string
  }) => Promise<SandboxProject | null>
  updateProject: (
    projectId: string,
    updates: Partial<SandboxProject>
  ) => Promise<SandboxProject | null>
  writeFile: (
    projectId: string,
    path: string,
    content: string
  ) => Promise<SandboxFile | null>
  deleteFile: (projectId: string, path: string) => Promise<boolean>
  setDependencies: (
    projectId: string,
    deps: Array<{ name: string; version?: string; dev?: boolean }>
  ) => Promise<SandboxDependency[]>
  runCode: (
    projectId: string,
    command: string,
    options?: { model?: string }
  ) => Promise<SandboxExecution | null>
  runCodeStreaming: (
    projectId: string,
    command: string,
    options?: {
      model?: string
      onChunk?: (chunk: string) => void
      onStatus?: (status: { phase: string; message: string }) => void
      onComplete?: (result: { executionId: string; status: string; exitCode: number; durationMs: number }) => void
    }
  ) => Promise<void>
  streamingOutput: string
  refresh: () => Promise<void>
}

export function useSandbox(): UseSandboxReturn {
  const [projects, setProjects] = useState<SandboxProject[]>([])
  const [selectedProject, setSelectedProject] = useState<FullProject | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [streamingOutput, setStreamingOutput] = useState("")

  const fetchProjects = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/sandbox/projects")
      if (!res.ok) throw new Error("Failed to fetch projects")
      const data = await res.json()
      setProjects(data.projects || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const selectProject = useCallback(async (projectId: string | null) => {
    if (!projectId) {
      setSelectedProject(null)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/sandbox/projects/${projectId}`)
      if (!res.ok) throw new Error("Failed to fetch project")
      const project = await res.json()
      setSelectedProject(project)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
      setSelectedProject(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createProject = useCallback(
    async (input: {
      name: string
      description?: string
      framework?: string
      language?: string
    }): Promise<SandboxProject | null> => {
      setError(null)
      try {
        const res = await fetch("/api/sandbox/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        })
        if (!res.ok) throw new Error("Failed to create project")
        const project = await res.json()
        setProjects((prev) => [project, ...prev])
        return project
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
        return null
      }
    },
    []
  )

  const updateProject = useCallback(
    async (
      projectId: string,
      updates: Partial<SandboxProject>
    ): Promise<SandboxProject | null> => {
      setError(null)
      try {
        const res = await fetch(`/api/sandbox/projects/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        })
        if (!res.ok) throw new Error("Failed to update project")
        const project = await res.json()
        setProjects((prev) =>
          prev.map((p) => (p.id === projectId ? project : p))
        )
        if (selectedProject?.id === projectId) {
          setSelectedProject((prev) => (prev ? { ...prev, ...project } : null))
        }
        return project
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
        return null
      }
    },
    [selectedProject]
  )

  const writeFile = useCallback(
    async (
      projectId: string,
      path: string,
      content: string
    ): Promise<SandboxFile | null> => {
      setError(null)
      try {
        const res = await fetch(`/api/sandbox/projects/${projectId}/files`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path, content }),
        })
        if (!res.ok) throw new Error("Failed to write file")
        const file = await res.json()

        // Update selected project files
        if (selectedProject?.id === projectId) {
          setSelectedProject((prev) => {
            if (!prev) return null
            const existingIndex = prev.files.findIndex((f) => f.path === path)
            if (existingIndex >= 0) {
              const newFiles = [...prev.files]
              newFiles[existingIndex] = file
              return { ...prev, files: newFiles }
            }
            return { ...prev, files: [...prev.files, file] }
          })
        }

        return file
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
        return null
      }
    },
    [selectedProject]
  )

  const deleteFileFromProject = useCallback(
    async (projectId: string, path: string): Promise<boolean> => {
      setError(null)
      try {
        const res = await fetch(
          `/api/sandbox/projects/${projectId}/files?path=${encodeURIComponent(path)}`,
          { method: "DELETE" }
        )
        if (!res.ok) throw new Error("Failed to delete file")

        // Update selected project files
        if (selectedProject?.id === projectId) {
          setSelectedProject((prev) => {
            if (!prev) return null
            return {
              ...prev,
              files: prev.files.filter((f) => f.path !== path),
            }
          })
        }

        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
        return false
      }
    },
    [selectedProject]
  )

  const setDependencies = useCallback(
    async (
      projectId: string,
      deps: Array<{ name: string; version?: string; dev?: boolean }>
    ): Promise<SandboxDependency[]> => {
      setError(null)
      try {
        const res = await fetch(
          `/api/sandbox/projects/${projectId}/dependencies`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dependencies: deps }),
          }
        )
        if (!res.ok) throw new Error("Failed to set dependencies")
        const data = await res.json()

        // Update selected project deps
        if (selectedProject?.id === projectId) {
          setSelectedProject((prev) =>
            prev ? { ...prev, dependencies: data.dependencies } : null
          )
        }

        return data.dependencies
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
        return []
      }
    },
    [selectedProject]
  )

  const runCode = useCallback(
    async (
      projectId: string,
      command: string,
      options?: { model?: string }
    ): Promise<SandboxExecution | null> => {
      setIsRunning(true)
      setError(null)
      try {
        const res = await fetch(
          `/api/sandbox/projects/${projectId}/executions`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              command,
              executionType: "run",
              model: options?.model,
            }),
          }
        )
        if (!res.ok) throw new Error("Failed to run code")
        const execution = await res.json()

        // Update selected project executions
        if (selectedProject?.id === projectId) {
          setSelectedProject((prev) =>
            prev
              ? {
                  ...prev,
                  recentExecutions: [execution, ...prev.recentExecutions.slice(0, 9)],
                }
              : null
          )
        }

        return execution
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
        return null
      } finally {
        setIsRunning(false)
      }
    },
    [selectedProject]
  )

  const runCodeStreaming = useCallback(
    async (
      projectId: string,
      command: string,
      options?: {
        model?: string
        onChunk?: (chunk: string) => void
        onStatus?: (status: { phase: string; message: string }) => void
        onComplete?: (result: { executionId: string; status: string; exitCode: number; durationMs: number }) => void
      }
    ): Promise<void> => {
      setIsRunning(true)
      setStreamingOutput("")
      setError(null)

      try {
        const res = await fetch(
          `/api/sandbox/projects/${projectId}/executions/stream`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              command,
              executionType: "run",
              model: options?.model,
            }),
          }
        )

        if (!res.ok) throw new Error("Failed to start streaming execution")
        if (!res.body) throw new Error("No response body")

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() || ""

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              const event = line.slice(7)
              const dataLine = lines[lines.indexOf(line) + 1]
              if (dataLine?.startsWith("data: ")) {
                const data = JSON.parse(dataLine.slice(6))

                switch (event) {
                  case "chunk":
                    setStreamingOutput((prev) => prev + data.text)
                    options?.onChunk?.(data.text)
                    break
                  case "status":
                    options?.onStatus?.(data)
                    break
                  case "complete":
                    options?.onComplete?.(data)
                    // Refresh project to get updated executions
                    if (selectedProject?.id === projectId) {
                      selectProject(projectId)
                    }
                    break
                  case "error":
                    setError(data.error)
                    break
                }
              }
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setIsRunning(false)
      }
    },
    [selectedProject, selectProject]
  )

  const refresh = useCallback(async () => {
    await fetchProjects()
    if (selectedProject) {
      await selectProject(selectedProject.id)
    }
  }, [fetchProjects, selectProject, selectedProject])

  // Initial fetch
  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  return {
    projects,
    selectedProject,
    isLoading,
    isRunning,
    error,
    streamingOutput,
    fetchProjects,
    selectProject,
    createProject,
    updateProject,
    writeFile,
    deleteFile: deleteFileFromProject,
    setDependencies,
    runCode,
    runCodeStreaming,
    refresh,
  }
}

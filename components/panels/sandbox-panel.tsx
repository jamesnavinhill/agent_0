"use client"

import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { useSandbox } from "@/hooks/use-sandbox"
import { getModelsByCapability, MODEL_PRESETS } from "@/lib/api/models"
import { getRecentActivities, subscribeActivity, type ActivityEvent } from "@/lib/activity/bus"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Switch } from "@/components/ui/switch"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Code2,
  FolderCode,
  FileCode,
  Play,
  Plus,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  Folder,
  File,
  Package,
  Terminal,
  History,
  Radio,
  Trash2,
  Activity,
  PencilLine,
  Scissors,
} from "lucide-react"

// Types matching the database schema
interface SandboxProject {
  id: string
  name: string
  description: string | null
  status: "active" | "archived" | "deleted"
  framework: string | null
  language: string
  created_at: string
  updated_at: string
}

interface SandboxFile {
  id: string
  path: string
  content: string
  file_type: string | null
  version: number
  size_bytes: number | null
}

interface SandboxExecution {
  id: string
  execution_type: string
  status: "pending" | "running" | "success" | "error" | "timeout"
  output: string | null
  exit_code: number | null
  duration_ms: number | null
  created_at: string
}

interface SandboxDependency {
  id: string
  name: string
  version: string | null
  dev_dependency: boolean
}

const statusConfig = {
  success: { icon: CheckCircle, color: "text-green-500", bg: "bg-green-500/10" },
  error: { icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10" },
  running: { icon: Loader2, color: "text-accent", bg: "bg-accent/10" },
  pending: { icon: Clock, color: "text-muted-foreground", bg: "bg-muted/50" },
  timeout: { icon: AlertCircle, color: "text-yellow-500", bg: "bg-yellow-500/10" },
}

export function SandboxPanel() {
  const {
    projects,
    selectedProject,
    isLoading,
    isRunning,
    error,
    health,
    healthLoading,
    healthError,
    streamingOutput,
    streamingHistory,
    selectProject,
    createProject,
    writeFile,
    deleteFile,
    setDependencies,
    runCode,
    runCodeStreaming,
    refresh,
    refreshHealth,
  } = useSandbox()

  const [selectedFile, setSelectedFile] = useState<SandboxFile | null>(null)
  const [selectedExecution, setSelectedExecution] = useState<SandboxExecution | null>(null)
  const [selectedStreamingEntryId, setSelectedStreamingEntryId] = useState<string | null>(null)
  const [sandboxActivity, setSandboxActivity] = useState<ActivityEvent[]>([])
  const [selectedSnippet, setSelectedSnippet] = useState("")
  const [editingSelection, setEditingSelection] = useState(false)
  const [selectionSourceContent, setSelectionSourceContent] = useState("")
  const [selectionNotice, setSelectionNotice] = useState<string | null>(null)

  // UI state
  const [showNewProjectForm, setShowNewProjectForm] = useState(false)
  const [showFilesSection, setShowFilesSection] = useState(true)
  const [showExecutionsSection, setShowExecutionsSection] = useState(true)
  const [showStreamingHistorySection, setShowStreamingHistorySection] = useState(true)
  const [showSandboxFeedSection, setShowSandboxFeedSection] = useState(false)
  const [showDepsSection, setShowDepsSection] = useState(false)
  const [useStreaming, setUseStreaming] = useState(true)

  // New project form
  const [newProjectName, setNewProjectName] = useState("")
  const [newProjectFramework, setNewProjectFramework] = useState("node")
  const [newProjectLanguage, setNewProjectLanguage] = useState("typescript")

  // Run command
  const [runCommand, setRunCommand] = useState("")
  const [selectedModel, setSelectedModel] = useState<string>(MODEL_PRESETS.codeExecution.default)
  const [streamingStatus, setStreamingStatus] = useState<string | null>(null)

  const [showFileEditor, setShowFileEditor] = useState(false)
  const [filePath, setFilePath] = useState("")
  const [fileContent, setFileContent] = useState("")
  const [depsInput, setDepsInput] = useState("")

  const availableModels = useMemo(
    () => getModelsByCapability("code-execution"),
    []
  )

  const files = selectedProject?.files ?? []
  const dependencies = selectedProject?.dependencies ?? []
  const executions = selectedProject?.recentExecutions ?? []

  const isLoadingProjects = isLoading && projects.length === 0
  const isLoadingFiles = isLoading && selectedProject !== null

  useEffect(() => {
    setSelectedFile(null)
    setSelectedExecution(null)
    setStreamingStatus(null)
    setSelectedSnippet("")
    setEditingSelection(false)
    setSelectionSourceContent("")
    setSelectionNotice(null)
    if (selectedProject) {
      const depString = (selectedProject.dependencies || [])
        .map((dep) => `${dep.name}${dep.version ? `@${dep.version}` : ""}${dep.dev_dependency ? " (dev)" : ""}`)
        .join("\n")
      setDepsInput(depString)
    } else {
      setDepsInput("")
    }
  }, [selectedProject?.id])

  useEffect(() => {
    if (!selectedFile) {
      setSelectedSnippet("")
      setSelectionSourceContent("")
      setEditingSelection(false)
      setSelectionNotice(null)
    }
  }, [selectedFile])

  useEffect(() => {
    const isSandboxActivity = (activity: ActivityEvent) =>
      activity.source?.includes("sandbox")

    const recent = getRecentActivities({ limit: 200 }).filter(isSandboxActivity)
    setSandboxActivity(recent)

    const unsubscribe = subscribeActivity((event) => {
      if (!isSandboxActivity(event)) return
      setSandboxActivity((prev) => [...prev, event].slice(-200))
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return

    const project = await createProject({
      name: newProjectName,
      framework: newProjectFramework,
      language: newProjectLanguage,
    })

    if (project) {
      await selectProject(project.id)
      setShowNewProjectForm(false)
      setNewProjectName("")
    }
  }

  const handleRun = async () => {
    if (!selectedProject || !runCommand.trim()) return

    setStreamingStatus(null)
    setSelectedExecution(null)
    setSelectedStreamingEntryId(null)

    if (useStreaming) {
      await runCodeStreaming(selectedProject.id, runCommand, {
        model: selectedModel,
        onStatus: (status) => setStreamingStatus(`${status.phase}: ${status.message}`),
        onComplete: (result) => {
          setStreamingStatus(`Complete: ${result.status} (exit ${result.exitCode})`)
        },
      })
      return
    }

    const execution = await runCode(selectedProject.id, runCommand, {
      model: selectedModel,
    })
    if (execution) {
      setSelectedExecution(execution)
    }
  }

  const handleSaveFile = async () => {
    if (!selectedProject || !filePath.trim()) return
    setSelectionNotice(null)
    if (editingSelection && selectedFile) {
      if (!selectionSourceContent.includes(selectedSnippet)) {
        setSelectionNotice("Selected text no longer matches the file content.")
        return
      }
      const updatedContent = selectionSourceContent.replace(selectedSnippet, fileContent)
      await writeFile(selectedProject.id, filePath.trim(), updatedContent)
    } else {
      await writeFile(selectedProject.id, filePath.trim(), fileContent)
    }
    await refresh()
    setShowFileEditor(false)
    setEditingSelection(false)
    setSelectionSourceContent("")
    setSelectedSnippet("")
  }

  const handleDeleteFile = async (path: string) => {
    if (!selectedProject) return
    await deleteFile(selectedProject.id, path)
    await refresh()
    if (selectedFile?.path === path) {
      setSelectedFile(null)
    }
  }

  const handleEditFile = () => {
    if (!selectedFile) return
    setFilePath(selectedFile.path)
    setFileContent(selectedFile.content)
    setEditingSelection(false)
    setSelectionSourceContent("")
    setSelectionNotice(null)
    setShowFileEditor(true)
  }

  const handleEditSelection = () => {
    if (!selectedFile || !selectedSnippet.trim()) return
    setFilePath(selectedFile.path)
    setFileContent(selectedSnippet)
    setSelectionSourceContent(selectedFile.content)
    setEditingSelection(true)
    setSelectionNotice(null)
    setShowFileEditor(true)
  }

  const handleApplyDependencies = async () => {
    if (!selectedProject) return

    const parsed = depsInput
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const dev = line.toLowerCase().includes("(dev)")
        const cleaned = line.replace(/\(dev\)/gi, "").trim()
        const [name, version] = cleaned.split("@")
        return {
          name: name.trim(),
          version: version?.trim() || undefined,
          dev,
        }
      })
      .filter((dep) => dep.name.length > 0)

    await setDependencies(selectedProject.id, parsed)
    await refresh()
  }

  const fileTree = buildFileTree(files)

  const getHealthDotClass = (status: "ready" | "missing" | "error" | "skipped") => {
    switch (status) {
      case "ready":
        return "bg-green-500"
      case "missing":
        return "bg-yellow-500"
      case "error":
        return "bg-destructive"
      default:
        return "bg-muted-foreground"
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium">Sandbox</span>
          {projects.length > 0 && (
            <Badge variant="outline" className="h-5 text-[10px]">
              {projects.length} projects
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setShowNewProjectForm(true)}
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New Project</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={refresh}
                  disabled={isLoadingProjects || healthLoading}
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", (isLoadingProjects || healthLoading) && "animate-spin")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* New Project Form */}
      {showNewProjectForm && (
        <div className="p-3 border-b border-border bg-surface-1 space-y-2">
          <Input
            placeholder="Project name"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            className="h-8 text-xs"
          />
          <div className="flex gap-2">
            <Select value={newProjectFramework} onValueChange={setNewProjectFramework}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder="Framework" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="node">Node.js</SelectItem>
                <SelectItem value="react">React</SelectItem>
                <SelectItem value="next.js">Next.js</SelectItem>
                <SelectItem value="python">Python</SelectItem>
              </SelectContent>
            </Select>
            <Select value={newProjectLanguage} onValueChange={setNewProjectLanguage}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="typescript">TypeScript</SelectItem>
                <SelectItem value="javascript">JavaScript</SelectItem>
                <SelectItem value="python">Python</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNewProjectForm(false)}
              className="flex-1 h-7 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateProject}
              disabled={!newProjectName.trim()}
              className="flex-1 h-7 text-xs"
            >
              Create
            </Button>
          </div>
        </div>
      )}

      {/* Project Selector */}
      <div className="p-2 border-b border-border">
        <Select
          value={selectedProject?.id || ""}
          onValueChange={(id) => selectProject(id || null)}
        >
          <SelectTrigger className="h-8 text-xs">
            <div className="flex items-center gap-2">
              <FolderCode className="w-3.5 h-3.5" />
              <SelectValue placeholder="Select a project..." />
            </div>
          </SelectTrigger>
          <SelectContent>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                <div className="flex items-center gap-2">
                  <span>{project.name}</span>
                  <Badge variant="outline" className="h-4 text-[9px]">
                    {project.language}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="px-3 py-2 border-b border-border bg-surface-1/40 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Activity className="w-3 h-3 text-muted-foreground" />
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Dependency Readiness
            </span>
            {health && (
              <Badge
                variant="outline"
                className={cn(
                  "h-4 text-[9px]",
                  health.ready
                    ? "border-green-500/40 text-green-500"
                    : "border-yellow-500/40 text-yellow-500"
                )}
              >
                {health.ready ? "Ready" : "Needs Setup"}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={refreshHealth}
            disabled={healthLoading}
          >
            <RefreshCw className={cn("w-3 h-3", healthLoading && "animate-spin")} />
          </Button>
        </div>

        {healthLoading && !health && (
          <p className="text-[11px] text-muted-foreground">Checking sandbox dependencies...</p>
        )}

        {healthError && !health && (
          <p className="text-[11px] text-destructive">{healthError}</p>
        )}

        {health && (
          <div className="space-y-1">
            {health.checks.map((check) => (
              <div key={check.id} className="flex items-start gap-2">
                <span className={cn("mt-1 h-2 w-2 rounded-full", getHealthDotClass(check.status))} />
                <div className="min-w-0">
                  <p className="text-[11px] font-medium">{check.label}</p>
                  <p className="text-[11px] text-muted-foreground">{check.message}</p>
                </div>
              </div>
            ))}
            {!health.ready && health.recommendations.length > 0 && (
              <div className="rounded border border-yellow-500/30 bg-yellow-500/10 p-2 text-[11px] text-yellow-700 dark:text-yellow-300">
                {health.recommendations[0]}
              </div>
            )}
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {/* Empty State */}
          {!selectedProject && !isLoadingProjects && (
            <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground">
              <FolderCode className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm font-medium">No Project Selected</p>
              <p className="text-xs mt-1">
                Select a project or create a new one to get started
              </p>
            </div>
          )}

          {error && !selectedProject && (
            <div className="text-xs text-destructive">{error}</div>
          )}

          {selectedProject && (
            <>
              {/* File Editor */}
              <Collapsible open={showFileEditor} onOpenChange={setShowFileEditor}>
                <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide w-full">
                  {showFileEditor ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                  <File className="w-3 h-3" />
                  Write File
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  <Input
                    placeholder="src/index.ts"
                    value={filePath}
                    onChange={(e) => setFilePath(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                  <Textarea
                    placeholder="File contents..."
                    value={fileContent}
                    onChange={(e) => setFileContent(e.target.value)}
                    className="min-h-[140px] text-xs font-mono"
                  />
                  {editingSelection && (
                    <div className="text-[11px] text-muted-foreground">
                      Editing selection ({selectedSnippet.length} chars). Saving will replace the selected text in the file.
                    </div>
                  )}
                  {selectionNotice && (
                    <div className="text-[11px] text-destructive">
                      {selectionNotice}
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowFileEditor(false)}
                      className="h-7 text-xs"
                    >
                      Close
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveFile}
                      disabled={!filePath.trim()}
                      className="h-7 text-xs"
                    >
                      Save File
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Files Section */}
              <Collapsible open={showFilesSection} onOpenChange={setShowFilesSection}>
                <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide w-full">
                  {showFilesSection ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                  <FileCode className="w-3 h-3" />
                  Files ({files.length})
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  {isLoadingFiles ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  ) : files.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">
                      No files yet. Use the agent or API to create files.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {renderFileTree(fileTree, selectedFile, setSelectedFile)}
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>

              {/* File Preview */}
              {selectedFile && (
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 bg-surface-1 border-b border-border">
                    <div className="flex items-center gap-2">
                      <FileCode className="w-3.5 h-3.5 text-accent" />
                      <span className="text-xs font-medium">{selectedFile.path}</span>
                      <Badge variant="outline" className="h-4 text-[9px]">
                        v{selectedFile.version}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={handleEditFile}
                            >
                              <PencilLine className="w-3 h-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit file</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {selectedSnippet.trim().length > 0 && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={handleEditSelection}
                              >
                                <Scissors className="w-3 h-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit selection</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleDeleteFile(selectedFile.path)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <ScrollArea className="h-48">
                    <pre
                      className="p-3 text-[11px] font-mono whitespace-pre-wrap"
                      onMouseUp={() => {
                        const selection = window.getSelection()?.toString() ?? ""
                        setSelectedSnippet(selection.trim())
                        setSelectionNotice(null)
                      }}
                    >
                      {selectedFile.content}
                    </pre>
                  </ScrollArea>
                </div>
              )}

              {/* Dependencies Section */}
              <Collapsible open={showDepsSection} onOpenChange={setShowDepsSection}>
                <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide w-full">
                  {showDepsSection ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                  <Package className="w-3 h-3" />
                  Dependencies ({dependencies.length})
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  {dependencies.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">
                      No dependencies configured.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {dependencies.map((dep) => (
                        <Badge
                          key={dep.id}
                          variant="outline"
                          className={cn(
                            "text-[10px]",
                            dep.dev_dependency && "border-dashed"
                          )}
                        >
                          {dep.name}
                          {dep.version && `@${dep.version}`}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 space-y-2">
                    <Textarea
                      placeholder="react@18\nnext@14\n@types/node@20 (dev)"
                      value={depsInput}
                      onChange={(e) => setDepsInput(e.target.value)}
                      className="min-h-[120px] text-xs font-mono"
                    />
                    <div className="flex justify-end">
                      <Button size="sm" onClick={handleApplyDependencies} className="h-7 text-xs">
                        Apply Dependencies
                      </Button>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Run Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <Terminal className="w-3 h-3" />
                  Run
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger className="h-8 text-xs min-w-[180px]">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Radio className="w-3 h-3" />
                    <span>Streaming</span>
                    <Switch checked={useStreaming} onCheckedChange={setUseStreaming} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="node index.js"
                    value={runCommand}
                    onChange={(e) => setRunCommand(e.target.value)}
                    className="h-8 text-xs font-mono flex-1"
                    onKeyDown={(e) => e.key === "Enter" && handleRun()}
                    disabled={isRunning}
                  />
                  <Button
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleRun}
                    disabled={isRunning || !runCommand.trim()}
                  >
                    {isRunning ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
                {(streamingStatus || streamingOutput) && (
                  <div className="border border-border rounded-lg bg-surface-1">
                    {streamingStatus && (
                      <div className="px-3 py-2 text-[11px] text-muted-foreground border-b border-border">
                        {streamingStatus}
                      </div>
                    )}
                    <ScrollArea className="h-28">
                      <pre className="p-3 text-[11px] font-mono whitespace-pre-wrap">
                        {streamingOutput || "Waiting for output..."}
                      </pre>
                    </ScrollArea>
                  </div>
                )}
                {error && (
                  <div className="text-xs text-destructive">{error}</div>
                )}
              </div>

              {/* Streaming History Section */}
              <Collapsible open={showStreamingHistorySection} onOpenChange={setShowStreamingHistorySection}>
                <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide w-full">
                  {showStreamingHistorySection ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                  <Radio className="w-3 h-3" />
                  Streaming History ({streamingHistory.length})
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  {streamingHistory.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">
                      No streaming runs yet. Enable streaming and run a command.
                    </p>
                  ) : (
                    streamingHistory.slice(0, 10).map((entry) => {
                      const StatusIcon = statusConfig[entry.status]?.icon || Clock
                      const statusColor = statusConfig[entry.status]?.color || "text-muted-foreground"
                      const statusBg = statusConfig[entry.status]?.bg || "bg-muted/50"
                      const isSelected = selectedStreamingEntryId === entry.id

                      return (
                        <div
                          key={entry.id}
                          className={cn(
                            "p-2 rounded-lg border border-border cursor-pointer transition-colors",
                            isSelected ? statusBg : "hover:bg-surface-1"
                          )}
                          onClick={() =>
                            setSelectedStreamingEntryId(isSelected ? null : entry.id)
                          }
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <StatusIcon
                                className={cn(
                                  "w-3.5 h-3.5 shrink-0",
                                  statusColor,
                                  entry.status === "running" && "animate-spin"
                                )}
                              />
                              <span className="text-xs font-mono truncate">{entry.command}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              {entry.durationMs && <span>{entry.durationMs}ms</span>}
                              {entry.exitCode !== undefined && (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "h-4 text-[9px]",
                                    entry.exitCode === 0
                                      ? "text-green-500 border-green-500/30"
                                      : "text-destructive border-destructive/30"
                                  )}
                                >
                                  exit {entry.exitCode}
                                </Badge>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <ScrollArea className="mt-2 h-32 rounded border border-border bg-surface-1">
                              <pre className="p-2 text-[10px] font-mono whitespace-pre-wrap">
                                {entry.output || "Waiting for output..."}
                              </pre>
                            </ScrollArea>
                          )}
                        </div>
                      )
                    })
                  )}
                </CollapsibleContent>
              </Collapsible>

              {/* Sandbox Activity Feed */}
              <Collapsible open={showSandboxFeedSection} onOpenChange={setShowSandboxFeedSection}>
                <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide w-full">
                  {showSandboxFeedSection ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                  <Activity className="w-3 h-3" />
                  Sandbox Feed ({sandboxActivity.length})
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  {sandboxActivity.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">
                      No sandbox activity yet.
                    </p>
                  ) : (
                    sandboxActivity.slice(-20).map((event) => (
                      <div
                        key={event.id}
                        className="p-2 rounded-lg border border-border bg-surface-1"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-foreground">
                              {event.action}
                            </p>
                            {event.details && (
                              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                                {event.details}
                              </p>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {new Date(event.timestamp ?? Date.now()).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </CollapsibleContent>
              </Collapsible>

              {/* Executions Section */}
              <Collapsible open={showExecutionsSection} onOpenChange={setShowExecutionsSection}>
                <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide w-full">
                  {showExecutionsSection ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                  <History className="w-3 h-3" />
                  Executions ({executions.length})
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  {executions.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">
                      No executions yet. Run some code to see results here.
                    </p>
                  ) : (
                    executions.slice(0, 10).map((exec) => {
                      const StatusIcon = statusConfig[exec.status]?.icon || Clock
                      const statusColor = statusConfig[exec.status]?.color || "text-muted-foreground"
                      const statusBg = statusConfig[exec.status]?.bg || "bg-muted/50"

                      return (
                        <div
                          key={exec.id}
                          className={cn(
                            "p-2 rounded-lg border border-border cursor-pointer transition-colors",
                            selectedExecution?.id === exec.id
                              ? statusBg
                              : "hover:bg-surface-1"
                          )}
                          onClick={() =>
                            setSelectedExecution(
                              selectedExecution?.id === exec.id ? null : exec
                            )
                          }
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <StatusIcon
                                className={cn(
                                  "w-3.5 h-3.5",
                                  statusColor,
                                  exec.status === "running" && "animate-spin"
                                )}
                              />
                              <span className="text-xs font-mono">
                                {exec.execution_type}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              {exec.duration_ms && <span>{exec.duration_ms}ms</span>}
                              {exec.exit_code !== null && (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "h-4 text-[9px]",
                                    exec.exit_code === 0
                                      ? "text-green-500 border-green-500/30"
                                      : "text-destructive border-destructive/30"
                                  )}
                                >
                                  exit {exec.exit_code}
                                </Badge>
                              )}
                            </div>
                          </div>
                          {selectedExecution?.id === exec.id && exec.output && (
                            <ScrollArea className="mt-2 h-32 rounded border border-border bg-surface-1">
                              <pre className="p-2 text-[10px] font-mono whitespace-pre-wrap">
                                {exec.output}
                              </pre>
                            </ScrollArea>
                          )}
                        </div>
                      )
                    })
                  )}
                </CollapsibleContent>
              </Collapsible>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      {selectedProject && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-surface-1 text-xs">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="h-5 text-[10px]">
              {selectedProject.framework || selectedProject.language}
            </Badge>
          </div>
          <span className="text-muted-foreground">
            {new Date(selectedProject.updated_at).toLocaleDateString()}
          </span>
        </div>
      )}
    </div>
  )
}

// Helper: Build file tree from flat file list
interface FileTreeNode {
  name: string
  path: string
  isDirectory: boolean
  children: FileTreeNode[]
  file?: SandboxFile
}

function buildFileTree(files: SandboxFile[]): FileTreeNode[] {
  const root: FileTreeNode[] = []

  for (const file of files) {
    const parts = file.path.split("/")
    let current = root

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLast = i === parts.length - 1
      const existingNode = current.find((n) => n.name === part)

      if (existingNode) {
        if (isLast) {
          existingNode.file = file
        } else {
          current = existingNode.children
        }
      } else {
        const newNode: FileTreeNode = {
          name: part,
          path: parts.slice(0, i + 1).join("/"),
          isDirectory: !isLast,
          children: [],
          file: isLast ? file : undefined,
        }
        current.push(newNode)
        if (!isLast) {
          current = newNode.children
        }
      }
    }
  }

  return root
}

// Helper: Render file tree
function renderFileTree(
  nodes: FileTreeNode[],
  selectedFile: SandboxFile | null,
  setSelectedFile: (file: SandboxFile | null) => void,
  depth = 0
): React.ReactNode {
  return nodes.map((node) => (
    <div key={node.path} style={{ paddingLeft: depth * 12 }}>
      <div
        className={cn(
          "flex items-center gap-2 py-1 px-2 rounded text-xs cursor-pointer transition-colors",
          node.file && selectedFile?.id === node.file.id
            ? "bg-accent/10 text-accent"
            : "hover:bg-surface-1"
        )}
        onClick={() => node.file && setSelectedFile(node.file)}
      >
        {node.isDirectory ? (
          <Folder className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <File className="w-3.5 h-3.5 text-muted-foreground" />
        )}
        <span className={cn(node.isDirectory && "font-medium")}>{node.name}</span>
        {node.file && (
          <Badge variant="outline" className="h-4 text-[9px] ml-auto">
            v{node.file.version}
          </Badge>
        )}
      </div>
      {node.isDirectory && node.children.length > 0 && (
        <div>{renderFileTree(node.children, selectedFile, setSelectedFile, depth + 1)}</div>
      )}
    </div>
  ))
}

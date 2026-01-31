"use client"

import { useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
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
  Settings2,
  Trash2,
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
  // Project state
  const [projects, setProjects] = useState<SandboxProject[]>([])
  const [selectedProject, setSelectedProject] = useState<SandboxProject | null>(null)
  const [isLoadingProjects, setIsLoadingProjects] = useState(true)

  // Files state
  const [files, setFiles] = useState<SandboxFile[]>([])
  const [selectedFile, setSelectedFile] = useState<SandboxFile | null>(null)
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)

  // Executions state
  const [executions, setExecutions] = useState<SandboxExecution[]>([])
  const [selectedExecution, setSelectedExecution] = useState<SandboxExecution | null>(null)

  // Dependencies
  const [dependencies, setDependencies] = useState<SandboxDependency[]>([])

  // UI state
  const [showNewProjectForm, setShowNewProjectForm] = useState(false)
  const [showFilesSection, setShowFilesSection] = useState(true)
  const [showExecutionsSection, setShowExecutionsSection] = useState(true)
  const [showDepsSection, setShowDepsSection] = useState(false)
  const [isRunning, setIsRunning] = useState(false)

  // New project form
  const [newProjectName, setNewProjectName] = useState("")
  const [newProjectFramework, setNewProjectFramework] = useState("node")
  const [newProjectLanguage, setNewProjectLanguage] = useState("typescript")

  // Run command
  const [runCommand, setRunCommand] = useState("")

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    setIsLoadingProjects(true)
    try {
      const res = await fetch("/api/sandbox/projects")
      if (res.ok) {
        const data = await res.json()
        setProjects(data.projects || [])
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error)
    } finally {
      setIsLoadingProjects(false)
    }
  }, [])

  // Fetch project details
  const fetchProjectDetails = useCallback(async (projectId: string) => {
    setIsLoadingFiles(true)
    try {
      const res = await fetch(`/api/sandbox/projects/${projectId}`)
      if (res.ok) {
        const data = await res.json()
        setFiles(data.files || [])
        setDependencies(data.dependencies || [])
        setExecutions(data.recentExecutions || [])
      }
    } catch (error) {
      console.error("Failed to fetch project details:", error)
    } finally {
      setIsLoadingFiles(false)
    }
  }, [])

  // Create project
  const createProject = async () => {
    if (!newProjectName.trim()) return

    try {
      const res = await fetch("/api/sandbox/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProjectName,
          framework: newProjectFramework,
          language: newProjectLanguage,
        }),
      })

      if (res.ok) {
        const project = await res.json()
        setProjects((prev) => [project, ...prev])
        setSelectedProject(project)
        setShowNewProjectForm(false)
        setNewProjectName("")
      }
    } catch (error) {
      console.error("Failed to create project:", error)
    }
  }

  // Run code
  const runCode = async () => {
    if (!selectedProject || !runCommand.trim()) return

    setIsRunning(true)
    try {
      const res = await fetch(`/api/sandbox/projects/${selectedProject.id}/executions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: runCommand,
          executionType: "run",
        }),
      })

      if (res.ok) {
        const execution = await res.json()
        setExecutions((prev) => [execution, ...prev])
        setSelectedExecution(execution)
      }
    } catch (error) {
      console.error("Failed to run code:", error)
    } finally {
      setIsRunning(false)
    }
  }

  // Initial load
  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  // Load project details when selected
  useEffect(() => {
    if (selectedProject) {
      fetchProjectDetails(selectedProject.id)
    } else {
      setFiles([])
      setDependencies([])
      setExecutions([])
      setSelectedFile(null)
    }
  }, [selectedProject, fetchProjectDetails])

  // Build file tree structure
  const fileTree = buildFileTree(files)

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
                  onClick={fetchProjects}
                  disabled={isLoadingProjects}
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", isLoadingProjects && "animate-spin")} />
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
              onClick={createProject}
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
          onValueChange={(id) => {
            const project = projects.find((p) => p.id === id)
            setSelectedProject(project || null)
          }}
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

          {selectedProject && (
            <>
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setSelectedFile(null)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <ScrollArea className="h-48">
                    <pre className="p-3 text-[11px] font-mono">{selectedFile.content}</pre>
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
                </CollapsibleContent>
              </Collapsible>

              {/* Run Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <Terminal className="w-3 h-3" />
                  Run
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="node index.js"
                    value={runCommand}
                    onChange={(e) => setRunCommand(e.target.value)}
                    className="h-8 text-xs font-mono flex-1"
                    onKeyDown={(e) => e.key === "Enter" && runCode()}
                    disabled={isRunning}
                  />
                  <Button
                    size="icon"
                    className="h-8 w-8"
                    onClick={runCode}
                    disabled={isRunning || !runCommand.trim()}
                  >
                    {isRunning ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
              </div>

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

/**
 * Sandbox Database Operations
 * Manages sandbox projects, files, executions, and dependencies
 */

import { sql } from "./neon"

// ============================================================================
// Types
// ============================================================================

export interface SandboxProject {
  id: string
  name: string
  description: string | null
  status: "active" | "archived" | "deleted"
  framework: string | null
  language: string
  created_by: string
  metadata: Record<string, unknown>
  created_at: Date
  updated_at: Date
}

export interface SandboxFile {
  id: string
  project_id: string
  path: string
  content: string
  file_type: string | null
  size_bytes: number | null
  version: number
  is_deleted: boolean
  created_by: string
  metadata: Record<string, unknown>
  created_at: Date
  updated_at: Date
}

export interface SandboxExecution {
  id: string
  project_id: string | null
  file_id: string | null
  execution_type: "run" | "test" | "lint" | "build"
  input: string | null
  output: string | null
  exit_code: number | null
  duration_ms: number | null
  status: "pending" | "running" | "success" | "error" | "timeout"
  error_message: string | null
  agent_id: string | null
  metadata: Record<string, unknown>
  created_at: Date
}

export interface SandboxDependency {
  id: string
  project_id: string
  name: string
  version: string | null
  dev_dependency: boolean
  created_at: Date
}

// ============================================================================
// Project Operations
// ============================================================================

export interface CreateProjectInput {
  name: string
  description?: string
  framework?: string
  language?: string
  createdBy?: string
  metadata?: Record<string, unknown>
}

export async function createProject(input: CreateProjectInput): Promise<SandboxProject> {
  const rows = await sql<SandboxProject>(
    `INSERT INTO sandbox_projects (name, description, framework, language, created_by, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.name,
      input.description || null,
      input.framework || null,
      input.language || "typescript",
      input.createdBy || "orchestrator",
      JSON.stringify(input.metadata || {}),
    ]
  )
  return rows[0]
}

export interface ListProjectsInput {
  status?: SandboxProject["status"]
  limit?: number
  offset?: number
}

export async function listProjects(input: ListProjectsInput = {}): Promise<SandboxProject[]> {
  const { status, limit = 50, offset = 0 } = input
  
  if (status) {
    return sql<SandboxProject>(
      `SELECT * FROM sandbox_projects 
       WHERE status = $1 
       ORDER BY updated_at DESC 
       LIMIT $2 OFFSET $3`,
      [status, limit, offset]
    )
  }
  
  return sql<SandboxProject>(
    `SELECT * FROM sandbox_projects 
     WHERE status != 'deleted'
     ORDER BY updated_at DESC 
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  )
}

export async function getProject(id: string): Promise<SandboxProject | null> {
  const rows = await sql<SandboxProject>(
    `SELECT * FROM sandbox_projects WHERE id = $1`,
    [id]
  )
  return rows[0] || null
}

export interface UpdateProjectInput {
  name?: string
  description?: string
  status?: SandboxProject["status"]
  framework?: string
  language?: string
  metadata?: Record<string, unknown>
}

export async function updateProject(
  id: string,
  updates: UpdateProjectInput
): Promise<SandboxProject | null> {
  const setClauses: string[] = []
  const values: unknown[] = []
  let paramIndex = 1

  if (updates.name !== undefined) {
    setClauses.push(`name = $${paramIndex++}`)
    values.push(updates.name)
  }
  if (updates.description !== undefined) {
    setClauses.push(`description = $${paramIndex++}`)
    values.push(updates.description)
  }
  if (updates.status !== undefined) {
    setClauses.push(`status = $${paramIndex++}`)
    values.push(updates.status)
  }
  if (updates.framework !== undefined) {
    setClauses.push(`framework = $${paramIndex++}`)
    values.push(updates.framework)
  }
  if (updates.language !== undefined) {
    setClauses.push(`language = $${paramIndex++}`)
    values.push(updates.language)
  }
  if (updates.metadata !== undefined) {
    setClauses.push(`metadata = $${paramIndex++}`)
    values.push(JSON.stringify(updates.metadata))
  }

  if (setClauses.length === 0) return getProject(id)

  values.push(id)
  const rows = await sql<SandboxProject>(
    `UPDATE sandbox_projects 
     SET ${setClauses.join(", ")}, updated_at = NOW()
     WHERE id = $${paramIndex}
     RETURNING *`,
    values
  )
  return rows[0] || null
}

// ============================================================================
// File Operations (Versioned Append-Only)
// ============================================================================

function normalizePath(path: string): string {
  // Remove null bytes, normalize slashes, prevent traversal
  let normalized = path
    .replace(/\0/g, "")
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .trim()
  
  // Remove leading slash
  if (normalized.startsWith("/")) {
    normalized = normalized.slice(1)
  }
  
  // Prevent directory traversal
  if (normalized.includes("..")) {
    throw new Error("Invalid path: directory traversal not allowed")
  }
  
  return normalized
}

export interface WriteFileInput {
  projectId: string
  path: string
  content: string
  fileType?: string
  createdBy?: string
  metadata?: Record<string, unknown>
}

export async function writeFile(input: WriteFileInput): Promise<SandboxFile> {
  const normalizedPath = normalizePath(input.path)
  const sizeBytes = Buffer.byteLength(input.content, "utf-8")
  
  // Enforce size limit (512KB)
  if (sizeBytes > 512 * 1024) {
    throw new Error("File too large: maximum size is 512KB")
  }

  // Get next version
  const versionResult = await sql<{ max_version: number }>(
    `SELECT COALESCE(MAX(version), 0) as max_version 
     FROM sandbox_files 
     WHERE project_id = $1 AND path = $2`,
    [input.projectId, normalizedPath]
  )
  const nextVersion = (versionResult[0]?.max_version || 0) + 1

  const rows = await sql<SandboxFile>(
    `INSERT INTO sandbox_files 
     (project_id, path, content, file_type, size_bytes, version, created_by, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      input.projectId,
      normalizedPath,
      input.content,
      input.fileType || inferFileType(normalizedPath),
      sizeBytes,
      nextVersion,
      input.createdBy || "agent",
      JSON.stringify(input.metadata || {}),
    ]
  )
  return rows[0]
}

function inferFileType(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase()
  const typeMap: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    py: "python",
    json: "json",
    md: "markdown",
    css: "css",
    html: "html",
    yaml: "yaml",
    yml: "yaml",
    toml: "toml",
  }
  return typeMap[ext || ""] || "text"
}

export async function getFileLatest(
  projectId: string,
  path: string
): Promise<SandboxFile | null> {
  const normalizedPath = normalizePath(path)
  const rows = await sql<SandboxFile>(
    `SELECT * FROM sandbox_files 
     WHERE project_id = $1 AND path = $2 AND is_deleted = false
     ORDER BY version DESC
     LIMIT 1`,
    [projectId, normalizedPath]
  )
  return rows[0] || null
}

export interface ListFilesInput {
  projectId: string
  prefix?: string
}

export async function listFilesLatest(input: ListFilesInput): Promise<SandboxFile[]> {
  const { projectId, prefix } = input
  
  // Use window function to get latest version of each path
  const query = prefix
    ? `SELECT DISTINCT ON (path) * 
       FROM sandbox_files 
       WHERE project_id = $1 AND path LIKE $2 AND is_deleted = false
       ORDER BY path, version DESC`
    : `SELECT DISTINCT ON (path) * 
       FROM sandbox_files 
       WHERE project_id = $1 AND is_deleted = false
       ORDER BY path, version DESC`

  const params = prefix ? [projectId, `${prefix}%`] : [projectId]
  return sql<SandboxFile>(query, params)
}

export async function deleteFile(
  projectId: string,
  path: string,
  createdBy: string = "agent"
): Promise<SandboxFile> {
  const normalizedPath = normalizePath(path)
  
  // Get current version
  const current = await getFileLatest(projectId, normalizedPath)
  if (!current) {
    throw new Error(`File not found: ${normalizedPath}`)
  }

  // Create tombstone version
  const rows = await sql<SandboxFile>(
    `INSERT INTO sandbox_files 
     (project_id, path, content, file_type, size_bytes, version, is_deleted, created_by, metadata)
     VALUES ($1, $2, '', $3, 0, $4, true, $5, $6)
     RETURNING *`,
    [
      projectId,
      normalizedPath,
      current.file_type,
      current.version + 1,
      createdBy,
      JSON.stringify({ deletedFrom: current.id }),
    ]
  )
  return rows[0]
}

// ============================================================================
// Dependency Operations
// ============================================================================

export interface DependencyInput {
  name: string
  version?: string
  devDependency?: boolean
}

export async function setDependencies(
  projectId: string,
  deps: DependencyInput[]
): Promise<SandboxDependency[]> {
  // Delete existing deps and insert new ones (replace semantics)
  await sql(`DELETE FROM sandbox_dependencies WHERE project_id = $1`, [projectId])
  
  if (deps.length === 0) return []

  const placeholders: string[] = []
  const values: unknown[] = []
  let paramIndex = 1

  for (const dep of deps) {
    placeholders.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`)
    values.push(projectId, dep.name, dep.version || null, dep.devDependency || false)
  }

  return sql<SandboxDependency>(
    `INSERT INTO sandbox_dependencies (project_id, name, version, dev_dependency)
     VALUES ${placeholders.join(", ")}
     RETURNING *`,
    values
  )
}

export async function listDependencies(projectId: string): Promise<SandboxDependency[]> {
  return sql<SandboxDependency>(
    `SELECT * FROM sandbox_dependencies WHERE project_id = $1 ORDER BY name`,
    [projectId]
  )
}

// ============================================================================
// Execution Operations
// ============================================================================

export interface CreateExecutionInput {
  projectId: string
  fileId?: string
  executionType: SandboxExecution["execution_type"]
  input?: string
  agentId?: string
  metadata?: Record<string, unknown>
}

export async function createExecution(input: CreateExecutionInput): Promise<SandboxExecution> {
  const rows = await sql<SandboxExecution>(
    `INSERT INTO sandbox_executions 
     (project_id, file_id, execution_type, input, agent_id, metadata, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending')
     RETURNING *`,
    [
      input.projectId,
      input.fileId || null,
      input.executionType,
      input.input || null,
      input.agentId || null,
      JSON.stringify(input.metadata || {}),
    ]
  )
  return rows[0]
}

export async function markExecutionRunning(id: string): Promise<SandboxExecution | null> {
  const rows = await sql<SandboxExecution>(
    `UPDATE sandbox_executions 
     SET status = 'running'
     WHERE id = $1
     RETURNING *`,
    [id]
  )
  return rows[0] || null
}

export interface CompleteExecutionInput {
  id: string
  status: "success" | "error" | "timeout"
  output?: string
  exitCode?: number
  durationMs?: number
  errorMessage?: string
  metadata?: Record<string, unknown>
}

export async function completeExecution(
  input: CompleteExecutionInput
): Promise<SandboxExecution | null> {
  const rows = await sql<SandboxExecution>(
    `UPDATE sandbox_executions 
     SET status = $1, output = $2, exit_code = $3, duration_ms = $4, 
         error_message = $5, metadata = metadata || $6
     WHERE id = $7
     RETURNING *`,
    [
      input.status,
      input.output || null,
      input.exitCode ?? null,
      input.durationMs ?? null,
      input.errorMessage || null,
      JSON.stringify(input.metadata || {}),
      input.id,
    ]
  )
  return rows[0] || null
}

export async function getExecution(id: string): Promise<SandboxExecution | null> {
  const rows = await sql<SandboxExecution>(
    `SELECT * FROM sandbox_executions WHERE id = $1`,
    [id]
  )
  return rows[0] || null
}

export interface ListExecutionsInput {
  projectId: string
  limit?: number
  offset?: number
}

export async function listExecutions(input: ListExecutionsInput): Promise<SandboxExecution[]> {
  const { projectId, limit = 50, offset = 0 } = input
  return sql<SandboxExecution>(
    `SELECT * FROM sandbox_executions 
     WHERE project_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [projectId, limit, offset]
  )
}

// ============================================================================
// Helper: Get full project with files and deps
// ============================================================================

export interface FullProject extends SandboxProject {
  files: SandboxFile[]
  dependencies: SandboxDependency[]
  recentExecutions: SandboxExecution[]
}

export async function getFullProject(id: string): Promise<FullProject | null> {
  const project = await getProject(id)
  if (!project) return null

  const [files, dependencies, recentExecutions] = await Promise.all([
    listFilesLatest({ projectId: id }),
    listDependencies(id),
    listExecutions({ projectId: id, limit: 10 }),
  ])

  return {
    ...project,
    files,
    dependencies,
    recentExecutions,
  }
}

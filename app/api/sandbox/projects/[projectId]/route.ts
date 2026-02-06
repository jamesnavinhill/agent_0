/**
 * Sandbox Project Detail API
 * GET: Get project with files, deps, executions
 * PATCH: Update project
 */

import { NextResponse } from "next/server"
import {
  ensureSandboxTablesReady,
  getSandboxApiError,
  getFullProject,
  updateProject,
  type UpdateProjectInput,
} from "@/lib/db/sandbox"
import { pushActivity } from "@/lib/activity/bus"

interface RouteContext {
  params: Promise<{ projectId: string }>
}

export async function GET(req: Request, context: RouteContext) {
  try {
    await ensureSandboxTablesReady()

    const { projectId } = await context.params
    const project = await getFullProject(projectId)

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    return NextResponse.json(project)
  } catch (error) {
    const sandboxError = getSandboxApiError(error)
    return NextResponse.json({ error: sandboxError.message }, { status: sandboxError.status })
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    await ensureSandboxTablesReady()

    const { projectId } = await context.params
    const body = await req.json()

    const updates: UpdateProjectInput = {}
    if (body.name !== undefined) updates.name = body.name
    if (body.description !== undefined) updates.description = body.description
    if (body.status !== undefined) updates.status = body.status
    if (body.framework !== undefined) updates.framework = body.framework
    if (body.language !== undefined) updates.language = body.language
    if (body.metadata !== undefined) updates.metadata = body.metadata

    const project = await updateProject(projectId, updates)

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    pushActivity({
      action: "Sandbox: Project updated via API",
      details: project.name,
      source: "api/sandbox",
      level: "info",
      metadata: { projectId: project.id },
    })

    return NextResponse.json(project)
  } catch (error) {
    const sandboxError = getSandboxApiError(error)
    return NextResponse.json({ error: sandboxError.message }, { status: sandboxError.status })
  }
}

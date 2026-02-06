/**
 * Sandbox Projects API
 * GET: List projects
 * POST: Create new project
 */

import { NextResponse } from "next/server"
import {
  createProject,
  ensureSandboxTablesReady,
  getSandboxApiError,
  listProjects,
  type CreateProjectInput,
  type ListProjectsInput,
} from "@/lib/db/sandbox"
import { pushActivity } from "@/lib/activity/bus"

export async function GET(req: Request) {
  try {
    await ensureSandboxTablesReady()

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") as ListProjectsInput["status"]
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : undefined
    const offset = searchParams.get("offset")
      ? parseInt(searchParams.get("offset")!)
      : undefined

    const projects = await listProjects({ status, limit, offset })

    return NextResponse.json({ projects, count: projects.length })
  } catch (error) {
    const sandboxError = getSandboxApiError(error)
    return NextResponse.json({ error: sandboxError.message }, { status: sandboxError.status })
  }
}

export async function POST(req: Request) {
  try {
    await ensureSandboxTablesReady()

    const body = await req.json()

    const input: CreateProjectInput = {
      name: body.name,
      description: body.description,
      framework: body.framework,
      language: body.language,
      createdBy: body.createdBy || "api",
      metadata: body.metadata,
    }

    if (!input.name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 })
    }

    const project = await createProject(input)

    pushActivity({
      action: "Sandbox: Project created via API",
      details: project.name,
      source: "api/sandbox",
      level: "action",
      metadata: { projectId: project.id },
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    const sandboxError = getSandboxApiError(error)
    return NextResponse.json({ error: sandboxError.message }, { status: sandboxError.status })
  }
}

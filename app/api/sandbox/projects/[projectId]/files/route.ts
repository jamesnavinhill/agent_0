/**
 * Sandbox Files API
 * GET: List files in project
 * POST: Write a new file (creates new version)
 */

import { NextResponse } from "next/server"
import {
  ensureSandboxTablesReady,
  getSandboxApiError,
  listFilesLatest,
  writeFile,
  getFileLatest,
  deleteFile,
} from "@/lib/db/sandbox"
import { pushActivity } from "@/lib/activity/bus"

interface RouteContext {
  params: Promise<{ projectId: string }>
}

export async function GET(req: Request, context: RouteContext) {
  try {
    await ensureSandboxTablesReady()

    const { projectId } = await context.params
    const { searchParams } = new URL(req.url)
    const prefix = searchParams.get("prefix") || undefined
    const path = searchParams.get("path")

    // If specific path requested, return that file
    if (path) {
      const file = await getFileLatest(projectId, path)
      if (!file) {
        return NextResponse.json({ error: "File not found" }, { status: 404 })
      }
      return NextResponse.json(file)
    }

    // Otherwise list files
    const files = await listFilesLatest({ projectId, prefix })
    return NextResponse.json({ files, count: files.length })
  } catch (error) {
    const sandboxError = getSandboxApiError(error)
    return NextResponse.json({ error: sandboxError.message }, { status: sandboxError.status })
  }
}

export async function POST(req: Request, context: RouteContext) {
  try {
    await ensureSandboxTablesReady()

    const { projectId } = await context.params
    const body = await req.json()

    if (!body.path) {
      return NextResponse.json({ error: "path is required" }, { status: 400 })
    }
    if (body.content === undefined) {
      return NextResponse.json({ error: "content is required" }, { status: 400 })
    }

    const file = await writeFile({
      projectId,
      path: body.path,
      content: body.content,
      fileType: body.fileType,
      createdBy: body.createdBy || "api",
      metadata: body.metadata,
    })

    pushActivity({
      action: "Sandbox: File written via API",
      details: `${file.path} (v${file.version})`,
      source: "api/sandbox",
      level: "action",
      metadata: { projectId, path: file.path, version: file.version },
    })

    return NextResponse.json(file, { status: 201 })
  } catch (error) {
    const sandboxError = getSandboxApiError(error)
    return NextResponse.json({ error: sandboxError.message }, { status: sandboxError.status })
  }
}

export async function DELETE(req: Request, context: RouteContext) {
  try {
    await ensureSandboxTablesReady()

    const { projectId } = await context.params
    const { searchParams } = new URL(req.url)
    const path = searchParams.get("path")

    if (!path) {
      return NextResponse.json({ error: "path query parameter is required" }, { status: 400 })
    }

    const file = await deleteFile(projectId, path, "api")

    pushActivity({
      action: "Sandbox: File deleted via API",
      details: path,
      source: "api/sandbox",
      level: "info",
      metadata: { projectId, path },
    })

    return NextResponse.json({ deleted: true, file })
  } catch (error) {
    const sandboxError = getSandboxApiError(error)
    return NextResponse.json({ error: sandboxError.message }, { status: sandboxError.status })
  }
}

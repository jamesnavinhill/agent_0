/**
 * Sandbox Dependencies API
 * GET: List project dependencies
 * PUT: Replace all dependencies
 */

import { NextResponse } from "next/server"
import { listDependencies, setDependencies } from "@/lib/db/sandbox"
import { pushActivity } from "@/lib/activity/bus"

interface RouteContext {
  params: Promise<{ projectId: string }>
}

export async function GET(req: Request, context: RouteContext) {
  try {
    const { projectId } = await context.params
    const dependencies = await listDependencies(projectId)
    return NextResponse.json({ dependencies, count: dependencies.length })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list dependencies"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(req: Request, context: RouteContext) {
  try {
    const { projectId } = await context.params
    const body = await req.json()

    if (!Array.isArray(body.dependencies)) {
      return NextResponse.json(
        { error: "dependencies array is required" },
        { status: 400 }
      )
    }

    const deps = body.dependencies.map((d: { name: string; version?: string; dev?: boolean }) => ({
      name: d.name,
      version: d.version,
      devDependency: d.dev,
    }))

    const result = await setDependencies(projectId, deps)

    pushActivity({
      action: "Sandbox: Dependencies updated via API",
      details: `${result.length} packages`,
      source: "api/sandbox",
      level: "info",
      metadata: { projectId, count: result.length },
    })

    return NextResponse.json({ dependencies: result, count: result.length })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to set dependencies"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

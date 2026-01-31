/**
 * Database Migration API
 * POST: Run SQL migration scripts
 * 
 * This endpoint is for development/setup only.
 * In production, use proper migration tools.
 */

import { NextResponse } from "next/server"
import { sql } from "@/lib/db/neon"
import { readFileSync } from "fs"
import { join } from "path"

const MIGRATIONS = {
  sandbox: "scripts/create-sandbox-tables.sql",
  schema: "lib/db/schema.sql",
} as const

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { migration, rawSql } = body

    let sqlContent: string

    if (rawSql) {
      // Direct SQL execution (be careful!)
      sqlContent = rawSql
    } else if (migration && migration in MIGRATIONS) {
      // Read from file
      const filePath = join(process.cwd(), MIGRATIONS[migration as keyof typeof MIGRATIONS])
      sqlContent = readFileSync(filePath, "utf-8")
    } else {
      return NextResponse.json(
        { error: `Unknown migration. Available: ${Object.keys(MIGRATIONS).join(", ")}` },
        { status: 400 }
      )
    }

    // Split into statements and execute
    const statements = sqlContent
      .split(/;(?=\s*(?:--|CREATE|DROP|ALTER|INSERT|UPDATE|DELETE|TRUNCATE|$))/i)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith("--"))

    const results: Array<{ statement: string; success: boolean; error?: string }> = []

    for (const statement of statements) {
      try {
        await sql(statement)
        results.push({ statement: statement.slice(0, 60) + "...", success: true })
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error"
        results.push({ statement: statement.slice(0, 60) + "...", success: false, error: errorMsg })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    return NextResponse.json({
      message: `Migration complete: ${successCount} succeeded, ${failCount} failed`,
      results,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Migration failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    available: Object.keys(MIGRATIONS),
    usage: "POST with { migration: 'sandbox' } or { migration: 'schema' }",
  })
}

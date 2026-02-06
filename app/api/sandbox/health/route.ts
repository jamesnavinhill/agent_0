import { NextResponse } from "next/server"
import {
  ensureSandboxTablesReady,
  getSandboxApiError,
  SandboxPreflightError,
} from "@/lib/db/sandbox"

type CheckStatus = "ready" | "missing" | "error" | "skipped"

interface HealthCheck {
  id: string
  label: string
  status: CheckStatus
  message: string
}

export async function GET() {
  const checks: HealthCheck[] = []
  const issues: string[] = []

  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL?.trim())
  checks.push({
    id: "database-url",
    label: "DATABASE_URL",
    status: hasDatabaseUrl ? "ready" : "missing",
    message: hasDatabaseUrl
      ? "Database connection string is configured."
      : "DATABASE_URL is missing. Set it in .env.local.",
  })
  if (!hasDatabaseUrl) {
    issues.push("Set DATABASE_URL in .env.local.")
  }

  if (!hasDatabaseUrl) {
    checks.push({
      id: "sandbox-tables",
      label: "Sandbox tables",
      status: "skipped",
      message: "Skipped table check because DATABASE_URL is not configured.",
    })
  } else {
    try {
      await ensureSandboxTablesReady()
      checks.push({
        id: "sandbox-tables",
        label: "Sandbox tables",
        status: "ready",
        message: "All required sandbox tables are present.",
      })
    } catch (error) {
      if (error instanceof SandboxPreflightError) {
        checks.push({
          id: "sandbox-tables",
          label: "Sandbox tables",
          status: "missing",
          message: error.message,
        })
        issues.push('Run "pnpm run db:migrate" to create sandbox tables.')
      } else {
        const sandboxError = getSandboxApiError(error)
        checks.push({
          id: "sandbox-tables",
          label: "Sandbox tables",
          status: "error",
          message: sandboxError.message,
        })
        issues.push("Resolve database connectivity before using sandbox.")
      }
    }
  }

  const hasGoogleApiKey = Boolean(process.env.GOOGLE_API_KEY?.trim())
  checks.push({
    id: "google-api-key",
    label: "GOOGLE_API_KEY",
    status: hasGoogleApiKey ? "ready" : "missing",
    message: hasGoogleApiKey
      ? "Model provider key is configured."
      : "GOOGLE_API_KEY is missing. Sandbox executions require it.",
  })
  if (!hasGoogleApiKey) {
    issues.push("Set GOOGLE_API_KEY in .env.local for execution support.")
  }

  const ready = checks.every((check) => check.status === "ready")
  const recommendations = Array.from(new Set(issues))

  return NextResponse.json({
    ready,
    checkedAt: new Date().toISOString(),
    checks,
    issues,
    recommendations,
  })
}

import { NextRequest, NextResponse } from "next/server"
import { performMorningRead } from "@/lib/agent/tools/research"
import { pushActivity } from "@/lib/activity/bus"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * Test endpoint to manually trigger the Morning Read task
 * Requires CRON_SECRET authorization
 * POST/GET /api/test/morning-read
 * 
 * Usage: 
 *   curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://komorebi-alpha.vercel.app/api/test/morning-read
 */
async function handleRequest(req: NextRequest) {
    // Verify Cron Secret
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
        const authHeader = req.headers.get("authorization")
        if (authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
    }

    try {
        pushActivity({
            action: "Manually triggering Morning Read",
            source: "Test",
            level: "action",
        })

        const result = await performMorningRead()

        pushActivity({
            action: "Morning Read completed",
            details: result.slice(0, 200) + "...",
            source: "Test",
            level: "info",
        })

        return NextResponse.json({
            success: true,
            report: result
        })
    } catch (error: any) {
        console.error("Morning Read failed:", error)

        pushActivity({
            action: "Morning Read failed",
            details: error.message,
            source: "Test",
            level: "error",
        })

        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    return handleRequest(req)
}

export async function GET(req: NextRequest) {
    return handleRequest(req)
}


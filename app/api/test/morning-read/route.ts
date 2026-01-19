import { NextResponse } from "next/server"
import { performMorningRead } from "@/lib/agent/tools/research"
import { pushActivity } from "@/lib/activity/bus"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * Test endpoint to manually trigger the Morning Read task
 * POST /api/test/morning-read
 */
export async function POST() {
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

/**
 * GET endpoint for easy browser testing
 */
export async function GET() {
    return POST()
}

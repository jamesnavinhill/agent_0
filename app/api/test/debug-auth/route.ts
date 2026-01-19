import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/**
 * Debug endpoint to check CRON_SECRET and headers
 */
export async function GET(req: NextRequest) {
    const cronSecret = process.env.CRON_SECRET
    const authHeader = req.headers.get("authorization")

    return NextResponse.json({
        cronSecretSet: !!cronSecret,
        cronSecretLength: cronSecret?.length ?? 0,
        cronSecretFirst8: cronSecret?.substring(0, 8) ?? "NOT_SET",
        authHeaderReceived: authHeader ?? "NONE",
        authHeaderLength: authHeader?.length ?? 0,
        match: authHeader === `Bearer ${cronSecret}`,
        expected: `Bearer ${cronSecret?.substring(0, 8)}...`,
    })
}

import { NextRequest, NextResponse } from "next/server"
import { getDbActivities } from "@/lib/activity/db-store"
import { ActivityLevel } from "@/lib/activity/bus"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100)
    const since = searchParams.get("since") ? parseInt(searchParams.get("since")!) : undefined
    const level = searchParams.get("level") as ActivityLevel | undefined

    try {
        const activities = await getDbActivities({
            limit,
            since,
            level,
        })

        return NextResponse.json(activities)
    } catch (error) {
        console.error("Error fetching activities:", error)
        return NextResponse.json({ error: "Failed to fetch activities" }, { status: 500 })
    }
}

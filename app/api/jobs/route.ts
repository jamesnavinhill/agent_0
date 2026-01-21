import { NextRequest, NextResponse } from "next/server"
import { getRecentJobs, getJob, getJobsByTaskId, JobStatus } from "@/lib/db/jobs"

export const dynamic = "force-dynamic"

/**
 * GET /api/jobs - List jobs or get a specific job
 * Query params:
 *   - id: Get specific job by ID
 *   - taskId: Get jobs for a specific task
 *   - status: Filter by status (pending, processing, complete, error, timeout)
 *   - limit: Max number to return (default 20)
 */
export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams
        const id = searchParams.get("id")
        const taskId = searchParams.get("taskId")
        const status = searchParams.get("status") as JobStatus | null
        const limit = parseInt(searchParams.get("limit") || "20", 10)

        // Get specific job by ID
        if (id) {
            const job = await getJob(id)
            if (!job) {
                return NextResponse.json({ error: "Job not found" }, { status: 404 })
            }
            return NextResponse.json(job)
        }

        // Get jobs for a specific task
        if (taskId) {
            const jobs = await getJobsByTaskId(taskId)
            return NextResponse.json(jobs)
        }

        // Get recent jobs with optional status filter
        const jobs = await getRecentJobs(limit, status || undefined)
        return NextResponse.json(jobs)

    } catch (error: any) {
        console.error("Error fetching jobs:", error)
        return NextResponse.json({
            error: "Failed to fetch jobs",
            details: error.message
        }, { status: 500 })
    }
}

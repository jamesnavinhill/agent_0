import { NextRequest, NextResponse } from "next/server"
import { getPendingJobs, incrementCheckCount, getRecentJobs, getJob, markTimedOutJobs } from "@/lib/db/jobs"
import { checkAndFinalizeVideoJob } from "@/lib/jobs/finalizer"
import { createLogger } from "@/lib/logging/logger"
import { pushActivity } from "@/lib/activity/bus"

const log = createLogger("JobChecker")

export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * Cron endpoint to check pending jobs
 * Called every minute by Vercel cron or manually
 */
export async function GET(req: NextRequest) {
    // Verify Cron Secret if set
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
        const authHeader = req.headers.get("authorization")
        if (authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
    }

    log.info("Job checker cron started")

    try {
        // Mark any timed out jobs first
        const timedOut = await markTimedOutJobs()
        if (timedOut > 0) {
            log.info("Marked timed out jobs", { count: timedOut })
        }

        // Get pending jobs
        const pendingJobs = await getPendingJobs()

        if (pendingJobs.length === 0) {
            log.info("No pending jobs to check")
            return NextResponse.json({ message: "No pending jobs", checked: 0 })
        }

        log.info("Checking pending jobs", { count: pendingJobs.length })

        pushActivity({
            action: "Checking Pending Jobs",
            details: `${pendingJobs.length} job(s) in queue`,
            source: "JobChecker",
            level: "info"
        })

        const results: Array<{
            jobId: string
            type: string
            finalized: boolean
            checkCount: number
        }> = []

        // Process up to 5 jobs per run to stay within timeout
        const jobsToCheck = pendingJobs.slice(0, 5)

        for (const job of jobsToCheck) {
            // Increment check count
            const updatedJob = await incrementCheckCount(job.id)
            if (!updatedJob) {
                log.error("Failed to update job check count", { jobId: job.id })
                continue
            }

            // Check and finalize based on job type
            let finalized = false

            if (job.type === "video-generation" || job.type === "image-to-video") {
                finalized = await checkAndFinalizeVideoJob(updatedJob)
            } else {
                log.warn("Unknown job type", { jobId: job.id, type: job.type })
                finalized = true // Mark as done so we don't keep checking
            }

            results.push({
                jobId: job.id,
                type: job.type,
                finalized,
                checkCount: updatedJob.check_count
            })
        }

        const finalizedCount = results.filter(r => r.finalized).length
        const stillPending = results.filter(r => !r.finalized).length

        log.info("Job check complete", { finalizedCount, stillPending })

        if (finalizedCount > 0) {
            pushActivity({
                action: "Jobs Finalized",
                details: `Completed ${finalizedCount} job(s)`,
                source: "JobChecker",
                level: "action"
            })
        }

        return NextResponse.json({
            checked: results.length,
            finalized: finalizedCount,
            stillPending,
            results
        })

    } catch (error: any) {
        log.error("Job checker failed", { error: error.message })
        return NextResponse.json({ error: "Job check failed", details: error.message }, { status: 500 })
    }
}

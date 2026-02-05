import { NextRequest, NextResponse } from "next/server"
import { chromium } from "playwright"
import { uploadSnapshot } from "@/lib/storage/local"

export const maxDuration = 60

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { url } = body

        if (!url) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 })
        }

        console.log(`[Browser] Launching for: ${url}`)

        // Launch browser
        const browser = await chromium.launch({
            headless: true
        })
        const context = await browser.newContext({
            viewport: { width: 1280, height: 800 }
        })
        const page = await context.newPage()

        console.log(`[Browser] Navigating to ${url}...`)
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 })

        const title = await page.title()
        console.log(`[Browser] Page loaded: ${title}`)

        // Take screenshot
        const screenshotBuffer = await page.screenshot({ type: "jpeg", quality: 80 })

        // Save snapshot to local storage
        console.log(`[Browser] Saving snapshot...`)
        const snapshotUrl = await uploadSnapshot(Buffer.from(screenshotBuffer), `snapshots/${Date.now()}.jpg`)

        await browser.close()

        return NextResponse.json({
            success: true,
            title,
            url,
            snapshotUrl
        })

    } catch (error: any) {
        console.error("[Browser] Error:", error)
        return NextResponse.json({
            error: "Browser task failed",
            details: error.message
        }, { status: 500 })
    }
}

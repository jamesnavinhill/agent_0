import fetch from "node-fetch"

const BASE_URL = "http://localhost:3000"

async function run() {
    console.log("1. Creating Browser Task...")
    const createRes = await fetch(`${BASE_URL}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: "Test Browser Screenshot",
            schedule: "* * * * *",
            category: "browser",
            description: "https://example.com",
            enabled: true,
            // Force it to be due immediately
            next_run: new Date(Date.now() - 10000).toISOString()
        })
    })

    if (!createRes.ok) {
        console.error("Failed to create task:", await createRes.text())
        return
    }
    console.log("Task created.")

    console.log("2. Triggering Cron...")
    const cronRes = await fetch(`${BASE_URL}/api/cron`)
    const cronData = await cronRes.json()
    console.log("Cron Result:", JSON.stringify(cronData, null, 2))

    console.log("3. Checking Activities API...")
    // Wait a bit for async processing
    await new Promise(r => setTimeout(r, 5000))

    const activityRes = await fetch(`${BASE_URL}/api/activity?limit=5`)
    const activities = await activityRes.json() as Array<{ imageUrl?: string; action?: string }>

    // Find the browser activity
    const browserActivity = activities.find((a: any) => a.imageUrl)

    if (browserActivity) {
        console.log("SUCCESS! Found activity with image.")
        console.log("Image URL:", browserActivity.imageUrl)
        console.log("Action:", browserActivity.action)
    } else {
        console.error("FAILURE: No activity with image found.")
        console.log("Recent activities:", JSON.stringify(activities, null, 2))
    }
}

run()

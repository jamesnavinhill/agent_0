import { sql } from "../lib/db/neon"
import dotenv from "dotenv"

// Load env vars
dotenv.config({ path: ".env.local" })

async function seed() {
    console.log("Seeding Motion Art Task (Video Generation)...")

    try {
        // Check if task already exists
        const existing = await sql(`
            SELECT id FROM tasks WHERE name = 'Motion Art'
        `)

        if (existing.length > 0) {
            const taskId = existing[0].id
            await sql(`
                UPDATE tasks
                SET parameters = '{"mode": "image-to-video", "aspectRatio": "16:9", "model": "veo-3.0-fast-generate-001", "includeAudio": false, "numberOfVideos": 1}'::jsonb,
                    updated_at = NOW()
                WHERE id = $1
            `, [taskId])
            console.log("Updated Motion Art Task:", taskId)
            return
        }

        // Create the Video Generation Task
        const taskResult = await sql(`
            INSERT INTO tasks (name, description, schedule, enabled, category, parameters)
            VALUES (
                'Motion Art', 
                'Generate cinematic videos using Veo - either from text prompts or by animating existing gallery images.', 
                '0 14 * * *', -- 2:00 PM Daily
                true, 
                'video',
                '{"mode": "image-to-video", "aspectRatio": "16:9", "model": "veo-3.0-fast-generate-001", "includeAudio": false, "numberOfVideos": 1}'::jsonb
            )
            RETURNING id
        `)
        const taskId = taskResult[0].id
        console.log("Created Motion Art Task:", taskId)

        console.log("Seed complete!")
    } catch (error) {
        console.error("Seed failed:", error)
    }
}

seed()

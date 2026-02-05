import { sql } from "../lib/db/neon"
import dotenv from "dotenv"

// Load env vars
dotenv.config({ path: ".env.local" })

async function seed() {
    console.log("Seeding Meaningful Media Task...")

    try {
        const existing = await sql(`
            SELECT id FROM tasks WHERE name = 'Meaningful Media'
        `)

        if (existing.length > 0) {
            const taskId = existing[0].id
            await sql(`
                UPDATE tasks
                SET parameters = '{"model": "gemini-2.5-flash-image", "aspectRatio": "9:16"}'::jsonb,
                    updated_at = NOW()
                WHERE id = $1
            `, [taskId])
            console.log("Updated Task:", taskId)
            return
        }

        // 1. Create the Task
        const taskResult = await sql(`
            INSERT INTO tasks (name, description, schedule, enabled, category, parameters)
            VALUES (
                'Meaningful Media', 
                'Generate AI art that visualizes the agents recent memories and internal state.', 
                '0 11 * * *', -- 11:00 AM Daily
                true, 
                'art',
                '{"model": "gemini-2.5-flash-image", "aspectRatio": "9:16"}'::jsonb
            )
            RETURNING id
        `)
        const taskId = taskResult[0].id
        console.log("Created Task:", taskId)

        console.log("Seed complete!")
    } catch (error) {
        console.error("Seed failed:", error)
        // Attempt update if it fails unique constraint (though name isn't unique in schema usually, but good practice)
    }
}

seed()

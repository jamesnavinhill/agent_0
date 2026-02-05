import { sql } from "../lib/db/neon"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const STEP_NAMES = ["The Morning Read", "Meaningful Media", "Motion Art"] as const

async function seed() {
    console.log("Seeding Morning Ritual flow task...")

    const steps = await sql<{ id: string; name: string }>(
        `SELECT id, name FROM tasks WHERE name = ANY($1::text[])`,
        [STEP_NAMES]
    )

    const stepMap = new Map(steps.map((s) => [s.name, s.id]))
    const missing = STEP_NAMES.filter((name) => !stepMap.has(name))
    if (missing.length > 0) {
        throw new Error(`Missing required tasks: ${missing.join(", ")}`)
    }

    const orderedSteps = STEP_NAMES.map((name) => ({
        id: stepMap.get(name)!,
        name,
    }))

    const parameters = {
        flow: "morning-ritual",
        steps: orderedSteps,
    }

    const existing = await sql<{ id: string }>(
        `SELECT id FROM tasks WHERE name = 'Morning Ritual'`
    )

    if (existing.length > 0) {
        const taskId = existing[0].id
        await sql(
            `UPDATE tasks
             SET description = $1,
                 schedule = $2,
                 enabled = true,
                 category = 'flow',
                 parameters = $3,
                 updated_at = NOW()
             WHERE id = $4`,
            [
                "Run Morning Read, Meaningful Media, and Motion Art in sequence.",
                "0 6 * * *",
                JSON.stringify(parameters),
                taskId,
            ]
        )
        console.log("Updated Morning Ritual task:", taskId)
    } else {
        const rows = await sql<{ id: string }>(
            `INSERT INTO tasks (name, description, schedule, enabled, category, parameters)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id`,
            [
                "Morning Ritual",
                "Run Morning Read, Meaningful Media, and Motion Art in sequence.",
                "0 6 * * *",
                true,
                "flow",
                JSON.stringify(parameters),
            ]
        )
        console.log("Created Morning Ritual task:", rows[0]?.id)
    }

    await sql(
        `UPDATE tasks SET enabled = false WHERE name = ANY($1::text[])`,
        [STEP_NAMES]
    )
    console.log("Disabled individual tasks (manual run still available).")
}

seed().catch((error) => {
    console.error("Seeding failed:", error)
    process.exit(1)
})

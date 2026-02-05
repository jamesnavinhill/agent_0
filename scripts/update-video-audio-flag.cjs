const dotenv = require("dotenv")
const { Pool } = require("@neondatabase/serverless")

dotenv.config({ path: ".env.local" })

async function run() {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
        throw new Error("DATABASE_URL not set in .env.local")
    }

    const pool = new Pool({ connectionString })

    console.log("Updating video tasks to includeAudio=false and numberOfVideos=1...")

    const updateQuery = `
        UPDATE tasks
        SET parameters = jsonb_set(
            jsonb_set(
                COALESCE(parameters, '{}'::jsonb),
                '{includeAudio}',
                'false'::jsonb,
                true
            ),
            '{numberOfVideos}',
            '1'::jsonb,
            true
        ),
        updated_at = NOW()
        WHERE category = 'video'
           OR (parameters->>'mode') IN ('text-to-video', 'image-to-video')
           OR name ILIKE '%motion%'
        RETURNING id, name, category
    `

    const updated = await pool.query(updateQuery)
    console.log(`Updated ${updated.rows.length} task(s).`)
    if (updated.rows.length > 0) {
        console.table(updated.rows)
    }

    const mismatchQuery = `
        SELECT id, name, category, parameters->>'includeAudio' AS "includeAudio"
        FROM tasks
        WHERE (category = 'video'
            OR (parameters->>'mode') IN ('text-to-video', 'image-to-video')
            OR name ILIKE '%motion%')
          AND (parameters->>'includeAudio') IS DISTINCT FROM 'false'
        ORDER BY name
    `

    const mismatches = await pool.query(mismatchQuery)
    if (mismatches.rows.length > 0) {
        console.log("Tasks still not set to includeAudio=false:")
        console.table(mismatches.rows)
    } else {
        console.log("All matching tasks are set to includeAudio=false.")
    }

    await pool.end()
}

run().catch((error) => {
    console.error("Update failed:", error)
    process.exit(1)
})

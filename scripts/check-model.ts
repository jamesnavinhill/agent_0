import { sql } from "../lib/db/neon"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

async function update() {
    console.log("Updating Media Task Model by ID...")
    try {
        const res = await sql(`
      UPDATE tasks 
      SET parameters = '{"model": "imagen-4.0-fast-generate-001", "aspectRatio": "9:16"}'::jsonb
      WHERE id = '39c1cc0b-5bbf-468c-809d-6e130e8635c2'
      RETURNING *
    `)
        console.log("Updated rows:", res.length)
    } catch (error) {
        console.error("Update failed:", error)
    }
}

update()

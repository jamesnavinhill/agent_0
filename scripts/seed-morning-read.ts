import { sql } from "../lib/db/neon"
import dotenv from "dotenv"

// Load env vars
dotenv.config({ path: ".env.local" })

async function seed() {
  console.log("Seeding Morning Read Task...")

  try {
    // 1. Create the Task
    const taskResult = await sql(`
      INSERT INTO tasks (name, description, schedule, enabled, category)
      VALUES (
        'The Morning Read', 
        'Research high-signal tech news and science breakthroughs using Google Search Grounding.', 
        '0 6 * * *', -- 6:00 AM Daily
        true, 
        'research'
      )
      RETURNING id
    `)
    const taskId = taskResult[0].id
    console.log("Created Task:", taskId)

    // 2. Create the Goal (Optional, but good for UI)
    await sql(`
      INSERT INTO goals (title, description, priority, subtasks, completed)
      VALUES (
        'Stay Informed & Relevant',
        'Daily ingestion of high-signal news to maintain an up-to-date world model.',
        'high',
        '["Execute Morning Read", "Update Knowledge Bank", "Reflect on Findings"]'::jsonb,
        false
      )
    `)
    console.log("Created Goal")

    console.log("Seed complete!")
  } catch (error) {
    console.error("Seed failed:", error)
  }
}

seed()

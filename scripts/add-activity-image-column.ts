import { Pool } from "@neondatabase/serverless"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const run = async () => {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
        throw new Error("DATABASE_URL is not set")
    }

    const pool = new Pool({ connectionString })

    try {
        console.log("Adding image_url column to activities table...")

        // Add column if it doesn't exist
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                               WHERE table_name = 'activities' AND column_name = 'image_url') THEN
                    ALTER TABLE activities ADD COLUMN image_url TEXT;
                END IF;
            END $$;
        `)

        console.log("Schema updated successfully.")
    } catch (err) {
        console.error("Migration failed:", err)
    } finally {
        await pool.end()
    }
}

run()

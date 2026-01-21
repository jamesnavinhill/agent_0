import { sql } from "../lib/db/neon"
import dotenv from "dotenv"

// Load env vars
dotenv.config({ path: ".env.local" })

async function migrate() {
    console.log("Adding jobs table for async task processing...")

    try {
        // Create jobs table
        await sql(`
            CREATE TABLE IF NOT EXISTS jobs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                type VARCHAR(50) NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'pending' 
                    CHECK (status IN ('pending', 'processing', 'complete', 'error', 'timeout')),
                
                -- External operation tracking
                operation_id TEXT,
                operation_data JSONB,
                
                -- Input
                task_id UUID,
                input JSONB NOT NULL,
                
                -- Output
                result JSONB,
                error TEXT,
                
                -- Tracking
                check_count INTEGER DEFAULT 0,
                max_checks INTEGER DEFAULT 30,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                completed_at TIMESTAMPTZ
            )
        `)
        console.log("Created jobs table")

        // Create indexes
        await sql(`CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status)`)
        await sql(`CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC)`)
        await sql(`CREATE INDEX IF NOT EXISTS idx_jobs_task_id ON jobs(task_id)`)
        console.log("Created indexes")

        console.log("Migration complete!")
    } catch (error) {
        console.error("Migration failed:", error)
        process.exit(1)
    }
}

migrate()

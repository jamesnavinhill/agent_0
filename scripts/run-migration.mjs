/**
 * Run database migrations
 * Usage: node scripts/run-migration.mjs [migration-name]
 * 
 * Examples:
 *   node scripts/run-migration.mjs sandbox
 *   node scripts/run-migration.mjs schema
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import pg from 'pg'

// Load environment variables
config({ path: '.env.local' })
config({ path: '.env' })

const __dirname = dirname(fileURLToPath(import.meta.url))
const { Pool } = pg

const MIGRATIONS = {
  sandbox: '../scripts/create-sandbox-tables.sql',
  schema: '../lib/db/schema.sql',
}

async function runMigration(migrationName) {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not set')
    process.exit(1)
  }

  if (!migrationName || !MIGRATIONS[migrationName]) {
    console.error(`❌ Unknown migration: ${migrationName}`)
    console.log(`Available migrations: ${Object.keys(MIGRATIONS).join(', ')}`)
    process.exit(1)
  }

  const filePath = join(__dirname, MIGRATIONS[migrationName])
  console.log(`📂 Loading migration from: ${filePath}`)

  const sqlContent = readFileSync(filePath, 'utf-8')
  
  console.log(`📋 Executing migration (${sqlContent.length} bytes)`)

  const pool = new Pool({ connectionString: databaseUrl })

  try {
    // Execute entire file as one transaction
    await pool.query(sqlContent)
    console.log(`✅ Migration completed successfully`)
  } catch (error) {
    console.error(`❌ Migration failed: ${error.message}`)
    process.exit(1)
  }

  await pool.end()

  console.log(`\n📊 Migration complete!`)
}

const migrationName = process.argv[2]
runMigration(migrationName)

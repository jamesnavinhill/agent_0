import { sql } from "../lib/db/neon"
import dotenv from "dotenv"
import fs from "fs/promises"
import path from "path"

dotenv.config({ path: ".env.local" })

const DATA_URL_PREFIX = "data:application/json;base64,"

type GalleryRow = {
  id: string
  blob_url: string
}

function decodeDataUrl(blobUrl: string): unknown | null {
  if (!blobUrl.startsWith(DATA_URL_PREFIX)) return null
  try {
    const base64 = blobUrl.slice(DATA_URL_PREFIX.length)
    const jsonText = Buffer.from(base64, "base64").toString("utf-8")
    return JSON.parse(jsonText)
  } catch {
    return null
  }
}

function extractUrl(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null
  const record = payload as Record<string, unknown>
  const candidate = record.content ?? record.url ?? record.blob_url
  if (typeof candidate === "string" && (candidate.startsWith("/") || candidate.startsWith("http"))) {
    return candidate
  }
  return null
}

async function repairVideoRows() {
  const rows = await sql<GalleryRow>(
    `SELECT id, blob_url FROM gallery_items WHERE type = 'video'`
  )

  let updated = 0
  let skipped = 0
  let alreadyGood = 0

  for (const row of rows) {
    if (!row.blob_url) {
      skipped += 1
      continue
    }

    if (!row.blob_url.startsWith(DATA_URL_PREFIX)) {
      alreadyGood += 1
      continue
    }

    const decoded = decodeDataUrl(row.blob_url)
    const url = extractUrl(decoded)

    if (!url) {
      skipped += 1
      continue
    }

    await sql(`UPDATE gallery_items SET blob_url = $1 WHERE id = $2`, [url, row.id])
    updated += 1
  }

  return { total: rows.length, updated, skipped, alreadyGood }
}

async function findOrphanVideos() {
  const generatedDir = path.join(process.cwd(), "public", "generated")
  let files: string[] = []

  try {
    files = await fs.readdir(generatedDir)
  } catch {
    return []
  }

  const videoFiles = files.filter((f) => /\.(mp4|webm|mov)$/i.test(f))

  if (videoFiles.length === 0) return []

  const rows = await sql<GalleryRow>(
    `SELECT blob_url FROM gallery_items WHERE type = 'video'`
  )
  const known = new Set(
    rows
      .map((r) => r.blob_url)
      .filter((u) => typeof u === "string" && u.startsWith("/generated/"))
      .map((u) => u.replace("/generated/", ""))
  )

  return videoFiles.filter((file) => !known.has(file))
}

async function run() {
  console.log("Repairing video gallery URLs...")
  const result = await repairVideoRows()
  console.log("Repair summary:", result)

  const orphans = await findOrphanVideos()
  if (orphans.length > 0) {
    console.log("Orphan video files in public/generated (no DB row):")
    for (const file of orphans) {
      console.log(` - ${file}`)
    }
  } else {
    console.log("No orphan video files found.")
  }
}

run().catch((error) => {
  console.error("Video repair failed:", error)
  process.exit(1)
})

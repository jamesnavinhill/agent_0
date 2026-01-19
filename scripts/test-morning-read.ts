import dotenv from "dotenv"
import path from "path"

// Load env vars from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })

// We need to use dynamic import or ensure paths are handled if using 'tsx'
// But since 'research.ts' uses '@/...' we rely on tsx resolving it.
// If it fails, we might need a helper, but let's try direct import.
// We'll use relative path here to avoid one layer of alias complexity for the entry point.
import { performMorningRead } from "../lib/agent/tools/research"

async function run() {
  console.log("☕ Starting Morning Read Task (Local Test)...")
  console.log("------------------------------------------------")
  
  try {
    const report = await performMorningRead()
    
    console.log("\n✅ Task Complete!")
    console.log("------------------------------------------------")
    console.log(report)
    console.log("------------------------------------------------")
    console.log("Check your 'knowledge' table in Neon to confirm items were saved.")
    
  } catch (error) {
    console.error("❌ Task Failed:", error)
  }
}

run()

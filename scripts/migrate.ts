import { Client } from "pg";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error("DATABASE_URL not found in .env.local");
    // Debug output if needed, but we expect it to be there now
    console.log("Environment keys:", Object.keys(process.env).sort());
    process.exit(1);
}

const client = new Client({
    connectionString: DATABASE_URL,
});

async function main() {
    try {
        console.log("Reading schema.sql...");
        const schemaPath = path.join(process.cwd(), "lib", "db", "schema.sql");
        const schemaSql = fs.readFileSync(schemaPath, "utf8");

        console.log("Connecting to database...");
        await client.connect();

        console.log("Applying schema...");
        await client.query(schemaSql);

        console.log("Schema applied successfully!");
    } catch (error) {
        console.error("Error applying schema:", error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

main();

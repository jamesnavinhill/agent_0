import { Client } from "pg";
import dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error("DATABASE_URL not found in .env.local");
    process.exit(1);
}

const client = new Client({
    connectionString: DATABASE_URL,
});

async function main() {
    try {
        console.log("Connecting to database...");
        await client.connect();

        console.log("Adding columns to tasks table...");

        // Add category column
        try {
            await client.query(`ALTER TABLE tasks ADD COLUMN category VARCHAR(50)`);
            console.log("Added category column");
        } catch (e: any) {
            if (e.code === '42701') console.log("category column already exists");
            else throw e;
        }

        // Add prompt column
        try {
            await client.query(`ALTER TABLE tasks ADD COLUMN prompt TEXT`);
            console.log("Added prompt column");
        } catch (e: any) {
            if (e.code === '42701') console.log("prompt column already exists");
            else throw e;
        }

        // Add parameters column
        try {
            await client.query(`ALTER TABLE tasks ADD COLUMN parameters JSONB`);
            console.log("Added parameters column");
        } catch (e: any) {
            if (e.code === '42701') console.log("parameters column already exists");
            else throw e;
        }

        console.log("Schema update successful!");
    } catch (error) {
        console.error("Error updating schema:", error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

main();

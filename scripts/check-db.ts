import { Client } from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error("DATABASE_URL not found");
    process.exit(1);
}

const client = new Client({
    connectionString: DATABASE_URL,
});

async function main() {
    try {
        await client.connect();
        console.log("Connected to DB");

        const res = await client.query("SELECT * FROM tasks");
        console.log(`Found ${res.rows.length} tasks.`);
        console.log(JSON.stringify(res.rows, null, 2));

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await client.end();
    }
}

main();

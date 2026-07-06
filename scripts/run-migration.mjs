import { neon } from "@neondatabase/serverless";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// Load .env file
const envPath = resolve(".env");
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("❌ DATABASE_URL not found in environment");
  process.exit(1);
}

const sql = neon(databaseUrl);

async function runMigration() {
  console.log("🚀 Running migration: 0002_loud_morgan_stark.sql");

  const migrationPath = resolve("drizzle/0002_loud_morgan_stark.sql");
  const migrationSQL = readFileSync(migrationPath, "utf-8");

  // Split by statement-breakpoint and execute each statement
  const statements = migrationSQL
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      console.log(`  [${i + 1}/${statements.length}] Executing: ${stmt.substring(0, 80)}...`);
      await sql(stmt);
      console.log(`  ✅ Success`);
    } catch (err) {
      // Ignore "already exists" errors
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes("already exists") || errMsg.includes("duplicate_object") || errMsg.includes("does not exist")) {
        console.log(`  ⚠️ Skipped (already applied): ${errMsg.substring(0, 80)}`);
      } else {
        console.error(`  ❌ Error: ${errMsg}`);
      }
    }
  }

  console.log("\n✅ Migration completed!");
}

runMigration().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});

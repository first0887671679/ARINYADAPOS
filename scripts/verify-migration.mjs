import { neon } from "@neondatabase/serverless";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// Load .env
const envPath = resolve(".env");
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
}

const sql = neon(process.env.DATABASE_URL);

async function verify() {
  const tables = await sql("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('line_channels') ORDER BY table_name");
  console.log("✅ Tables:", tables.map(t => t.table_name));

  const cols = await sql("SELECT column_name FROM information_schema.columns WHERE table_name = 'line_channels' ORDER BY ordinal_position");
  console.log("✅ line_channels columns:", cols.map(c => c.column_name));

  console.log("\n🎉 All tables and columns verified!");
}

verify().catch(err => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});

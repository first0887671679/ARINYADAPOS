import { neon } from "@neondatabase/serverless";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env");

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eqIdx = t.indexOf("=");
    if (eqIdx > 0) {
      const k = t.substring(0, eqIdx).trim();
      const v = t.substring(eqIdx + 1).trim().replace(/^["']|["']$/g, "").replace(/\r/g, "");
      process.env[k] = v;
    }
  }
}

const url = (process.env.DATABASE_URL || "").replace(/^['"]|['"]$/g, "").replace(/[&?]channel_binding=[^&]*/g, "");
const sql = neon(url);

async function main() {
  console.log("=== Syncing LINE Channel Secrets ===\n");
  
  const secret = process.env.LINE_CHANNEL_SECRET;
  const token = process.env.LINE_CHANNEL_TOKEN;

  if (!secret || !token) {
    console.log("❌ Missing LINE_CHANNEL_SECRET or LINE_CHANNEL_TOKEN in .env");
    process.exit(1);
  }

  console.log(`Updating channel 1 with:`);
  console.log(`  channel_secret: ${secret.substring(0, 15)}...`);
  console.log(`  channel_access_token: ${token.substring(0, 20)}...`);

  await sql`UPDATE line_channels SET 
    channel_secret = ${secret},
    channel_access_token = ${token}
  WHERE id = 1`;

  const result = await sql`SELECT id, name, channel_secret, channel_access_token FROM line_channels WHERE id = 1`;
  console.log("\n✅ Updated successfully!");
  console.log(`  channel_secret: ${result[0].channel_secret.substring(0, 15)}...`);
  console.log(`  channel_access_token: ${result[0].channel_access_token.substring(0, 20)}...`);
}

main().catch(console.error);

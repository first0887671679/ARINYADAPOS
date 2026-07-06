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
  console.log("=== Checking LINE Channel Secrets ===\n");
  
  const channels = await sql`SELECT id, name, channel_id, webhook_path, is_active FROM line_channels`;
  console.log("Channels in DB:");
  channels.forEach(c => {
    console.log(`  id=${c.id} name="${c.name}" channel_id="${c.channel_id}" path="${c.webhook_path}" active=${c.is_active}`);
  });

  // Check if channel_secret and channel_access_token columns exist
  try {
    const cols = await sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'line_channels' 
      AND column_name IN ('channel_secret', 'channel_access_token')
      ORDER BY column_name`;
    console.log("\nSecret/Token columns:", cols.map(c => c.column_name).join(", ") || "NONE");
    
    if (cols.length > 0) {
      const details = await sql`SELECT id, name, channel_secret, channel_access_token FROM line_channels`;
      details.forEach(d => {
        console.log(`\n  Channel "${d.name}":`);
        console.log(`    channel_secret: ${d.channel_secret ? d.channel_secret.substring(0, 15) + "..." : "NULL"}`);
        console.log(`    channel_access_token: ${d.channel_access_token ? d.channel_access_token.substring(0, 20) + "..." : "NULL"}`);
      });
    }
  } catch (e) {
    console.log("Error:", e.message);
  }

  console.log("\n.env values:");
  console.log(`  LINE_CHANNEL_SECRET: ${process.env.LINE_CHANNEL_SECRET ? process.env.LINE_CHANNEL_SECRET.substring(0, 15) + "..." : "NULL"}`);
  console.log(`  LINE_CHANNEL_TOKEN: ${process.env.LINE_CHANNEL_TOKEN ? process.env.LINE_CHANNEL_TOKEN.substring(0, 20) + "..." : "NULL"}`);
}

main().catch(console.error);

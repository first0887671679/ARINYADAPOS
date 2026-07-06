import { neon } from "@neondatabase/serverless";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env");

// Load .env file
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

const url = (process.env.DATABASE_URL || "")
  .replace(/^['"]|['"]$/g, "")
  .replace(/[&?]channel_binding=[^&]*/g, "");

if (!url) {
  console.log("❌ DATABASE_URL not found in .env file!");
  process.exit(1);
}

const sql = neon(url);

console.log("=== Enabling LINE Notifications ===\n");

// Enable all LINE notifications
await sql`UPDATE store_settings SET 
  line_notify_enabled = true,
  low_stock_alert_enabled = true,
  out_of_stock_alert_enabled = true,
  new_sale_alert_enabled = true
WHERE id = (SELECT id FROM store_settings LIMIT 1)`;

console.log("✅ All LINE notifications enabled!");

// Verify
const settings = await sql`SELECT 
  line_notify_enabled, 
  low_stock_alert_enabled, 
  out_of_stock_alert_enabled,
  new_sale_alert_enabled
FROM store_settings LIMIT 1`;

const s = settings[0];
console.log("\n=== Updated Settings ===");
console.log(`  line_notify_enabled: ${s.line_notify_enabled}`);
console.log(`  low_stock_alert_enabled: ${s.low_stock_alert_enabled}`);
console.log(`  out_of_stock_alert_enabled: ${s.out_of_stock_alert_enabled}`);
console.log(`  new_sale_alert_enabled: ${s.new_sale_alert_enabled}`);

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

console.log("=== Checking LINE Settings ===\n");

// Check store settings
const settings = await sql`SELECT 
  line_channel_token, 
  line_user_id, 
  line_notify_enabled, 
  low_stock_alert_enabled, 
  out_of_stock_alert_enabled,
  new_sale_alert_enabled,
  low_stock_threshold
FROM store_settings LIMIT 1`;

if (settings.length === 0) {
  console.log("❌ No store settings found!");
} else {
  const s = settings[0];
  console.log("Store Settings:");
  console.log(`  line_channel_token: ${s.line_channel_token ? s.line_channel_token.substring(0, 20) + "..." : "❌ EMPTY"}`);
  console.log(`  line_user_id: ${s.line_user_id || "❌ EMPTY"}`);
  console.log(`  line_notify_enabled: ${s.line_notify_enabled}`);
  console.log(`  low_stock_alert_enabled: ${s.low_stock_alert_enabled}`);
  console.log(`  out_of_stock_alert_enabled: ${s.out_of_stock_alert_enabled}`);
  console.log(`  new_sale_alert_enabled: ${s.new_sale_alert_enabled}`);
  console.log(`  low_stock_threshold: ${s.low_stock_threshold}`);
}

// Check .env values
console.log("\n=== .env Values ===");
console.log(`  LINE_CHANNEL_TOKEN: ${process.env.LINE_CHANNEL_TOKEN ? process.env.LINE_CHANNEL_TOKEN.substring(0, 20) + "..." : "❌ EMPTY"}`);
console.log(`  LINE_USER_ID: ${process.env.LINE_USER_ID || "❌ EMPTY"}`);

// Check employees with LINE User ID
console.log("\n=== Employees with LINE User ID ===");
const employees = await sql`SELECT id, name, line_user_id FROM employees WHERE line_user_id IS NOT NULL AND line_user_id != ''`;
if (employees.length === 0) {
  console.log("  No employees with LINE User ID");
} else {
  employees.forEach(e => console.log(`  id=${e.id} name=${e.name} line_user_id=${e.line_user_id}`));
}

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
  console.log("❌ DATABASE_URL not found!");
  process.exit(1);
}

const sql = neon(url);

// Test LINE Messaging API
async function testLineMessage(channelToken, userId, message) {
  console.log(`\n📤 Sending test message to ${userId}...`);
  console.log(`   Token: ${channelToken.substring(0, 20)}...`);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${channelToken}`,
      },
      body: JSON.stringify({
        to: userId,
        messages: [{ type: "text", text: message }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      console.log("✅ Message sent successfully!");
      return { success: true };
    }

    const data = await res.json().catch(() => ({}));
    console.log(`❌ Failed: HTTP ${res.status}`);
    console.log(`   Error: ${JSON.stringify(data, null, 2)}`);
    return { success: false, error: data };
  } catch (e) {
    console.log(`❌ Network error: ${e.message}`);
    return { success: false, error: e.message };
  }
}

async function main() {
  console.log("=== LINE Messaging API Test ===\n");

  // Get settings
  const settings = await sql`SELECT line_channel_token, line_user_id FROM store_settings LIMIT 1`;
  const s = settings[0];

  const channelToken = s?.line_channel_token || process.env.LINE_CHANNEL_TOKEN;
  const userId = s?.line_user_id || process.env.LINE_USER_ID;

  if (!channelToken) {
    console.log("❌ No LINE Channel Token found!");
    process.exit(1);
  }

  if (!userId) {
    console.log("❌ No LINE User ID found!");
    process.exit(1);
  }

  console.log(`📱 Channel Token: ${channelToken.substring(0, 20)}...`);
  console.log(`👤 User ID: ${userId}`);

  // Test 1: Send to owner
  const test1 = await testLineMessage(
    channelToken,
    userId,
    `🔔 ทดสอบระบบ LINE\nเวลา: ${new Date().toLocaleString("th-TH")}\nนี่คือข้อความทดสอบจากระบบ`
  );

  // Test 2: Send to employee (ช่างเค)
  const empUserId = "U0cb0185732518878b8f7070b89d1321b";
  console.log(`\n📤 Sending test message to employee (${empUserId})...`);
  const test2 = await testLineMessage(
    channelToken,
    empUserId,
    `🔔 ทดสอบระบบ LINE (พนักงาน)\nเวลา: ${new Date().toLocaleString("th-TH")}\nนี่คือข้อความทดสอบจากระบบ`
  );

  console.log("\n=== Test Results ===");
  console.log(`Owner: ${test1.success ? "✅" : "❌"}`);
  console.log(`Employee: ${test2.success ? "✅" : "❌"}`);

  if (test1.success && test2.success) {
    console.log("\n🎉 LINE Messaging API is working correctly!");
  } else {
    console.log("\n⚠️ Some tests failed. Check the errors above.");
  }
}

main().catch(console.error);

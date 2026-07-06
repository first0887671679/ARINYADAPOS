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

async function sendLineMessage(channelToken, userId, message) {
  console.log(`📤 Sending to ${userId}...`);
  
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
      console.log("✅ Success!");
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
  console.log("=== Full LINE Notification Test ===\n");

  // Get store settings
  const settings = await sql`SELECT 
    line_channel_token, line_user_id, line_notify_enabled, 
    new_sale_alert_enabled, low_stock_alert_enabled, out_of_stock_alert_enabled,
    store_name, low_stock_threshold
  FROM store_settings LIMIT 1`;

  const s = settings[0];
  console.log("📋 Store Settings:");
  console.log(`   store_name: ${s.store_name}`);
  console.log(`   line_notify_enabled: ${s.line_notify_enabled}`);
  console.log(`   new_sale_alert_enabled: ${s.new_sale_alert_enabled}`);
  console.log(`   low_stock_alert_enabled: ${s.low_stock_alert_enabled}`);
  console.log(`   out_of_stock_alert_enabled: ${s.out_of_stock_alert_enabled}`);
  console.log(`   low_stock_threshold: ${s.low_stock_threshold}`);

  const channelToken = s.line_channel_token || process.env.LINE_CHANNEL_TOKEN;
  const ownerUserId = s.line_user_id || process.env.LINE_USER_ID;

  if (!channelToken || !ownerUserId) {
    console.log("❌ Missing LINE credentials!");
    process.exit(1);
  }

  // Test 1: New Sale Alert
  console.log("\n--- Test 1: New Sale Alert ---");
  const saleMsg = `🛒 คำสั่งซื้อใหม่!\n🏪 ${s.store_name}\n📋 BILL-TEST-${Date.now()}\n🕐 ${new Date().toLocaleString("th-TH")}\n👤 พนักงาน: ทดสอบ\n\n📝 รายการสินค้า:\n────────────────────\n• สินค้าทดสอบ\n  จำนวน: 1 | 100.00 ฿\n────────────────────\n💰 รวมทั้งสิ้น: 100.00 บาท\n💵 เงินสด`;
  
  const test1 = await sendLineMessage(channelToken, ownerUserId, saleMsg);
  
  // Test 2: Low Stock Alert
  console.log("\n--- Test 2: Low Stock Alert ---");
  const lowStockMsg = `⚠️ สินค้าใกล้หมด!\n📦 สินค้าทดสอบ\nคงเหลือ: 1 ชิ้น\n(เกณฑ์การเตือน: ${s.low_stock_threshold} ชิ้น)`;
  const test2 = await sendLineMessage(channelToken, ownerUserId, lowStockMsg);

  // Test 3: Out of Stock Alert
  console.log("\n--- Test 3: Out of Stock Alert ---");
  const outOfStockMsg = `⚠️ สินค้าหมด!\n📦 สินค้าทดสอบ\nคงเหลือ: 0 ชิ้น\n📝 กรุณาเติมสต๊อกโดยเร็วที่สุด`;
  const test3 = await sendLineMessage(channelToken, ownerUserId, outOfStockMsg);

  console.log("\n=== Test Results ===");
  console.log(`New Sale Alert: ${test1.success ? "✅" : "❌"}`);
  console.log(`Low Stock Alert: ${test2.success ? "✅" : "❌"}`);
  console.log(`Out of Stock Alert: ${test3.success ? "✅" : "❌"}`);

  if (test1.success && test2.success && test3.success) {
    console.log("\n🎉 All LINE notifications working correctly!");
    console.log("\n✅ ระบบพร้อมใช้งานแล้ว");
    console.log("📝 หมายเหตุ: ข้อความทดสอบถูกส่งไปยัง LINE ของคุณแล้ว");
  } else {
    console.log("\n⚠️ Some tests failed. Check the errors above.");
  }
}

main().catch(console.error);

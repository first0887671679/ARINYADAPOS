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
  console.log("=== Simulating sendSaleLineNotify ===\n");

  // Get latest sale
  const sales = await sql`SELECT id, bill_number, total, payment_method, created_at FROM sales ORDER BY id DESC LIMIT 1`;
  
  if (sales.length === 0) {
    console.log("❌ No sales found!");
    process.exit(1);
  }

  const sale = sales[0];
  console.log(`📋 Latest sale: id=${sale.id}, bill=${sale.bill_number}, total=${sale.total}`);

  // Get store settings
  const settings = await sql`SELECT 
    line_channel_token, line_user_id, line_notify_enabled, 
    new_sale_alert_enabled, store_name
  FROM store_settings LIMIT 1`;

  const s = settings[0];
  console.log(`\n🔍 Settings:`);
  console.log(`   line_notify_enabled: ${s.line_notify_enabled}`);
  console.log(`   new_sale_alert_enabled: ${s.new_sale_alert_enabled}`);
  console.log(`   store_name: ${s.store_name}`);

  // Check if LINE is enabled
  const isEnabled = s.line_notify_enabled ?? true;
  if (!isEnabled) {
    console.log("❌ LINE Notify is disabled in settings!");
    process.exit(1);
  }

  if (s.new_sale_alert_enabled === false) {
    console.log("❌ New sale alert is disabled in settings!");
    process.exit(1);
  }

  const channelToken = s.line_channel_token || process.env.LINE_CHANNEL_TOKEN;
  const ownerUserId = s.line_user_id || process.env.LINE_USER_ID;

  if (!channelToken) {
    console.log("❌ No channel token found!");
    process.exit(1);
  }

  if (!ownerUserId) {
    console.log("❌ No owner user ID found!");
    process.exit(1);
  }

  // Get sale items
  const items = await sql`
    SELECT si.quantity, si.unit_price, si.total, p.name, p.brand, p.model
    FROM sale_items si
    JOIN products p ON p.id = si.product_id
    WHERE si.sale_id = ${sale.id}
  `;

  console.log(`\n📝 Sale items (${items.length}):`);
  items.forEach(i => console.log(`   ${i.name} x${i.quantity} = ${i.total}`));

  // Build message like sendSaleLineNotify does
  const storeName = s.store_name || "ร้านแบตเตอรี่";
  const now = new Date();
  
  let msg = `🛒 คำสั่งซื้อใหม่!`;
  msg += `\n🏪 ${storeName}`;
  msg += `\n📋 ${sale.bill_number}`;
  msg += `\n🕐 ${now.toLocaleDateString("th-TH")} ${now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}`;
  msg += `\n\n📝 รายการสินค้า:`;
  msg += `\n${"─".repeat(20)}`;
  
  for (const item of items) {
    let productLine = `${item.name}`;
    if (item.brand) productLine += ` (${item.brand}`;
    if (item.model) productLine += ` ${item.model}`;
    if (item.brand) productLine += `)`;
    msg += `\n• ${productLine}`;
    msg += `\n  จำนวน: ${item.quantity} | ${parseFloat(item.total).toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿`;
  }

  msg += `\n${"─".repeat(20)}`;
  msg += `\n💰 รวมทั้งสิ้น: ${parseFloat(sale.total).toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท`;
  msg += `\n💵 ${sale.payment_method}`;

  console.log(`\n📨 Message to send:`);
  console.log(msg);

  // Send message
  console.log(`\n🚀 Sending LINE message...`);
  const result = await sendLineMessage(channelToken, ownerUserId, msg);

  if (result.success) {
    console.log("\n🎉 LINE message sent successfully!");
  } else {
    console.log("\n❌ Failed to send LINE message");
  }
}

main().catch(console.error);

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

const queries = [
  `CREATE TABLE IF NOT EXISTS sms_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    duration_months INTEGER NOT NULL DEFAULT 18,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sms_reminders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    sale_id INTEGER REFERENCES sales(id),
    template_id INTEGER REFERENCES sms_templates(id),
    customer_name VARCHAR(255),
    phone VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    product_info VARCHAR(500),
    scheduled_date TIMESTAMP NOT NULL,
    sent_at TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
  )`,
  // Insert default templates
  `INSERT INTO sms_templates (name, message, duration_months) VALUES
    ('แจ้งเตือนเปลี่ยนแบตเตอรี่ 18 เดือน', 'สวัสดีครับ คุณ{{name}} แบตเตอรี่ {{product}} ที่ซื้อไปครบ 18 เดือนแล้ว แนะนำให้ตรวจเช็คสภาพ สอบถามเพิ่มเติม โทร {{shopPhone}} ขอบคุณครับ', 18),
    ('แจ้งเตือนเปลี่ยนแบตเตอรี่ 24 เดือน', 'สวัสดีครับ คุณ{{name}} แบตเตอรี่ {{product}} ครบกำหนดประกัน 24 เดือนแล้ว แนะนำเปลี่ยนใหม่เพื่อความปลอดภัย สอบถาม โทร {{shopPhone}} ขอบคุณครับ', 24)
  ON CONFLICT DO NOTHING`,
];

for (const q of queries) {
  try {
    await sql(q);
    console.log("✅", q.substring(0, 60) + "...");
  } catch (e) {
    if (e.message?.includes("already exists") || e.message?.includes("duplicate")) {
      console.log("⏭️ Skipped (already exists):", q.substring(0, 60));
    } else {
      console.error("❌ Error:", e.message);
    }
  }
}

console.log("Done! SMS tables created.");

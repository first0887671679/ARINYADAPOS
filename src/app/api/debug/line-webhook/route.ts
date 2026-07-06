import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { lineChannels } from "@/db/schema";
import { count } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/debug/line-webhook — Debug endpoint สำหรับตรวจสอบ LINE webhook
export async function GET(request: NextRequest) {
  const results: any = {
    env: {
      LINE_CHANNEL_TOKEN: process.env.LINE_CHANNEL_TOKEN ? "✅ Set (length: " + process.env.LINE_CHANNEL_TOKEN.length + ")" : "❌ Not set",
      LINE_CHANNEL_SECRET: process.env.LINE_CHANNEL_SECRET ? "✅ Set (length: " + process.env.LINE_CHANNEL_SECRET.length + ")" : "❌ Not set",
      LINE_USER_ID: process.env.LINE_USER_ID ? "✅ Set" : "❌ Not set",
      DATABASE_URL: process.env.DATABASE_URL ? "✅ Set" : "❌ Not set",
    },
    database: {},
    webhookUrl: "",
    instructions: [],
  };

  // Check database tables
  try {
    const tableCheck = await db.execute(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('line_channels')
      ORDER BY table_name
    `);
    results.database.tables = tableCheck.rows.map((r: any) => r.table_name);
  } catch (err: any) {
    results.database.tablesError = err?.message;
  }

  // Check line_channels count
  try {
    const chCount = await db.select({ count: count() }).from(lineChannels);
    results.database.lineChannelsCount = chCount[0]?.count || 0;
  } catch (err: any) {
    results.database.lineChannelsError = err?.message;
  }

  // Get webhook URL
  const url = new URL(request.url);
  results.webhookUrl = `${url.origin}/api/line-webhook`;

  // Instructions
  if (!process.env.LINE_CHANNEL_TOKEN || !process.env.LINE_CHANNEL_SECRET) {
    results.instructions.push("⚠️ LINE_CHANNEL_TOKEN และ LINE_CHANNEL_SECRET ต้องตั้งค่าใน .env หรือ Vercel Environment Variables");
  }
  if (results.database.lineChannelsCount === 0 && (!process.env.LINE_CHANNEL_TOKEN || !process.env.LINE_CHANNEL_SECRET)) {
    results.instructions.push("⚠️ ยังไม่มี LINE OA ในระบบ และไม่มี env variables — ต้องเพิ่ม LINE OA ผ่านหน้า /line-channels หรือตั้งค่า env");
  }
  results.instructions.push(`📋 Webhook URL สำหรับ LINE Developers: ${results.webhookUrl}`);
  results.instructions.push("📋 ไปที่ LINE Developers Console → Channel → Webhook settings → ใส่ Webhook URL → กด Verify");

  return NextResponse.json(results);
}
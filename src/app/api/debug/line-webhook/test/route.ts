import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { lineChannels } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/debug/line-webhook/test — ทดสอบ webhook endpoint
export async function POST(request: NextRequest) {
  const results: any = {
    steps: [],
    success: false,
  };

  // Step 1: Check env
  const hasToken = !!process.env.LINE_CHANNEL_TOKEN;
  const hasSecret = !!process.env.LINE_CHANNEL_SECRET;
  results.steps.push({
    step: "Check env variables",
    status: hasToken && hasSecret ? "pass" : "fail",
    detail: `LINE_CHANNEL_TOKEN: ${hasToken ? "✅" : "❌"}, LINE_CHANNEL_SECRET: ${hasSecret ? "✅" : "❌"}`,
  });

  // Step 2: Check database
  try {
    const channels = await db.select().from(lineChannels).limit(1);
    results.steps.push({
      step: "Check line_channels table",
      status: "pass",
      detail: `Table exists, ${channels.length} channels found`,
    });
  } catch (err: any) {
    results.steps.push({
      step: "Check line_channels table",
      status: "fail",
      detail: err?.message,
    });
  }

  // Step 3: Check if any channel is active
  try {
    const activeChannels = await db.select().from(lineChannels).where(
      require("drizzle-orm").eq(lineChannels.isActive, true)
    ).limit(1);
    results.steps.push({
      step: "Check active channels",
      status: activeChannels.length > 0 ? "pass" : "warn",
      detail: activeChannels.length > 0
        ? `${activeChannels.length} active channel(s): ${activeChannels.map(c => c.name).join(", ")}`
        : "No active channels. Using env fallback if configured.",
    });
  } catch (err: any) {
    results.steps.push({
      step: "Check active channels",
      status: "warn",
      detail: err?.message,
    });
  }

  // Step 4: Check webhook URL accessibility
  const url = new URL(request.url);
  const webhookUrl = `${url.origin}/api/line-webhook`;
  results.steps.push({
    step: "Webhook URL",
    status: "info",
    detail: webhookUrl,
  });

  // Overall
  const hasFail = results.steps.some((s: any) => s.status === "fail");
  results.success = !hasFail;

  return NextResponse.json(results);
}

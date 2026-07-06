import { NextRequest, NextResponse } from "next/server";

// ThaiBulkSMS Webhook - รับสถานะ SMS
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    console.log("[SMS Webhook] Received:", JSON.stringify(body));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SMS Webhook] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ status: "ok", service: "sms-webhook" });
}

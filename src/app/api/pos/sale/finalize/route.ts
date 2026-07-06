import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sales } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSession(request: NextRequest) {
  const sessionCookie = request.cookies.get("arinyadapos_session");
  if (!sessionCookie?.value) return null;
  try { return JSON.parse(sessionCookie.value); } catch { return null; }
}

// POST /api/pos/sale/finalize — ส่ง LINE แจ้งเตือน (บริการไม่ต้องตัดสต็อก)
export async function POST(request: NextRequest) {
  try {
    console.log("[FINALIZE] Request received");
    
    if (!getSession(request)) {
      console.log("[FINALIZE] Unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { saleId, saleItems: items } = await request.json();
    console.log(`[FINALIZE] saleId=${saleId}, items=${items?.length || 0}`);
    
    if (!saleId) return NextResponse.json({ error: "Missing saleId" }, { status: 400 });

    // Send LINE notify (import dynamically)
    console.log(`[FINALIZE] Calling sendSaleLineNotify for saleId=${saleId}`);
    try {
      const { sendSaleLineNotify } = await import("@/app/actions");
      await sendSaleLineNotify(saleId);
      console.log(`[FINALIZE] sendSaleLineNotify completed for saleId=${saleId}`);
    } catch (err) {
      console.error(`[FINALIZE] LINE notify failed for saleId=${saleId}:`, err);
    }

    // บริการไม่ต้องเช็คสต็อก

    console.log("[FINALIZE] Success");
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[FINALIZE] Error:", err);
    return NextResponse.json({ error: err?.message || "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

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

// POST /api/pos/sale/cancel — ยกเลิกการขาย + คืนสต๊อก
export async function POST(request: NextRequest) {
  try {
    if (!getSession(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { saleId } = await request.json();
    if (!saleId) return NextResponse.json({ error: "Missing saleId" }, { status: 400 });

    console.log(`[CANCEL] saleId=${saleId}`);

    const [sale] = await db.select({ status: sales.status }).from(sales).where(eq(sales.id, saleId)).limit(1);
    if (!sale || sale.status === "voided") {
      console.log(`[CANCEL] rejected: sale not found or already voided, status=${sale?.status}`);
      return NextResponse.json({ error: "ไม่สามารถยกเลิกรายการนี้ได้" }, { status: 400 });
    }

    // บริการไม่ต้องคืนสต็อก
    await db.update(sales).set({ status: "voided" }).where(eq(sales.id, saleId));

    console.log(`[CANCEL] done.`);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[POST /api/pos/sale/cancel]", err);
    return NextResponse.json({ error: err?.message || "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

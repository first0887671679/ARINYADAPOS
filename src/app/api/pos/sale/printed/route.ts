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

// POST /api/pos/sale/printed — บันทึกว่าพิมพ์ใบเสร็จแล้ว
export async function POST(request: NextRequest) {
  try {
    if (!getSession(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { saleId } = await request.json();
    if (!saleId) return NextResponse.json({ error: "Missing saleId" }, { status: 400 });

    await db.update(sales).set({
      printed: true,
      printedAt: new Date(),
    }).where(eq(sales.id, saleId));

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[POST /api/pos/sale/printed]", err);
    return NextResponse.json({ error: err?.message || "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sales, saleItems, products } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

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

    // คืนสต๊อกสินค้าทุกรายการในบิล
    const items = await db.select({
      productId: saleItems.productId,
      quantity: saleItems.quantity,
    }).from(saleItems).where(eq(saleItems.saleId, saleId));

    console.log(`[CANCEL] found ${items.length} items to restore`);

    const updatedStock: { id: number; stock: number }[] = [];
    for (const item of items) {
      const result = await db.update(products).set({
        stock: sql`${products.stock} + ${item.quantity}`,
      }).where(eq(products.id, item.productId)).returning({ id: products.id, stock: products.stock });
      if (result[0]) updatedStock.push({ id: result[0].id, stock: Number(result[0].stock) });
      console.log(`[CANCEL] productId=${item.productId} qty=${item.quantity} newStock=${result[0]?.stock}`);
    }

    await db.update(sales).set({ status: "voided" }).where(eq(sales.id, saleId));

    console.log(`[CANCEL] done. updatedStock:`, JSON.stringify(updatedStock));
    return NextResponse.json({ success: true, updatedStock });
  } catch (err: any) {
    console.error("[POST /api/pos/sale/cancel]", err);
    return NextResponse.json({ error: err?.message || "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

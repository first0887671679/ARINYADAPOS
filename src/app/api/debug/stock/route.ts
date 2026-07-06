import { NextResponse } from "next/server";
import { db } from "@/db";
import { products } from "@/db/schema";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Debug endpoint — ดูบริการทั้งหมดจาก DB (ไม่ต้อง login)
export async function GET() {
  try {
    const data = await db.select({
      id: products.id,
      name: products.name,
      sellPrice: products.sellPrice,
      active: products.active,
    }).from(products)
      .where(sql`${products.active} = true`)
      .orderBy(products.id);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      count: data.length,
      products: data,
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Surrogate-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, categories } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Select only fields needed for POS display
const posProductColumns = {
  products: {
    id: products.id,
    name: products.name,
    sellPrice: products.sellPrice,
    categoryId: products.categoryId,
    imageUrl: products.imageUrl,
    active: products.active,
    sortOrder: products.sortOrder,
  },
  categories: {
    id: categories.id,
    name: categories.name,
  },
};

function getSession(request: NextRequest) {
  const sessionCookie = request.cookies.get("arinyadapos_session");
  if (!sessionCookie?.value) return null;
  try { return JSON.parse(sessionCookie.value); } catch { return null; }
}

// GET /api/pos/products?q=keyword&category=id — ค้นหาสินค้า
export async function GET(request: NextRequest) {
  try {
    if (!getSession(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const q = request.nextUrl.searchParams.get("q") || "";
    const categoryId = request.nextUrl.searchParams.get("category");

    // Build WHERE conditions
    const conditions = [eq(products.active, true)];
    if (categoryId) {
      conditions.push(eq(products.categoryId, parseInt(categoryId, 10)));
    }
    if (q) {
      conditions.push(
        sql`(${products.name} ILIKE ${`%${q}%`})`
      );
    }

    const data = await db.select(posProductColumns).from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(products.sortOrder, products.name);

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Pragma": "no-cache",
        "Surrogate-Control": "no-store",
        "CDN-Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
        "Expires": "0",
      },
    });
  } catch (err: any) {
    console.error("[GET /api/pos/products]", err);
    return NextResponse.json({ error: err?.message || "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

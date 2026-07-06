import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("arinyadapos_session");
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try { JSON.parse(sessionCookie.value); } catch {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const data = await request.json();
    if (!data.name) {
      return NextResponse.json({ error: "ชื่อลูกค้าจำเป็น" }, { status: 400 });
    }

    const result = await db.insert(customers).values({
      name: data.name,
      phone: data.phone || null,
      companyName: data.companyName || null,
      industry: data.industry || null,
      contactPerson: data.contactPerson || null,
      address: data.address || null,
      taxId: data.taxId || null,
    }).returning();

    return NextResponse.json(result[0]);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("arinyadapos_session");
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try { JSON.parse(sessionCookie.value); } catch {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const data = await db.select().from(customers).orderBy(customers.name);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

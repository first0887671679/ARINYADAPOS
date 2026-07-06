import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSession(request: NextRequest) {
  const sessionCookie = request.cookies.get("arinyadapos_session");
  if (!sessionCookie?.value) return null;
  try { return JSON.parse(sessionCookie.value); } catch { return null; }
}

// POST /api/pos/notify/line — ส่ง LINE ให้พนักงาน (ไม่ trigger revalidate)
export async function POST(request: NextRequest) {
  try {
    if (!getSession(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const data = await request.json();
    const { sendSaleToEmployeeLine } = await import("@/app/actions");
    const result = await sendSaleToEmployeeLine(data);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[POST /api/pos/notify/line]", err);
    return NextResponse.json({ success: false, error: err?.message || "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

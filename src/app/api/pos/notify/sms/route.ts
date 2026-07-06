import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSession(request: NextRequest) {
  const sessionCookie = request.cookies.get("arinyadapos_session");
  if (!sessionCookie?.value) return null;
  try { return JSON.parse(sessionCookie.value); } catch { return null; }
}

// POST /api/pos/notify/sms — ส่ง SMS ให้พนักงาน
export async function POST(request: NextRequest) {
  try {
    if (!getSession(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const data = await request.json();
    const { sendSmsToEmployee } = await import("@/app/actions");
    const result = await sendSmsToEmployee(data);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[POST /api/pos/notify/sms]", err);
    return NextResponse.json({ success: false, error: err?.message || "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

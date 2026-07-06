import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Health check — returns build timestamp to verify Vercel deployment version
const BUILD_TS = new Date().toISOString();

export async function GET() {
  return NextResponse.json({
    ok: true,
    version: "stock-fix-v5",
    buildTs: BUILD_TS,
    now: new Date().toISOString(),
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}

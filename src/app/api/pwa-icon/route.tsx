import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const size = parseInt(request.nextUrl.searchParams.get("size") || "192");
  const s = Math.min(Math.max(size, 48), 1024);
  const radius = Math.round(s * 0.19);
  const fontSize = Math.round(s * 0.58);

  return new ImageResponse(
    (
      <div
        style={{
          width: s,
          height: s,
          borderRadius: radius,
          background: "#f97316",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize, fontWeight: "bold", color: "white", marginTop: Math.round(s * 0.02) }}>F</span>
      </div>
    ),
    { width: s, height: s }
  );
}

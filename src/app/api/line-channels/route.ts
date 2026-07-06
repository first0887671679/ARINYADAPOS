import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { lineChannels } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getActiveLineChannels, getLineChannelById, createLineChannel, updateLineChannel, deleteLineChannel, testLineChannelConnection } from "@/lib/line-channels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AdminSession {
  id: number;
  name: string;
  role: string;
}

function getSession(request: NextRequest): AdminSession | null {
  const sessionCookie = request.cookies.get("arinyadapos_session");
  if (!sessionCookie?.value) return null;
  try {
    return JSON.parse(sessionCookie.value);
  } catch {
    return null;
  }
}

// GET /api/line-channels — ดึงรายการ LINE OA ทั้งหมด
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const activeOnly = url.searchParams.get("active") === "true";

    let channels;
    if (activeOnly) {
      channels = await getActiveLineChannels();
    } else {
      channels = await db.select().from(lineChannels).orderBy(lineChannels.name);
    }

    // ซ่อน channelSecret และ channelAccessToken จาก response
    const safeChannels = channels.map(ch => ({
      id: ch.id,
      name: ch.name,
      channelId: ch.channelId,
      webhookPath: ch.webhookPath,
      pictureUrl: ch.pictureUrl,
      isActive: ch.isActive,
      createdAt: ch.createdAt,
      updatedAt: ch.updatedAt,
    }));

    return NextResponse.json({ success: true, data: safeChannels });
  } catch (err: any) {
    console.error("[GET /api/line-channels]", err);
    return NextResponse.json({ error: err?.message || "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

// POST /api/line-channels — เพิ่ม LINE OA ใหม่ หรือ ทดสอบการเชื่อมต่อ
export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();

    // Handle test action
    if (data.action === "test" && data.id) {
      const channel = await getLineChannelById(data.id);
      if (!channel) {
        return NextResponse.json({ success: false, error: "Channel not found" }, { status: 404 });
      }
      const result = await testLineChannelConnection(channel);
      return NextResponse.json(result);
    }

    if (!data.name || !data.channelId || !data.channelSecret || !data.channelAccessToken || !data.webhookPath) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // ทดสอบการเชื่อมต่อก่อนบันทึก
    const testChannel = {
      id: 0,
      name: data.name,
      channelId: data.channelId,
      channelSecret: data.channelSecret,
      channelAccessToken: data.channelAccessToken,
      webhookPath: data.webhookPath,
      isActive: true,
    };
    const testResult = await testLineChannelConnection(testChannel);
    if (!testResult.success) {
      return NextResponse.json({ error: `การทดสอบล้มเหลว: ${testResult.error}` }, { status: 400 });
    }

    const channel = await createLineChannel(data);
    if (!channel) {
      return NextResponse.json({ error: "Failed to create channel" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: channel.id,
        name: channel.name,
        channelId: channel.channelId,
        webhookPath: channel.webhookPath,
        isActive: channel.isActive,
        botName: testResult.botName,
      },
    });
  } catch (err: any) {
    console.error("[POST /api/line-channels]", err);
    return NextResponse.json({ error: err?.message || "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

// PUT /api/line-channels — อัปเดต LINE OA
export async function PUT(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    if (!data.id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const existing = await getLineChannelById(data.id);
    if (!existing) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    // ถ้ามีการเปลี่ยน token ให้ทดสอบก่อน
    if (data.channelAccessToken || data.channelSecret) {
      const testChannel = {
        id: existing.id,
        name: existing.name,
        channelId: existing.channelId,
        channelSecret: data.channelSecret || existing.channelSecret,
        channelAccessToken: data.channelAccessToken || existing.channelAccessToken,
        webhookPath: existing.webhookPath,
        isActive: existing.isActive,
      };
      const testResult = await testLineChannelConnection(testChannel);
      if (!testResult.success) {
        return NextResponse.json({ error: `การทดสอบล้มเหลว: ${testResult.error}` }, { status: 400 });
      }
    }

    const channel = await updateLineChannel(data.id, {
      name: data.name,
      channelSecret: data.channelSecret,
      channelAccessToken: data.channelAccessToken,
      isActive: data.isActive,
    });

    if (!channel) {
      return NextResponse.json({ error: "Failed to update channel" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: { id: channel.id, name: channel.name, isActive: channel.isActive } });
  } catch (err: any) {
    console.error("[PUT /api/line-channels]", err);
    return NextResponse.json({ error: err?.message || "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

// DELETE /api/line-channels — ลบ LINE OA
export async function DELETE(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const id = parseInt(url.searchParams.get("id") || "0");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const success = await deleteLineChannel(id);
    if (!success) {
      return NextResponse.json({ error: "Failed to delete channel" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[DELETE /api/line-channels]", err);
    return NextResponse.json({ error: err?.message || "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

// ทดสอบการเชื่อมต่อ LINE OA (ใช้ภายใน POST action=test)
async function testChannelConnection(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    if (!data.channelAccessToken) {
      return NextResponse.json({ error: "Missing channelAccessToken" }, { status: 400 });
    }

    const testChannel = {
      id: 0,
      name: "Test",
      channelId: "test",
      channelSecret: data.channelSecret || "",
      channelAccessToken: data.channelAccessToken,
      webhookPath: "/test",
      isActive: true,
    };

    const result = await testLineChannelConnection(testChannel);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[POST /api/line-channels/test]", err);
    return NextResponse.json({ success: false, error: err?.message || "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

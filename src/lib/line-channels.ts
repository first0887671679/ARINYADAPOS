import { db } from "@/db";
import { lineChannels } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export interface LineChannel {
  id: number;
  name: string;
  channelId: string;
  channelSecret: string;
  channelAccessToken: string;
  webhookPath: string;
  pictureUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ดึง LINE Channels ทั้งหมดที่ active
export async function getActiveLineChannels(): Promise<LineChannel[]> {
  const channels = await db
    .select()
    .from(lineChannels)
    .where(eq(lineChannels.isActive, true))
    .orderBy(lineChannels.name);
  return channels;
}

// ดึง LINE Channel ตาม webhook path
export async function getLineChannelByWebhookPath(webhookPath: string): Promise<LineChannel | null> {
  const channels = await db
    .select()
    .from(lineChannels)
    .where(eq(lineChannels.webhookPath, webhookPath))
    .limit(1);
  return channels.length > 0 ? channels[0] : null;
}

// ดึง LINE Channel ตาม ID
export async function getLineChannelById(id: number): Promise<LineChannel | null> {
  const channels = await db
    .select()
    .from(lineChannels)
    .where(eq(lineChannels.id, id))
    .limit(1);
  return channels.length > 0 ? channels[0] : null;
}

// Verify LINE webhook signature
export function verifyLineSignature(
  body: string,
  channelSecret: string,
  signature: string
): boolean {
  const hash = crypto
    .createHmac("SHA256", channelSecret)
    .update(body)
    .digest("base64");
  return hash === signature;
}

// ส่งข้อความผ่าน LINE Messaging API
export async function sendLineMessageViaChannel(
  channel: LineChannel,
  to: string,
  messages: any[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${channel.channelAccessToken}`,
      },
      body: JSON.stringify({ to, messages }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err?.message || "Failed to send LINE message" };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "เกิดข้อผิดพลาดในการส่งข้อความ" };
  }
}

// ดึงโปรไฟล์ลูกค้าจาก LINE
export async function getLineProfileViaChannel(
  channel: LineChannel,
  userId: string
): Promise<{ displayName?: string; pictureUrl?: string; error?: string } | null> {
  try {
    const res = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
      headers: {
        Authorization: `Bearer ${channel.channelAccessToken}`,
      },
    });

    if (!res.ok) {
      return { error: "Failed to get LINE profile" };
    }

    const data = await res.json();
    return {
      displayName: data.displayName,
      pictureUrl: data.pictureUrl,
    };
  } catch {
    return { error: "เกิดข้อผิดพลาดในการดึงโปรไฟล์" };
  }
}

// สร้าง LINE OA ใหม่
export async function createLineChannel(data: {
  name: string;
  channelId: string;
  channelSecret: string;
  channelAccessToken: string;
  webhookPath: string;
}): Promise<LineChannel | null> {
  try {
    const result = await db
      .insert(lineChannels)
      .values({
        name: data.name,
        channelId: data.channelId,
        channelSecret: data.channelSecret,
        channelAccessToken: data.channelAccessToken,
        webhookPath: data.webhookPath,
      })
      .returning();
    return result[0] || null;
  } catch {
    return null;
  }
}

// อัปเดต LINE OA
export async function updateLineChannel(
  id: number,
  data: Partial<{
    name: string;
    channelSecret: string;
    channelAccessToken: string;
    isActive: boolean;
  }>
): Promise<LineChannel | null> {
  try {
    const result = await db
      .update(lineChannels)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(lineChannels.id, id))
      .returning();
    return result[0] || null;
  } catch {
    return null;
  }
}

// ลบ LINE OA
export async function deleteLineChannel(id: number): Promise<boolean> {
  try {
    await db.delete(lineChannels).where(eq(lineChannels.id, id));
    return true;
  } catch {
    return false;
  }
}

// ทดสอบการเชื่อมต่อ LINE OA
export async function testLineChannelConnection(
  channel: Pick<LineChannel, "channelAccessToken">
): Promise<{ success: boolean; error?: string; botName?: string }> {
  try {
    const res = await fetch("https://api.line.me/v2/bot/info", {
      headers: {
        Authorization: `Bearer ${channel.channelAccessToken}`,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err?.message || "การเชื่อมต่อล้มเหลว" };
    }

    const data = await res.json();
    return { success: true, botName: data.displayName };
  } catch (err: any) {
    return { success: false, error: err?.message || "เกิดข้อผิดพลาด" };
  }
}

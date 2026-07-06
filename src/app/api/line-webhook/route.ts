import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { lineChannels } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyLineSignature, sendLineMessageViaChannel } from "@/lib/line-channels";

interface LineWebhookEvent {
  type: string;
  message?: { type: string; text?: string; id?: string; contentProvider?: { type: string } };
  source?: { userId?: string; groupId?: string; roomId?: string };
  replyToken?: string;
  timestamp: number;
}

interface LineWebhookBody {
  destination: string;
  events: LineWebhookEvent[];
}

// หา LINE Channel จาก request path
async function resolveChannel(req: NextRequest): Promise<any | null> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // หาจาก webhook path ที่ตรงกับใน DB
  try {
    const channels = await db
      .select()
      .from(lineChannels)
      .where(eq(lineChannels.webhookPath, pathname))
      .limit(1);

    if (channels.length > 0 && channels[0].isActive) {
      console.log(`📡 LINE Webhook: Found channel in DB: "${channels[0].name}" (id=${channels[0].id})`);
      return channels[0];
    }
  } catch (err) {
    console.warn("LINE Webhook: Failed to query line_channels table, falling back to env:", err);
  }

  // Fallback: ใช้ default จาก env (backward compatibility)
  const defaultToken = process.env.LINE_CHANNEL_TOKEN;
  const defaultSecret = process.env.LINE_CHANNEL_SECRET;
  if (defaultToken && defaultSecret) {
    console.log("📡 LINE Webhook: Using default channel from env variables");
    return {
      id: 0,
      name: "Default OA",
      channelId: "default",
      channelSecret: defaultSecret,
      channelAccessToken: defaultToken,
    };
  }

  console.warn("LINE Webhook: ⚠️ No channel found in DB and no env variables set");
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-line-signature") || "";

    console.log(`📩 LINE Webhook: Received request, body length=${body.length}, hasSignature=${!!signature}, sig=${signature.substring(0, 10)}...`);

    // หา LINE Channel
    const channel = await resolveChannel(req);
    if (!channel) {
      console.error("LINE Webhook: ❌ No LINE channel configured (no DB channels, no env fallback)");
      return NextResponse.json({ error: "No LINE channel configured" }, { status: 500 });
    }

    console.log(`📩 LINE Webhook: Using channel "${channel.name}" (id=${channel.id})`);

    const data: LineWebhookBody = JSON.parse(body);

    // Handle LINE verify request (events array is empty) ทันทีโดยไม่ต้องสน Signature
    // เพราะ LINE Verify Request บางครั้งใช้ Secret จำลอง หรือต้องการแค่เช็คว่า Endpoint ตอบ 200 หรือไม่
    if (!data.events || data.events.length === 0) {
      console.log("LINE Webhook: ✅ Verify request (empty events) - responding 200 OK directly");
      return NextResponse.json({ success: true, message: "Webhook verified" });
    }

    // Verify signature สำหรับข้อความจริงเท่านั้น
    if (channel.channelSecret) {
      if (signature) {
        const isValid = verifyLineSignature(body, channel.channelSecret, signature);
        if (!isValid) {
          console.error("LINE Webhook: ❌ Invalid signature for channel", channel.name);
          return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }
      } else {
        console.warn("LINE Webhook: ⚠️ No signature provided in headers for real event");
        return NextResponse.json({ error: "Missing signature" }, { status: 401 });
      }
    }

    for (const event of data.events) {
      console.log(`📩 LINE Webhook: Processing event type=${event.type}, source=${JSON.stringify(event.source)}`);

      // Message event - ตอบกลับอัตโนมัติเท่านั้น (ไม่บันทึกแชท)
      if (event.type === "message" && event.source?.userId) {
        const userId = event.source.userId;

        console.log(`📩 LINE Webhook: Message event - userId=${userId}, type=${event.message?.type}`);

        // ตอบกลับอัตโนมัติ
        if (event.replyToken && channel.channelAccessToken) {
          try {
            await sendLineMessageViaChannel(channel, userId, [{
              type: "text",
              text: `✅ ได้รับข้อความของคุณแล้ว\nขณะนี้อยู่ระหว่างการส่งให้ทีมงานของเรา\nรอสักครู่นะค่ะ 🙏`,
            }]);
          } catch (replyError) {
            console.error("LINE reply error:", replyError);
          }
        }
      }

      // Follow event - เมื่อมีคนเพิ่มเพื่อน
      if (event.type === "follow" && event.source?.userId) {
        const userId = event.source.userId;
        console.log(`✅ LINE Webhook: New follower! userId=${userId}, channel=${channel.name}`);

        // ตอบกลับเมื่อเพิ่มเพื่อน
        if (event.replyToken && channel.channelAccessToken) {
          try {
            await sendLineMessageViaChannel(channel, userId, [{
              type: "text",
              text: `🎉 ยินดีต้อนรับ!\n\nสวัสดีค่ะ 👋\nเราพร้อมตอบคำถามเกี่ยวกับบริการรับจ้างทำการตลาดให้คุณนะค่ะ\n\nอยากรู้อะไรไปถามได้เลย 💬`,
            }]);
          } catch (replyError) {
            console.error("LINE reply error:", replyError);
          }
        }
      }

      // Unfollow event
      if (event.type === "unfollow" && event.source?.userId) {
        const userId = event.source.userId;
        console.log(`👋 LINE Webhook: Unfollow! userId=${userId}, channel=${channel.name}`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("LINE Webhook error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
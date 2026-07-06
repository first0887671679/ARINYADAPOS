import { NextResponse } from "next/server";
import { sendDailySalesLineNotify, getStoreSettings } from "@/app/actions";

// เก็บ key "วันที่+เวลา" ที่ส่งไปแล้ว เพื่อไม่ให้ส่งซ้ำในนาทีเดียวกัน
// เช่น "2026-03-10_19:08" → ส่งแล้ว
const sentKeys = new Set<string>();

// POST = ส่งรายงานทันที (ปุ่มกดส่ง)
export async function POST() {
  try {
    const result = await sendDailySalesLineNotify();
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// ฟังก์ชันหาเวลาไทยปัจจุบัน
function getThaiNow() {
  const now = new Date();
  const thaiTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  return {
    hour: thaiTime.getHours(),
    minute: thaiTime.getMinutes(),
    dateStr: `${thaiTime.getFullYear()}-${String(thaiTime.getMonth() + 1).padStart(2, "0")}-${String(thaiTime.getDate()).padStart(2, "0")}`,
    timeStr: `${String(thaiTime.getHours()).padStart(2, "0")}:${String(thaiTime.getMinutes()).padStart(2, "0")}`,
  };
}

// GET = ตรวจสอบเวลาและส่งอัตโนมัติถ้าถึงเวลา (เรียกจาก scheduler)
export async function GET() {
  try {
    const settings = await getStoreSettings();

    // ตรวจว่าเปิดใช้งานส่งอัตโนมัติหรือไม่
    if (!settings.lineReportEnabled) {
      return NextResponse.json({ success: false, skipped: true, reason: "auto-send disabled" });
    }

    // รองรับหลายเวลา คั่นด้วยคอมมา เช่น "08:00,12:00,18:00"
    const reportTimesRaw = settings.lineReportTime || "18:00";
    const scheduledTimes = reportTimesRaw.split(",").map((t: string) => t.trim()).filter(Boolean);

    const thai = getThaiNow();

    // ลบ key เก่าที่ไม่ใช่วันนี้ (ป้องกัน memory leak)
    Array.from(sentKeys).forEach((key) => {
      if (!key.startsWith(thai.dateStr)) {
        sentKeys.delete(key);
      }
    });

    // ตรวจแต่ละเวลาที่ตั้งไว้
    for (const time of scheduledTimes) {
      const [targetHour, targetMinute] = time.split(":").map(Number);
      if (isNaN(targetHour) || isNaN(targetMinute)) continue;

      const key = `${thai.dateStr}_${time}`;

      if (thai.hour === targetHour && thai.minute === targetMinute && !sentKeys.has(key)) {
        sentKeys.add(key);
        const result = await sendDailySalesLineNotify();
        return NextResponse.json({
          ...result,
          triggered: true,
          triggeredTime: time,
          thaiTime: thai.timeStr,
        });
      }
    }

    return NextResponse.json({
      success: true,
      skipped: true,
      reason: "not yet time",
      thaiTime: thai.timeStr,
      scheduledTimes,
      sentToday: Array.from(sentKeys),
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

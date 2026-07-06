"use client";

import { useEffect } from "react";

export function CronScheduler() {
  useEffect(() => {
    // เรียก /api/line-notify ทุก 1 นาที เพื่อตรวจเวลาส่งรายงานอัตโนมัติ
    const interval = setInterval(async () => {
      try {
        await fetch("/api/line-notify", { cache: "no-store" });
      } catch {
        // ไม่ต้อง handle error — เป็น background task
      }
    }, 60_000); // 60 วินาที

    // เรียกครั้งแรกทันที
    fetch("/api/line-notify", { cache: "no-store" }).catch(() => {});

    return () => clearInterval(interval);
  }, []);

  return null; // ไม่แสดง UI
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { getStoreSettings, updateStoreSettings, testLineNotify, sendDailySalesLineNotify } from "@/app/actions";
import { MessageSquare, Send, Bell, CheckCircle2, XCircle, Loader2, ExternalLink, Clock, Settings2, Plus, Trash2 } from "lucide-react";

export default function LineSettings({ initialSettings }: { initialSettings: any }) {
  const [channelToken, setChannelToken] = useState(initialSettings?.lineChannelToken || "");
  const [lineUserId, setLineUserId] = useState(initialSettings?.lineUserId || "");
  const [lineNotifyEnabled, setLineNotifyEnabled] = useState(initialSettings?.lineNotifyEnabled ?? true);
  // Per-sale notification preferences
  const [saleShowProducts, setSaleShowProducts] = useState(initialSettings?.lineSaleProducts ?? true);
  const [saleShowQuantity, setSaleShowQuantity] = useState(initialSettings?.lineSaleQuantity ?? true);
  const [saleShowPrice, setSaleShowPrice] = useState(initialSettings?.lineSalePrice ?? true);
  // Daily report preferences
  const [showSales, setShowSales] = useState(initialSettings?.lineReportSales ?? true);
  const [showQuantity, setShowQuantity] = useState(initialSettings?.lineReportQuantity ?? true);
  const [showProducts, setShowProducts] = useState(initialSettings?.lineReportProducts ?? true);
  const [reportTimes, setReportTimes] = useState<string[]>(() => {
    const raw = initialSettings?.lineReportTime || "18:00";
    return raw.split(",").map((t: string) => t.trim()).filter(Boolean);
  });
  const [autoSend, setAutoSend] = useState(initialSettings?.lineReportEnabled ?? false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  async function handleSave() {
    setSaving(true);
    setResult(null);
    try {
      await saveSettingsToDb();
      setResult({ type: "success", msg: "บันทึกการตั้งค่าสำเร็จ" });
    } catch {
      setResult({ type: "error", msg: "ไม่สามารถบันทึกได้" });
    }
    setSaving(false);
  }

  // บันทึก settings ลง DB (ใช้ร่วมกัน)
  async function saveSettingsToDb() {
    const settings = await getStoreSettings();
    await updateStoreSettings({
      storeName: settings.storeName,
      branchName: settings.branchName || "",
      address: settings.address || "",
      phone: settings.phone || "",
      taxId: settings.taxId || "",
      lineChannelToken: channelToken || "",
      lineUserId: lineUserId || "",
      lineNotifyEnabled: lineNotifyEnabled,
      lineSaleProducts: saleShowProducts,
      lineSaleQuantity: saleShowQuantity,
      lineSalePrice: saleShowPrice,
      lineReportSales: showSales,
      lineReportQuantity: showQuantity,
      lineReportProducts: showProducts,
      lineReportTime: reportTimes.join(","),
      lineReportEnabled: autoSend,
    });
  }

  async function handleTest() {
    setTesting(true);
    setResult(null);
    try {
      // บันทึก Token + User ID ก่อนทดสอบ
      await saveSettingsToDb();
      const res = await testLineNotify();
      if (res.success) {
        setResult({ type: "success", msg: "ส่งข้อความทดสอบสำเร็จ! ตรวจสอบ LINE ของคุณ" });
      } else {
        setResult({ type: "error", msg: res.error || "ส่งไม่สำเร็จ ตรวจสอบ Token และ User ID" });
      }
    } catch {
      setResult({ type: "error", msg: "เกิดข้อผิดพลาด" });
    }
    setTesting(false);
  }

  async function handleSendDaily() {
    setSending(true);
    setResult(null);
    try {
      // บันทึก Token + User ID ก่อนส่ง
      await saveSettingsToDb();
      const res = await sendDailySalesLineNotify();
      if (res.success) {
        setResult({ type: "success", msg: `ส่งสรุปยอดขายวันนี้สำเร็จ!${res.salesCount ? ` (${res.salesCount} บิล)` : ""}` });
      } else {
        setResult({ type: "error", msg: res.error || "ส่งไม่สำเร็จ" });
      }
    } catch {
      setResult({ type: "error", msg: "เกิดข้อผิดพลาด" });
    }
    setSending(false);
  }

  return (
    <div className="rounded-2xl bg-white border border-green-100/60 shadow-luxury overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-green-100/60">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-green-600">
            <MessageSquare className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">LINE Messaging API</h2>
            <p className="text-xs text-muted-foreground">แจ้งเตือนยอดขายผ่าน LINE</p>
          </div>
        </div>
        <a
          href="https://developers.line.biz/console/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 hover:underline"
        >
          LINE Developers Console <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <div className="p-6 space-y-5">
        {/* Enable/Disable LINE Notify */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${lineNotifyEnabled ? "bg-green-500" : "bg-gray-300"}`}>
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700">การแจ้งเตือน LINE</p>
              <p className="text-xs text-muted-foreground">
                {lineNotifyEnabled ? "เปิดใช้งาน - จะมีการส่งแจ้งเตือนเมื่อขายสินค้า" : "ปิดใช้งาน - จะไม่มีการส่งแจ้งเตือน"}
              </p>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={lineNotifyEnabled}
              onCheckedChange={(v: boolean | "indeterminate") => setLineNotifyEnabled(!!v)}
              className="border-green-400 data-[state=checked]:bg-green-500 h-5 w-5"
            />
            <span className={`text-sm font-medium ${lineNotifyEnabled ? "text-green-600" : "text-gray-500"}`}>
              {lineNotifyEnabled ? "เปิด" : "ปิด"}
            </span>
          </label>
        </div>

        {/* Channel Access Token */}
        <div className={!lineNotifyEnabled ? "opacity-50" : ""}>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Channel Access Token (Long-lived)</label>
          <Input
            type="password"
            value={channelToken}
            onChange={(e) => setChannelToken(e.target.value)}
            placeholder="วาง Channel Access Token ที่นี่..."
            className="border-green-200 focus:border-green-400 focus:ring-green-400"
            disabled={!lineNotifyEnabled}
          />
          <p className="text-[11px] text-muted-foreground mt-1.5">
            ไปที่ <span className="font-medium">LINE Developers Console</span> → เลือก Provider → เลือก Channel (Messaging API) → คัดลอก Channel access token
          </p>
        </div>

        {/* User ID */}
        <div className={!lineNotifyEnabled ? "opacity-50" : ""}>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">User ID / Group ID</label>
          <Input
            value={lineUserId}
            onChange={(e) => setLineUserId(e.target.value)}
            placeholder="วาง User ID หรือ Group ID ที่นี่..."
            className="border-green-200 focus:border-green-400 focus:ring-green-400"
            disabled={!lineNotifyEnabled}
          />
          <p className="text-[11px] text-muted-foreground mt-1.5">
            User ID อยู่ที่ <span className="font-medium">LINE Developers Console</span> → Channel → Basic settings → Your user ID หรือใช้ Group ID ของกลุ่ม
          </p>
        </div>

        {/* Per-sale notification options */}
        <div className="bg-blue-50 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <MessageSquare className="h-4 w-4 text-blue-600" />
            แจ้งเตือนทุกครั้งที่ขาย — เลือกข้อมูลที่จะส่ง
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <Checkbox
                checked={saleShowProducts}
                onCheckedChange={(v: boolean | "indeterminate") => setSaleShowProducts(!!v)}
                className="border-blue-400 data-[state=checked]:bg-blue-500"
              />
              <span>ชื่อสินค้า/รุ่น</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <Checkbox
                checked={saleShowQuantity}
                onCheckedChange={(v: boolean | "indeterminate") => setSaleShowQuantity(!!v)}
                className="border-blue-400 data-[state=checked]:bg-blue-500"
              />
              <span>จำนวน</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <Checkbox
                checked={saleShowPrice}
                onCheckedChange={(v: boolean | "indeterminate") => setSaleShowPrice(!!v)}
                className="border-blue-400 data-[state=checked]:bg-blue-500"
              />
              <span>ราคา</span>
            </label>
          </div>
        </div>

        {/* Daily Report Options */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Settings2 className="h-4 w-4 text-green-600" />
            สรุปรายวัน — เลือกข้อมูลที่จะส่ง
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <Checkbox
                checked={showProducts}
                onCheckedChange={(v: boolean | "indeterminate") => setShowProducts(!!v)}
                className="border-green-400 data-[state=checked]:bg-green-500"
              />
              <span>ชื่อสินค้า</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <Checkbox
                checked={showQuantity}
                onCheckedChange={(v: boolean | "indeterminate") => setShowQuantity(!!v)}
                className="border-green-400 data-[state=checked]:bg-green-500"
              />
              <span>จำนวน</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <Checkbox
                checked={showSales}
                onCheckedChange={(v: boolean | "indeterminate") => setShowSales(!!v)}
                className="border-green-400 data-[state=checked]:bg-green-500"
              />
              <span>ยอดขายรวม</span>
            </label>
          </div>
        </div>

        {/* Schedule Time */}
        <div className="bg-blue-50 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Clock className="h-4 w-4 text-blue-600" />
            กำหนดเวลาส่งสรุปอัตโนมัติ
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <Checkbox
              checked={autoSend}
              onCheckedChange={(v: boolean | "indeterminate") => setAutoSend(!!v)}
              className="border-blue-400 data-[state=checked]:bg-blue-500"
            />
            <span>เปิดใช้งานส่งอัตโนมัติ</span>
          </label>

          {/* รายการเวลาที่ตั้งไว้ — แก้ไขได้โดยตรง */}
          <div className="space-y-2">
            {reportTimes.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-sm text-blue-600 w-16">เวลาที่ {i + 1}</span>
                <Input
                  type="time"
                  value={t}
                  onChange={(e) => {
                    const updated = [...reportTimes];
                    updated[i] = e.target.value;
                    setReportTimes(updated);
                  }}
                  className="w-32 h-8 text-sm border-blue-200"
                  disabled={!autoSend}
                />
                <span className="text-xs text-muted-foreground">น.</span>
                {reportTimes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setReportTimes(reportTimes.filter((_, idx) => idx !== i))}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-red-100 transition-colors"
                    disabled={!autoSend}
                    title="ลบเวลานี้"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* ปุ่มเพิ่มเวลา */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!autoSend}
            onClick={() => setReportTimes([...reportTimes, "18:00"])}
            className="h-8 text-xs border-blue-200 hover:bg-blue-100 text-blue-700 gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            เพิ่มเวลาส่ง
          </Button>

          <p className="text-[11px] text-muted-foreground">
            ✅ เพิ่มได้หลายเวลา แก้ไขได้โดยตรง ระบบจะส่งรายงานทุกเวลาที่กำหนด
          </p>
        </div>

        
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-green-500 hover:bg-green-600 text-white rounded-xl px-4 gap-1.5"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            บันทึกการตั้งค่า
          </Button>
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={testing || !channelToken || !lineUserId}
            className="gap-1.5 rounded-xl border-green-200 hover:bg-green-50 text-green-700"
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
            ทดสอบส่ง
          </Button>
          <Button
            variant="outline"
            onClick={handleSendDaily}
            disabled={sending || !channelToken || !lineUserId}
            className="gap-1.5 rounded-xl border-blue-200 hover:bg-blue-50 text-blue-700"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            ส่งสรุปยอดขายวันนี้
          </Button>
        </div>

        {/* Result Message */}
        {result && (
          <div className={`flex items-center gap-2 text-sm p-3 rounded-xl ${result.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {result.type === "success" ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> : <XCircle className="h-4 w-4 flex-shrink-0" />}
            {result.msg}
          </div>
        )}

        {/* How it works */}
        <div className="bg-gray-50 rounded-xl p-4 text-xs text-muted-foreground space-y-1.5">
          <div className="font-semibold text-gray-600 mb-2">ระบบแจ้งเตือนจะทำงาน:</div>
          <div className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">●</span>
            <span><strong>ทุกครั้งที่ขายสินค้า</strong> — แจ้งชื่อสินค้า จำนวน และยอดเงินทันที</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">●</span>
            <span><strong>สรุปยอดขายรายวัน</strong> — กดปุ่ม "ส่งสรุปยอดขายวันนี้" หรือตั้งค่า Cron Job</span>
          </div>
        </div>
      </div>
    </div>
  );
}

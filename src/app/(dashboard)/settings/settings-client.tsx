"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { updateStoreSettings, testLineNotify, sendDailySalesLineNotify } from "@/app/actions";
import {
  Settings,
  Store,
  Phone,
  MapPin,
  MessageSquare,
  Send,
    CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Clock,
    Plus,
  Trash2,
  Save,
  Shield,
  FileText,
  Package,
  Zap,
  ImagePlus,
  X,
  Weight,
} from "lucide-react";
import { uploadToCloudinary } from "@/lib/cloudinary";

export default function SettingsClient({ initialSettings }: { initialSettings: any }) {
  // Store Info
  const [storeName, setStoreName] = useState(initialSettings?.storeName ?? "");
  const [branchName, setBranchName] = useState(initialSettings?.branchName ?? "");
  const [address, setAddress] = useState(initialSettings?.address ?? "");
  const [phone, setPhone] = useState(initialSettings?.phone ?? "");
  const [taxId, setTaxId] = useState(initialSettings?.taxId ?? "");
  const [storeLogo, setStoreLogo] = useState(initialSettings?.storeLogo ?? "");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Inventory Settings
  const [lowStockThreshold, setLowStockThreshold] = useState(initialSettings?.lowStockThreshold ?? 1);
  const [lowStockAlertEnabled, setLowStockAlertEnabled] = useState(initialSettings?.lowStockAlertEnabled ?? true);
  const [outOfStockAlertEnabled, setOutOfStockAlertEnabled] = useState(initialSettings?.outOfStockAlertEnabled ?? true);
  const [newSaleAlertEnabled, setNewSaleAlertEnabled] = useState(initialSettings?.newSaleAlertEnabled ?? true);

  // ราคา kg
  const [kgPrice, setKgPrice] = useState(parseFloat(initialSettings?.kgPrice ?? "0"));

  // LINE Settings
  const [channelToken, setChannelToken] = useState(initialSettings?.lineChannelToken ?? "");
  const [lineUserId, setLineUserId] = useState(initialSettings?.lineUserId ?? "");
  const [lineNotifyEnabled, setLineNotifyEnabled] = useState(initialSettings?.lineNotifyEnabled ?? true);
  const [saleShowProducts, setSaleShowProducts] = useState(initialSettings?.lineSaleProducts ?? true);
  const [saleShowQuantity, setSaleShowQuantity] = useState(initialSettings?.lineSaleQuantity ?? true);
  const [saleShowPrice, setSaleShowPrice] = useState(initialSettings?.lineSalePrice ?? true);
  const [showSales, setShowSales] = useState(initialSettings?.lineReportSales ?? true);
  const [showQuantity, setShowQuantity] = useState(initialSettings?.lineReportQuantity ?? true);
  const [showProducts, setShowProducts] = useState(initialSettings?.lineReportProducts ?? true);
  const [showModel, setShowModel] = useState(initialSettings?.lineReportModel ?? true);
  const [reportTimes, setReportTimes] = useState<string[]>(() => {
    const raw = initialSettings?.lineReportTime ?? "18:00";
    return raw.split(",").map((t: string) => t.trim()).filter(Boolean);
  });
  const [autoSend, setAutoSend] = useState(initialSettings?.lineReportEnabled ?? false);

  // UI State
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"store" | "line">("store");

  async function handleSave() {
    setSaving(true);
    setResult(null);
    try {
      await updateStoreSettings({
        storeName: storeName || "ร้านแบตเตอรี่",
        branchName,
        address,
        phone,
        taxId,
        storeLogo: storeLogo || undefined,
        lineChannelToken: channelToken,
        lineUserId,
        lineNotifyEnabled,
        lineSaleProducts: saleShowProducts,
        lineSaleQuantity: saleShowQuantity,
        lineSalePrice: saleShowPrice,
        lineReportSales: showSales,
        lineReportQuantity: showQuantity,
        lineReportProducts: showProducts,
        lineReportModel: showModel,
        lineReportTime: reportTimes.join(","),
        lineReportEnabled: autoSend,
        lowStockThreshold,
        lowStockAlertEnabled,
        outOfStockAlertEnabled,
        newSaleAlertEnabled,
        kgPrice,
      });
      setResult({ type: "success", msg: "บันทึกการตั้งค่าสำเร็จ" });
    } catch {
      setResult({ type: "error", msg: "ไม่สามารถบันทึกได้" });
    }
    setSaving(false);
  }

  async function handleTest() {
    setTesting(true);
    setResult(null);
    try {
      await handleSave();
      const res = await testLineNotify();
      setResult(res.success
        ? { type: "success", msg: "ส่งข้อความทดสอบสำเร็จ! ตรวจสอบ LINE ของคุณ" }
        : { type: "error", msg: res.error || "ส่งไม่สำเร็จ ตรวจสอบ Token และ User ID" }
      );
    } catch {
      setResult({ type: "error", msg: "เกิดข้อผิดพลาด" });
    }
    setTesting(false);
  }

  async function handleSendDaily() {
    setSending(true);
    setResult(null);
    try {
      await handleSave();
      const res = await sendDailySalesLineNotify();
      setResult(res.success
        ? { type: "success", msg: `ส่งสรุปยอดขายวันนี้สำเร็จ!${res.salesCount ? ` (${res.salesCount} บิล)` : ""}` }
        : { type: "error", msg: res.error || "ส่งไม่สำเร็จ" }
      );
    } catch {
      setResult({ type: "error", msg: "เกิดข้อผิดพลาด" });
    }
    setSending(false);
  }

  const tabs = [
    { key: "store" as const, label: "ข้อมูลร้าน", icon: Store, color: "blue" },
    { key: "line" as const, label: "LINE แจ้งเตือน", icon: MessageSquare, color: "green" },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-md">
              <Settings className="h-5 w-5 text-white" />
            </div>
            ตั้งค่าร้าน
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 ml-11">จัดการข้อมูลร้าน, LINE แจ้งเตือน และการตั้งค่าทั้งหมด</p>
        </div>
      </div>

      {/* Result Banner */}
      {result && (
        <div className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium animate-in slide-in-from-top-2 ${result.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {result.type === "success" ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> : <XCircle className="h-4 w-4 flex-shrink-0" />}
          {result.msg}
          <button onClick={() => setResult(null)} className="ml-auto text-xs opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1.5 bg-white/80 backdrop-blur-sm rounded-xl p-1.5 border border-blue-100/60 shadow-sm overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex-1 justify-center ${
                isActive
                  ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
            </button>
          );
        })}
      </div>

      {/* ========== TAB: Store Info ========== */}
      {activeTab === "store" && (
        <div className="rounded-2xl bg-white border border-blue-100/60 shadow-luxury overflow-hidden">
          <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-blue-100/60 bg-gradient-to-r from-blue-50/80 to-white">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm">
              <Store className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight">ข้อมูลร้านค้า</h2>
              <p className="text-xs text-muted-foreground">ข้อมูลที่จะแสดงในใบเสร็จและเอกสาร</p>
            </div>
          </div>
          <div className="p-4 sm:p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-blue-500" /> ชื่อร้าน *</Label>
                <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="ร้านแบตเตอรี่" className="border-blue-200/60 focus:border-blue-400" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">สาขา</Label>
                <Input value={branchName} onChange={(e) => setBranchName(e.target.value)} placeholder="สาขาหลัก" className="border-blue-200/60 focus:border-blue-400" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-blue-500" /> เบอร์โทร</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08x-xxx-xxxx" className="border-blue-200/60 focus:border-blue-400" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-blue-500" /> เลขประจำตัวผู้เสียภาษี</Label>
                <Input value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="เลข 13 หลัก" className="border-blue-200/60 focus:border-blue-400" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-blue-500" /> ที่อยู่</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="ที่อยู่ร้านค้า" className="border-blue-200/60 focus:border-blue-400" />
            </div>

            {/* โลโก้ร้าน */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-1.5"><ImagePlus className="h-3.5 w-3.5 text-blue-500" /> โลโก้ร้าน</Label>
              <p className="text-xs text-muted-foreground">โลโก้จะแสดงในใบเสร็จ ใบเสนอราคา และเอกสารทุกประเภท</p>
              <div className="flex items-start gap-4">
                {storeLogo ? (
                  <div className="relative group">
                    <img src={storeLogo} alt="โลโก้ร้าน" className="w-24 h-24 object-contain rounded-xl border-2 border-blue-200 bg-white p-1 shadow-sm" />
                    <button
                      type="button"
                      onClick={() => setStoreLogo("")}
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/50 flex items-center justify-center">
                    <ImagePlus className="h-8 w-8 text-blue-300" />
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <label className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/50 hover:bg-blue-100/50 cursor-pointer transition-colors text-sm font-semibold text-blue-700 ${uploadingLogo ? 'opacity-50 pointer-events-none' : ''}`}>
                    {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                    {uploadingLogo ? 'กำลังอัปโหลด...' : (storeLogo ? 'เปลี่ยนโลโก้' : 'อัปโหลดโลโก้')}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploadingLogo(true);
                        try {
                          const result = await uploadToCloudinary(file, "arinyadapos/logos");
                          setStoreLogo(result.secureUrl || result.url);
                          setResult({ type: 'success', msg: 'อัปโหลดโลโก้สำเร็จ' });
                        } catch {
                          setResult({ type: 'error', msg: 'อัปโหลดโลโก้ไม่สำเร็จ' });
                        }
                        setUploadingLogo(false);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  <p className="text-[10px] text-muted-foreground">รองรับ JPG, PNG, SVG ขนาดไม่เกิน 5MB</p>
                </div>
              </div>
            </div>

            {/* ราคา kg */}
            <div className="rounded-xl border-2 border-green-200/60 bg-gradient-to-r from-green-50/50 to-emerald-50/30 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100">
                  <Weight className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-green-800">ราคารับซื้อแบตเตอรี่เก่า (ต่อ kg)</p>
                  <p className="text-[11px] text-green-600/80">กำหนดราคาต่อกิโลกรัม สำหรับคำนวณมูลค่าน้ำหนักที่ขายไป</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-[200px]">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={kgPrice || ""}
                    onChange={(e) => setKgPrice(Number(e.target.value))}
                    placeholder="0.00"
                    className="h-10 pl-9 text-base font-semibold border-green-200 focus:border-green-400 bg-white"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500 font-bold text-sm">฿</span>
                </div>
                <span className="text-sm font-medium text-green-700">บาท / kg</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========== TAB: LINE Integration ========== */}
      {activeTab === "line" && (
        <div className="space-y-4">
          {/* Connection Card */}
          <div className="rounded-2xl bg-white border border-green-100/60 shadow-luxury overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-4 border-b border-green-100/60 bg-gradient-to-r from-green-50/80 to-white gap-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-sm">
                  <MessageSquare className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold tracking-tight">การเชื่อมต่อ LINE</h2>
                  <p className="text-xs text-muted-foreground">ตั้งค่า Token และ User ID</p>
                </div>
              </div>
              <a href="https://developers.line.biz/console/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 hover:underline">
                LINE Developers Console <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              {/* Toggle */}
              <div className="flex items-center justify-between p-3 sm:p-4 rounded-xl border-2 transition-colors ${lineNotifyEnabled ? 'border-green-300 bg-green-50/50' : 'border-gray-200 bg-gray-50/50'}">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${lineNotifyEnabled ? "bg-green-500" : "bg-gray-300"}`}>
                    <MessageSquare className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">การแจ้งเตือนผ่าน LINE</p>
                    <p className="text-xs text-muted-foreground">{lineNotifyEnabled ? "เปิดใช้งาน — ส่งแจ้งเตือนเมื่อมีการขาย" : "ปิดใช้งาน — ไม่มีการส่งแจ้งเตือน"}</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={lineNotifyEnabled} onChange={(e) => setLineNotifyEnabled(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>

              {/* Token */}
              <div className={`space-y-1.5 transition-opacity ${!lineNotifyEnabled ? "opacity-40 pointer-events-none" : ""}`}>
                <Label className="text-sm font-semibold">Channel Access Token</Label>
                <Input value={channelToken} onChange={(e) => setChannelToken(e.target.value)} placeholder="วาง Channel Access Token ที่นี่..." type="password" className="border-green-200/60 focus:border-green-400" />
                <p className="text-[10px] sm:text-xs text-muted-foreground">LINE Developers Console → Messaging API → Channel access token</p>
              </div>

              {/* User ID */}
              <div className={`space-y-1.5 transition-opacity ${!lineNotifyEnabled ? "opacity-40 pointer-events-none" : ""}`}>
                <Label className="text-sm font-semibold">User ID (ผู้รับแจ้งเตือน)</Label>
                <Input value={lineUserId} onChange={(e) => setLineUserId(e.target.value)} placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" className="border-green-200/60 focus:border-green-400" />
                <p className="text-[10px] sm:text-xs text-muted-foreground">ส่งข้อความหา LINE OA → ระบบจะตอบกลับ User ID อัตโนมัติ</p>
              </div>

              {/* Test Buttons */}
              <div className={`flex flex-col sm:flex-row gap-2 pt-2 transition-opacity ${!lineNotifyEnabled ? "opacity-40 pointer-events-none" : ""}`}>
                <Button variant="outline" onClick={handleTest} disabled={testing || !channelToken || !lineUserId} className="gap-2 border-green-200 text-green-700 hover:bg-green-50 rounded-xl">
                  {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  ทดสอบส่งข้อความ
                </Button>
                <Button variant="outline" onClick={handleSendDaily} disabled={sending || !channelToken || !lineUserId} className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 rounded-xl">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  ส่งสรุปยอดขายวันนี้
                </Button>
              </div>
            </div>
          </div>

          {/* Alert Settings Card */}
          <div className="rounded-2xl bg-white border border-blue-100/60 shadow-luxury overflow-hidden">
            <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-blue-100/60 bg-gradient-to-r from-blue-50/80 to-white">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold tracking-tight">ตั้งค่าการแจ้งเตือน</h2>
                <p className="text-xs text-muted-foreground">เปิด/ปิดการแจ้งเตือนสินค้าและคำสั่งซื้อผ่าน LINE</p>
              </div>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              {/* แจ้งเตือนสินค้าใกล้หมด */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-blue-100 bg-blue-50/30 transition-all hover:bg-blue-50/50">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold text-gray-700">แจ้งเตือนสินค้าใกล้หมด</Label>
                  <p className="text-[11px] text-muted-foreground">ส่งแจ้งเตือนเมื่อสินค้าในสต็อกต่ำกว่าที่กำหนด</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={lowStockAlertEnabled} onChange={(e) => setLowStockAlertEnabled(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                </label>
              </div>

              {/* จำนวนขั้นต่ำ */}
              <div className={`space-y-1.5 transition-opacity ${!lowStockAlertEnabled ? "opacity-50 pointer-events-none" : ""}`}>
                <Label className="text-sm font-semibold flex items-center gap-1.5 text-gray-700">จำนวนขั้นต่ำที่ต้องแจ้งเตือน</Label>
                <div className="relative">
                  <Input type="number" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(Number(e.target.value))} className="border-blue-200/60 focus:border-blue-400 pl-9" min="0" />
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400" />
                </div>
                <p className="text-[10px] text-muted-foreground">ระบบจะแสดงไอคอนเตือนเมื่อสินค้าเหลือเท่ากับหรือน้อยกว่าค่านี้</p>
              </div>

              {/* แจ้งเตือนสินค้าหมดสต๊อก */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-red-100 bg-red-50/30 transition-all hover:bg-red-50/50">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold text-gray-700">แจ้งเตือนสินค้าหมดสต๊อก</Label>
                  <p className="text-[11px] text-muted-foreground">ส่งแจ้งเตือนผ่าน LINE เมื่อสินค้าหมดสต๊อก (เหลือ 0)</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={outOfStockAlertEnabled} onChange={(e) => setOutOfStockAlertEnabled(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                </label>
              </div>

              {/* แจ้งเตือนคำสั่งซื้อใหม่ */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-blue-100 bg-blue-50/30 transition-all hover:bg-blue-50/50">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold text-gray-700">แจ้งเตือนคำสั่งซื้อใหม่</Label>
                  <p className="text-[11px] text-muted-foreground">ส่งแจ้งเตือนผ่าน LINE เมื่อมีการขายสินค้าสำเร็จ</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={newSaleAlertEnabled} onChange={(e) => setNewSaleAlertEnabled(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Notification Preferences Card */}
          <div className="rounded-2xl bg-white border border-blue-100/60 shadow-luxury overflow-hidden">
            <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-blue-100/60 bg-gradient-to-r from-blue-50/80 to-white">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold tracking-tight">ตั้งค่าข้อมูลที่จะส่ง</h2>
                <p className="text-xs text-muted-foreground">เลือกข้อมูลที่ต้องการแสดงในแจ้งเตือน</p>
              </div>
            </div>
            <div className="p-4 sm:p-6 space-y-5">
              {/* Per-sale */}
              <div className="space-y-3">
                <p className="text-sm font-bold flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-100 text-blue-600 text-xs font-bold">1</span>
                  แจ้งเตือนเมื่อขายสินค้า (แต่ละบิล)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-blue-100 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer text-sm transition-all">
                    <Checkbox checked={saleShowProducts} onCheckedChange={(v) => setSaleShowProducts(!!v)} className="border-blue-300 data-[state=checked]:bg-blue-500" />
                    <Package className="h-3.5 w-3.5 text-blue-400" /> ชื่อสินค้า
                  </label>
                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-blue-100 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer text-sm transition-all">
                    <Checkbox checked={saleShowQuantity} onCheckedChange={(v) => setSaleShowQuantity(!!v)} className="border-blue-300 data-[state=checked]:bg-blue-500" />
                    <span className="text-blue-400 text-xs font-bold">x</span> จำนวน
                  </label>
                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-blue-100 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer text-sm transition-all">
                    <Checkbox checked={saleShowPrice} onCheckedChange={(v) => setSaleShowPrice(!!v)} className="border-blue-300 data-[state=checked]:bg-blue-500" />
                    <span className="text-blue-400 text-xs font-bold">฿</span> ราคา
                  </label>
                </div>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

              {/* Daily report */}
              <div className="space-y-3">
                <p className="text-sm font-bold flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-100 text-blue-600 text-xs font-bold">2</span>
                  รายงานสรุปยอดขายรายวัน
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-blue-100 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer text-sm transition-all">
                    <Checkbox checked={showSales} onCheckedChange={(v) => setShowSales(!!v)} className="border-blue-300 data-[state=checked]:bg-blue-500" />
                    <span className="text-blue-400 text-xs font-bold">฿</span> ยอดขายรวม
                  </label>
                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-blue-100 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer text-sm transition-all">
                    <Checkbox checked={showQuantity} onCheckedChange={(v) => setShowQuantity(!!v)} className="border-blue-300 data-[state=checked]:bg-blue-500" />
                    <FileText className="h-3.5 w-3.5 text-blue-400" /> จำนวนบิล
                  </label>
                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-blue-100 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer text-sm transition-all">
                    <Checkbox checked={showProducts} onCheckedChange={(v) => setShowProducts(!!v)} className="border-blue-300 data-[state=checked]:bg-blue-500" />
                    <Package className="h-3.5 w-3.5 text-blue-400" /> ชื่อสินค้า
                  </label>
                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-blue-100 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer text-sm transition-all">
                    <Checkbox checked={showModel} onCheckedChange={(v) => setShowModel(!!v)} className="border-blue-300 data-[state=checked]:bg-blue-500" />
                    <Package className="h-3.5 w-3.5 text-blue-400" /> ชื่อรุ่น (ยี่ห้อ/รุ่น)
                  </label>
                </div>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

              {/* Auto schedule */}
              <div className="space-y-3">
                <p className="text-sm font-bold flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-100 text-purple-600 text-xs font-bold">3</span>
                  ส่งรายงานอัตโนมัติ
                </p>
                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-purple-100 hover:border-purple-300 hover:bg-purple-50/50 cursor-pointer text-sm transition-all w-fit">
                  <Checkbox checked={autoSend} onCheckedChange={(v) => setAutoSend(!!v)} className="border-purple-300 data-[state=checked]:bg-purple-500" />
                  <Clock className="h-3.5 w-3.5 text-purple-400" /> เปิดใช้งานส่งอัตโนมัติ
                </label>
                {autoSend && (
                  <div className="space-y-2 ml-1">
                    {reportTimes.map((time, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-purple-500 font-semibold w-14">เวลา {i + 1}</span>
                        <Input type="time" value={time} onChange={(e) => { const u = [...reportTimes]; u[i] = e.target.value; setReportTimes(u); }} className="w-28 h-9 border-purple-200 text-sm" />
                        <span className="text-xs text-muted-foreground">น.</span>
                        {reportTimes.length > 1 && (
                          <button onClick={() => setReportTimes(reportTimes.filter((_, j) => j !== i))} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors">
                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button onClick={() => setReportTimes([...reportTimes, "18:00"])} className="flex items-center gap-1.5 text-xs font-semibold text-purple-600 hover:text-purple-700 px-3 py-2 rounded-lg border border-dashed border-purple-200 hover:bg-purple-50 transition-all">
                      <Plus className="h-3 w-3" /> เพิ่มเวลาส่ง
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      
      {/* ========== Save Button (Sticky) ========== */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-72 z-20 p-3 sm:p-4 bg-gradient-to-t from-white via-white/95 to-white/0 pointer-events-none">
        <div className="max-w-4xl mx-auto pointer-events-auto">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 rounded-xl gradient-blue px-6 py-3.5 text-sm sm:text-base font-semibold text-white shadow-luxury hover:shadow-luxury-lg transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่าทั้งหมด"}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  getSmsTemplates, createSmsTemplate, updateSmsTemplate, deleteSmsTemplate,
  getSmsReminders, createSmsReminder, updateSmsReminder, deleteSmsReminder, getCustomers,
} from "@/app/actions";
import { Plus, Pencil, Trash2, X, MessageSquare, Clock, CheckCircle2, XCircle, Search, FileText, Smartphone, Calendar, User, Send, Loader2, Phone } from "lucide-react";

export default function SmsRemindersPage() {
  const [tab, setTab] = useState<"reminders" | "templates">("reminders");
  // Templates
  const [templates, setTemplates] = useState<any[]>([]);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editTemplateId, setEditTemplateId] = useState<number | null>(null);
  const [tForm, setTForm] = useState({ name: "", message: "", durationDays: 30 });
  // Reminders
  const [reminders, setReminders] = useState<any[]>([]);
  const [reminderFilter, setReminderFilter] = useState<"all" | "pending" | "sent">("pending");
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [editReminderId, setEditReminderId] = useState<number | null>(null);
  const [rForm, setRForm] = useState({ customerName: "", phone: "", message: "", productInfo: "", scheduledDate: "", templateId: 0 });
  // Customers
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { loadReminders(); }, [reminderFilter]);

  async function loadAll() {
    const [t, c] = await Promise.all([getSmsTemplates(), getCustomers()]);
    setTemplates(t);
    setCustomers(c);
    loadReminders();
  }

  async function loadReminders() {
    const r = await getSmsReminders(reminderFilter === "all" ? undefined : reminderFilter);
    setReminders(r);
  }

  // Template handlers
  function resetTemplateForm() { setTForm({ name: "", message: "", durationDays: 30 }); setEditTemplateId(null); setShowTemplateForm(false); }

  async function handleTemplateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editTemplateId) {
      await updateSmsTemplate(editTemplateId, tForm);
    } else {
      await createSmsTemplate(tForm);
    }
    resetTemplateForm();
    setTemplates(await getSmsTemplates());
  }

  function startEditTemplate(t: any) {
    setTForm({ name: t.name, message: t.message, durationDays: t.durationDays });
    setEditTemplateId(t.id);
    setShowTemplateForm(true);
  }

  async function handleDeleteTemplate(id: number) {
    if (!confirm("ลบเทมเพลตนี้?")) return;
    await deleteSmsTemplate(id);
    setTemplates(await getSmsTemplates());
  }

  async function handleToggleTemplate(id: number, active: boolean) {
    await updateSmsTemplate(id, { active: !active });
    setTemplates(await getSmsTemplates());
  }

  // Reminder handlers
  function resetReminderForm() { setRForm({ customerName: "", phone: "", message: "", productInfo: "", scheduledDate: "", templateId: 0 }); setEditReminderId(null); setShowReminderForm(false); }

  function selectCustomer(c: any) {
    setRForm({ ...rForm, customerName: c.name, phone: c.phone || "" });
    setCustomerSearch("");
  }

  function applyTemplate(templateId: number) {
    const t = templates.find(tpl => tpl.id === templateId);
    if (!t) return;
    let msg = t.message;
    msg = msg.replace(/\{\{name\}\}/g, rForm.customerName || "ลูกค้า");
    msg = msg.replace(/\{\{phone\}\}/g, rForm.phone || "");
    msg = msg.replace(/\{\{product\}\}/g, rForm.productInfo || "บริการ");
    msg = msg.replace(/\{\{shopPhone\}\}/g, "");
    // Set scheduled date based on template duration
    const d = new Date();
    d.setDate(d.getDate() + t.durationDays);
    setRForm({ ...rForm, message: msg, templateId, scheduledDate: d.toISOString().split("T")[0] });
  }

  async function handleReminderSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editReminderId) {
      await updateSmsReminder(editReminderId, { phone: rForm.phone, message: rForm.message, productInfo: rForm.productInfo, scheduledDate: rForm.scheduledDate });
    } else {
      await createSmsReminder({ customerName: rForm.customerName, phone: rForm.phone, message: rForm.message, productInfo: rForm.productInfo, scheduledDate: rForm.scheduledDate, templateId: rForm.templateId || undefined });
    }
    resetReminderForm();
    loadReminders();
  }

  function startEditReminder(r: any) {
    setRForm({
      customerName: r.customerName || "", phone: r.phone, message: r.message,
      productInfo: r.productInfo || "", scheduledDate: r.scheduledDate ? new Date(r.scheduledDate).toISOString().split("T")[0] : "",
      templateId: r.templateId || 0,
    });
    setEditReminderId(r.id);
    setShowReminderForm(true);
  }

  async function handleDeleteReminder(id: number) {
    if (!confirm("ลบการแจ้งเตือนนี้?")) return;
    await deleteSmsReminder(id);
    loadReminders();
  }

  async function handleCancelReminder(id: number) {
    await updateSmsReminder(id, { status: "cancelled" });
    loadReminders();
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "pending": return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300"><Clock className="h-3 w-3 mr-1" /> รอส่ง</Badge>;
      case "sent": return <Badge className="bg-green-100 text-green-800 border-green-300"><CheckCircle2 className="h-3 w-3 mr-1" /> ส่งแล้ว</Badge>;
      case "failed": return <Badge className="bg-red-100 text-red-800 border-red-300"><XCircle className="h-3 w-3 mr-1" /> ล้มเหลว</Badge>;
      case "cancelled": return <Badge className="bg-gray-100 text-gray-600 border-gray-300"><X className="h-3 w-3 mr-1" /> ยกเลิก</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  }

  const filteredCustomers = customerSearch ? customers.filter((c: any) => c.name.includes(customerSearch) || (c.phone && c.phone.includes(customerSearch))).slice(0, 5) : [];

  
  return (
    <div className="p-2 sm:p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 text-blue-600"><Smartphone className="h-5 sm:h-6 w-5 sm:w-6" /> SMS แจ้งเตือนลูกค้า</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 bg-white/80 backdrop-blur-sm rounded-xl p-1.5 border border-blue-100/60 shadow-sm overflow-x-auto">
        <button onClick={() => setTab("reminders")} className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex-1 justify-center ${tab === "reminders" ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}>
          <MessageSquare className="h-4 w-4" /> <span className="hidden sm:inline">แจ้งเตือนลูกค้า</span><span className="sm:hidden">ลูกค้า</span>
        </button>
        <button onClick={() => setTab("templates")} className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex-1 justify-center ${tab === "templates" ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}>
          <FileText className="h-4 w-4" /> <span className="hidden sm:inline">เทมเพลต</span><span className="sm:hidden">เทมเพลต</span>
        </button>
      </div>

      {/* ==================== Templates Tab ==================== */}
      {tab === "templates" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">จัดการเทมเพลตข้อความ SMS สำหรับแจ้งเตือนลูกค้า</p>
            <Button onClick={() => { resetTemplateForm(); setShowTemplateForm(true); }} className="gap-2 rounded-xl gradient-blue text-white"><Plus className="h-4 w-4" /> เพิ่มเทมเพลต</Button>
          </div>

          {showTemplateForm && (
            <form onSubmit={handleTemplateSubmit} className="rounded-xl border-2 border-blue-200 bg-blue-50/30 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-blue-700">{editTemplateId ? "แก้ไขเทมเพลต" : "เพิ่มเทมเพลตใหม่"}</h3>
                <button type="button" onClick={resetTemplateForm}><X className="h-4 w-4 text-gray-400" /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>ชื่อเทมเพลต *</Label>
                  <Input value={tForm.name} onChange={(e) => setTForm({ ...tForm, name: e.target.value })} placeholder="เช่น แจ้งเตือนต่อสัญญา 30 วัน" required />
                </div>
                <div>
                  <Label>ระยะเวลาล่วงหน้า (วัน) *</Label>
                  <div className="flex gap-2 items-center">
                    <Input type="number" min={1} value={tForm.durationDays} onChange={(e) => setTForm({ ...tForm, durationDays: parseInt(e.target.value) || 1 })} className="w-24" required />
                    <span className="text-xs text-muted-foreground">วัน</span>
                    <div className="flex gap-1 ml-2">
                      {[7, 14, 30, 60, 90].map((m) => (
                        <button key={m} type="button" onClick={() => setTForm({ ...tForm, durationDays: m })} className={`text-xs px-2 py-1 rounded-lg border transition-all ${tForm.durationDays === m ? "bg-blue-500 text-white border-blue-500" : "bg-white border-gray-200 hover:border-blue-300"}`}>{m}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <Label>ข้อความ SMS *</Label>
                <textarea className="w-full rounded-lg border border-gray-200 p-3 text-sm focus:border-blue-400 outline-none" rows={4} value={tForm.message} onChange={(e) => setTForm({ ...tForm, message: e.target.value })} placeholder="สวัสดีครับ คุณ{{name}} สัญญาบริการ {{product}} ใกล้หมดอายุแล้ว..." required />
                <p className="text-[10px] text-muted-foreground mt-1">ตัวแปรที่ใช้ได้: {"{{name}}"} = ชื่อลูกค้า, {"{{product}}"} = สินค้า, {"{{phone}}"} = เบอร์โทร, {"{{shopPhone}}"} = เบอร์ร้าน, {"{{date}}"} = วันที่แจ้งเตือน</p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetTemplateForm} className="rounded-xl">ยกเลิก</Button>
                <Button type="submit" className="rounded-xl gradient-blue text-white">{editTemplateId ? "บันทึก" : "เพิ่ม"}</Button>
              </div>
            </form>
          )}

          {/* Mobile Card View - Templates */}
          <div className="sm:hidden space-y-3">
            {templates.map((t) => (
              <div key={t.id} className="rounded-2xl bg-white border border-blue-100/60 shadow-sm overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-gray-800 truncate">{t.name}</h3>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-[10px]">{t.durationDays} วัน</Badge>
                        <button onClick={() => handleToggleTemplate(t.id, t.active)} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${t.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {t.active ? "เปิดใช้" : "ปิด"}
                        </button>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2">{t.message}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center border-t border-blue-100/60 divide-x divide-blue-100/60">
                  <button onClick={() => startEditTemplate(t)} className="flex-1 flex items-center justify-center gap-1.5 h-10 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors">
                    <Pencil className="h-3.5 w-3.5" /> แก้ไข
                  </button>
                  <button onClick={() => handleDeleteTemplate(t.id)} className="flex items-center justify-center h-10 w-12 text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {templates.length === 0 && (
              <div className="text-center text-muted-foreground py-8 bg-white rounded-2xl border border-blue-100/60">ยังไม่มีเทมเพลต</div>
            )}
          </div>

          {/* Desktop Table View - Templates */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow><TableHead>ชื่อเทมเพลต</TableHead><TableHead>ระยะเวลา</TableHead><TableHead className="hidden md:table-cell">ข้อความ</TableHead><TableHead>สถานะ</TableHead><TableHead className="text-right">จัดการ</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-semibold">{t.name}</TableCell>
                    <TableCell><Badge className="bg-blue-100 text-blue-800 border-blue-300">{t.durationDays} วัน</Badge></TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-xs truncate">{t.message}</TableCell>
                    <TableCell>
                      <button onClick={() => handleToggleTemplate(t.id, t.active)} className={`text-xs px-2 py-1 rounded-full font-medium ${t.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {t.active ? "เปิดใช้" : "ปิด"}
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" onClick={() => startEditTemplate(t)} className="h-8 w-8"><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDeleteTemplate(t.id)} className="h-8 w-8 text-red-500 hover:text-red-700"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {templates.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">ยังไม่มีเทมเพลต</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ==================== Reminders Tab ==================== */}
      {tab === "reminders" && (
        <div className="space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <div className="flex gap-2">
              {(["pending", "sent", "all"] as const).map((f) => (
                <button key={f} onClick={() => setReminderFilter(f)} className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${reminderFilter === f ? "bg-blue-500 text-white border-blue-500" : "bg-white border-gray-200 hover:border-blue-300"}`}>
                  {f === "pending" ? "รอส่ง" : f === "sent" ? "ส่งแล้ว" : "ทั้งหมด"}
                </button>
              ))}
            </div>
            <Button onClick={() => { resetReminderForm(); setShowReminderForm(true); }} className="gap-2 rounded-xl gradient-blue text-white"><Plus className="h-4 w-4" /> เพิ่มการแจ้งเตือน</Button>
          </div>

          {showReminderForm && (
            <form onSubmit={handleReminderSubmit} className="rounded-xl border-2 border-blue-200 bg-blue-50/30 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-blue-700">{editReminderId ? "แก้ไขการแจ้งเตือน" : "เพิ่มการแจ้งเตือนใหม่"}</h3>
                <button type="button" onClick={resetReminderForm}><X className="h-4 w-4 text-gray-400" /></button>
              </div>

              {/* Customer Search */}
              {!editReminderId && (
                <div className="relative">
                  <Label className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> ค้นหาลูกค้า</Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-2.5 top-2 h-4 w-4 text-gray-400" />
                    <Input className="pl-8" value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="พิมพ์ชื่อหรือเบอร์โทรลูกค้า..." />
                  </div>
                  {filteredCustomers.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-40 overflow-auto">
                      {filteredCustomers.map((c: any) => (
                        <button key={c.id} type="button" onClick={() => selectCustomer(c)} className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 border-b last:border-0 flex justify-between">
                          <span className="font-medium">{c.name}</span>
                          <span className="text-muted-foreground">{c.phone || "ไม่มีเบอร์"}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>ชื่อลูกค้า</Label>
                  <Input value={rForm.customerName} onChange={(e) => setRForm({ ...rForm, customerName: e.target.value })} placeholder="ชื่อลูกค้า" />
                </div>
                <div>
                  <Label>เบอร์โทรลูกค้า *</Label>
                  <Input value={rForm.phone} onChange={(e) => setRForm({ ...rForm, phone: e.target.value })} placeholder="0xx-xxx-xxxx" required />
                </div>
                <div>
                  <Label>สินค้า/รุ่น</Label>
                  <Input value={rForm.productInfo} onChange={(e) => setRForm({ ...rForm, productInfo: e.target.value })} placeholder="เช่น แพ็กเกจ SEO 6 เดือน" />
                </div>
                <div>
                  <Label className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> วันที่แจ้งเตือน *</Label>
                  <Input type="date" value={rForm.scheduledDate} onChange={(e) => setRForm({ ...rForm, scheduledDate: e.target.value })} required />
                  {/* Preset buttons */}
                  <div className="flex gap-1 mt-1.5">
                    {[{ label: "7 วัน", m: 7 }, { label: "14 วัน", m: 14 }, { label: "30 วัน", m: 30 }, { label: "60 วัน", m: 60 }, { label: "90 วัน", m: 90 }].map(({ label, m }) => {
                      const d = new Date(); d.setDate(d.getDate() + m);
                      return <button key={m} type="button" onClick={() => setRForm({ ...rForm, scheduledDate: d.toISOString().split("T")[0] })} className="text-[10px] px-2 py-0.5 rounded border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all">{label}</button>;
                    })}
                  </div>
                </div>
              </div>

              {/* Template selection */}
              {templates.filter(t => t.active).length > 0 && (
                <div>
                  <Label>ใช้เทมเพลต</Label>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {templates.filter(t => t.active).map((t) => (
                      <button key={t.id} type="button" onClick={() => applyTemplate(t.id)} className="text-xs px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all">
                        {t.name} ({t.durationDays} วัน)
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label>ข้อความ SMS *</Label>
                <textarea className="w-full rounded-lg border border-gray-200 p-3 text-sm focus:border-blue-400 outline-none" rows={4} value={rForm.message} onChange={(e) => setRForm({ ...rForm, message: e.target.value })} placeholder="พิมพ์ข้อความ SMS ที่จะส่งให้ลูกค้า..." required />
                <p className="text-[10px] text-muted-foreground mt-1">ข้อความนี้จะถูกส่งเมื่อถึงวันที่กำหนด (แก้ไขได้ตลอด)</p>
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetReminderForm} className="rounded-xl">ยกเลิก</Button>
                <Button type="submit" className="rounded-xl gradient-blue text-white">{editReminderId ? "บันทึก" : "เพิ่มการแจ้งเตือน"}</Button>
              </div>
            </form>
          )}

          {/* Mobile Card View - Reminders */}
          <div className="sm:hidden space-y-3">
            {reminders.map((r) => {
              const isOverdue = r.status === "pending" && new Date(r.scheduledDate) <= new Date();
              return (
                <div key={r.id} className={`rounded-2xl bg-white border shadow-sm overflow-hidden ${isOverdue ? "border-red-200 bg-red-50/30" : "border-blue-100/60"}`}>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-gray-800 truncate">{r.customerName || "-"}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> {r.phone}</span>
                        </div>
                        {r.productInfo && <p className="text-[11px] text-muted-foreground mt-1 truncate">{r.productInfo}</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        {getStatusBadge(r.status)}
                        <div className={`text-[11px] font-semibold mt-1 ${isOverdue ? "text-red-600" : "text-muted-foreground"}`}>
                          {new Date(r.scheduledDate).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" })}
                        </div>
                        {isOverdue && <span className="text-[10px] text-red-500 font-medium">เลยกำหนด!</span>}
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2 bg-gray-50 rounded-lg p-2">{r.message}</p>
                  </div>
                  <div className="flex items-center border-t border-blue-100/60 divide-x divide-blue-100/60">
                    {r.status === "pending" && (
                      <>
                        <button onClick={() => startEditReminder(r)} className="flex-1 flex items-center justify-center gap-1.5 h-10 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors">
                          <Pencil className="h-3.5 w-3.5" /> แก้ไข
                        </button>
                        <button onClick={() => handleCancelReminder(r.id)} className="flex-1 flex items-center justify-center gap-1.5 h-10 text-xs font-semibold text-yellow-600 hover:bg-yellow-50 transition-colors">
                          <XCircle className="h-3.5 w-3.5" /> ยกเลิก
                        </button>
                      </>
                    )}
                    <button onClick={() => handleDeleteReminder(r.id)} className="flex items-center justify-center h-10 w-12 text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
            {reminders.length === 0 && (
              <div className="text-center text-muted-foreground py-8 bg-white rounded-2xl border border-blue-100/60">ยังไม่มีรายการแจ้งเตือน</div>
            )}
          </div>

          {/* Desktop Table View - Reminders */}
          <div className="hidden sm:block rounded-xl border border-blue-100 overflow-hidden overflow-x-auto">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow className="bg-blue-50/50">
                  <TableHead>ลูกค้า</TableHead>
                  <TableHead>เบอร์โทร</TableHead>
                  <TableHead className="hidden md:table-cell">สินค้า</TableHead>
                  <TableHead>วันที่แจ้งเตือน</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="hidden lg:table-cell">ข้อความ</TableHead>
                  <TableHead className="text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reminders.map((r) => {
                  const isOverdue = r.status === "pending" && new Date(r.scheduledDate) <= new Date();
                  return (
                    <TableRow key={r.id} className={isOverdue ? "bg-red-50/50" : ""}>
                      <TableCell className="font-medium text-sm">{r.customerName || "-"}</TableCell>
                      <TableCell className="text-sm">{r.phone}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{r.productInfo || "-"}</TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <div className={`font-semibold ${isOverdue ? "text-red-600" : ""}`}>{new Date(r.scheduledDate).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" })}</div>
                          {isOverdue && <span className="text-[10px] text-red-500 font-medium">เลยกำหนด!</span>}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(r.status)}</TableCell>
                      <TableCell className="hidden lg:table-cell text-[11px] text-muted-foreground max-w-[200px] truncate">{r.message}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          {r.status === "pending" && (
                            <>
                              <Button size="icon" variant="ghost" onClick={() => startEditReminder(r)} className="h-8 w-8" title="แก้ไข"><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button size="icon" variant="ghost" onClick={() => handleCancelReminder(r.id)} className="h-8 w-8 text-yellow-600" title="ยกเลิก"><XCircle className="h-3.5 w-3.5" /></Button>
                            </>
                          )}
                          <Button size="icon" variant="ghost" onClick={() => handleDeleteReminder(r.id)} className="h-8 w-8 text-red-500 hover:text-red-700" title="ลบ"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {reminders.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">ยังไม่มีรายการแจ้งเตือน</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-800">
            <strong>หมายเหตุ:</strong> SMS จะถูกส่งอัตโนมัติเมื่อถึงวันที่กำหนด (ต้องเชื่อมต่อ SMS Provider ก่อน) สามารถแก้ไขข้อความได้ก่อนวันส่ง
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getEmployees, createEmployee, updateEmployee, deleteEmployee, getJobApplications, createJobApplication, updateJobApplication, deleteJobApplication } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, X, UserCog, Upload, Image as ImageIcon, Phone, MapPin, CreditCard, Eye, MessageCircle, Users, Shield, Briefcase, Calendar, ChevronDown, ChevronUp, Clock, CheckCircle2, XCircle } from "lucide-react";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [viewEmp, setViewEmp] = useState<any>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const emptyForm = { name: "", username: "", password: "", role: "cashier" as "admin" | "cashier" | "service", phone: "", address: "", profileImage: "", idCardImage: "", lineUserId: "" };
  const [form, setForm] = useState(emptyForm);

  // Job Applications
  const [jobApps, setJobApps] = useState<any[]>([]);
  const [showJobSection, setShowJobSection] = useState(false);
  const [showJobForm, setShowJobForm] = useState(false);
  const [editJobId, setEditJobId] = useState<number | null>(null);
  const emptyJobForm = { name: "", phone: "", position: "", note: "", appliedAt: new Date().toISOString().split("T")[0] };
  const [jobForm, setJobForm] = useState(emptyJobForm);

  useEffect(() => { load(); loadJobApps(); }, []);

  async function load() {
    setEmployees(await getEmployees());
  }

  async function loadJobApps() {
    setJobApps(await getJobApplications());
  }

  function resetJobForm() {
    setJobForm({ name: "", phone: "", position: "", note: "", appliedAt: new Date().toISOString().split("T")[0] });
    setEditJobId(null);
    setShowJobForm(false);
  }

  function startEditJob(app: any) {
    setJobForm({
      name: app.name, phone: app.phone || "", position: app.position || "",
      note: app.note || "", appliedAt: app.appliedAt ? new Date(app.appliedAt).toISOString().split("T")[0] : "",
    });
    setEditJobId(app.id);
    setShowJobForm(true);
  }

  async function handleJobSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editJobId) {
      await updateJobApplication(editJobId, { name: jobForm.name, phone: jobForm.phone, position: jobForm.position, note: jobForm.note });
    } else {
      await createJobApplication({ name: jobForm.name, phone: jobForm.phone, position: jobForm.position, note: jobForm.note, appliedAt: jobForm.appliedAt });
    }
    resetJobForm();
    loadJobApps();
  }

  async function handleDeleteJob(id: number) {
    if (!confirm("ลบข้อมูลผู้สมัครนี้?")) return;
    await deleteJobApplication(id);
    loadJobApps();
  }

  async function handleJobStatus(id: number, status: string) {
    await updateJobApplication(id, { status });
    loadJobApps();
  }

  function getJobStatusBadge(status: string) {
    switch (status) {
      case "pending": return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 text-[10px]"><Clock className="h-3 w-3 mr-1" /> รอสัมภาษณ์</Badge>;
      case "reviewing": return <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-[10px]"><Eye className="h-3 w-3 mr-1" /> พิจารณา</Badge>;
      case "interviewed": return <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-[10px]"><Eye className="h-3 w-3 mr-1" /> สัมภาษณ์แล้ว</Badge>;
      case "accepted": return <Badge className="bg-green-100 text-green-800 border-green-300 text-[10px]"><CheckCircle2 className="h-3 w-3 mr-1" /> รับแล้ว</Badge>;
      case "rejected": return <Badge className="bg-red-100 text-red-800 border-red-300 text-[10px]"><XCircle className="h-3 w-3 mr-1" /> ไม่รับ</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  }

  function resetForm() {
    setForm(emptyForm);
    setEditId(null);
    setShowForm(false);
  }

  function startEdit(emp: any) {
    setForm({
      name: emp.name, username: emp.username, password: "", role: emp.role,
      phone: emp.phone || "", address: emp.address || "",
      profileImage: emp.profileImage || "", idCardImage: emp.idCardImage || "",
      lineUserId: emp.lineUserId || "",
    });
    setEditId(emp.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleImageUpload(field: "profileImage" | "idCardImage") {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setUploading(field);
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folder", "arinyadapos/employees");
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (data.secureUrl) {
          setForm(prev => ({ ...prev, [field]: data.secureUrl }));
        } else {
          alert(data.error || "อัพโหลดล้มเหลว");
        }
      } catch {
        alert("เกิดข้อผิดพลาดในการอัพโหลด");
      } finally {
        setUploading(null);
      }
    };
    input.click();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editId) {
      const data: any = {
        name: form.name, username: form.username, role: form.role,
        phone: form.phone, address: form.address,
        profileImage: form.profileImage, idCardImage: form.idCardImage,
        lineUserId: form.lineUserId,
      };
      if (form.password) data.password = form.password;
      await updateEmployee(editId, data);
    } else {
      await createEmployee(form);
    }
    resetForm();
    load();
  }

  async function handleDelete(id: number) {
    if (!confirm("ยืนยันการลบพนักงาน?")) return;
    await deleteEmployee(id);
    load();
  }

  function getRoleLabel(role: string) {
    if (role === "admin") return "ผู้ดูแลระบบ";
    if (role === "service") return "พนักงานบริการ";
    return "พนักงานขาย";
  }

  function getRoleBadgeClass(role: string) {
    if (role === "admin") return "bg-blue-50 text-blue-700 border border-blue-200";
    if (role === "service") return "bg-blue-50 text-blue-700 border border-blue-200";
    return "bg-amber-50 text-amber-700 border border-amber-200";
  }

  function getRoleIcon(role: string) {
    if (role === "admin") return <Shield className="h-3 w-3" />;
    if (role === "service") return <UserCog className="h-3 w-3" />;
    return <Users className="h-3 w-3" />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-md">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">จัดการพนักงาน</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">{employees.length} คน</p>
          </div>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 rounded-xl gradient-blue px-4 py-2.5 text-sm font-semibold text-white shadow-luxury hover:shadow-luxury-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] w-fit">
          <Plus className="h-4 w-4" /> เพิ่มพนักงาน
        </button>
      </div>

      {/* Employee Form */}
      {showForm && (
        <div className="rounded-2xl bg-white border border-blue-100/60 shadow-luxury overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-blue-100/60 bg-gradient-to-r from-blue-50/80 to-white">
            <h2 className="text-base sm:text-lg font-bold tracking-tight">{editId ? "แก้ไขพนักงาน" : "เพิ่มพนักงานใหม่"}</h2>
            <button onClick={resetForm} className="rounded-lg p-1.5 hover:bg-blue-100 transition-colors"><X className="h-4 w-4 text-muted-foreground" /></button>
          </div>
          <div className="p-4 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Basic Info */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><UserCog className="h-4 w-4 text-blue-500" /> ข้อมูลพื้นฐาน</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs sm:text-sm">ชื่อพนักงาน *</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="h-10" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs sm:text-sm">ชื่อผู้ใช้ *</Label>
                    <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required className="h-10" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs sm:text-sm">{editId ? "รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)" : "รหัสผ่าน *"}</Label>
                    <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editId} className="h-10" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs sm:text-sm">ตำแหน่ง</Label>
                    <select className="w-full h-10 rounded-xl border border-blue-200/60 bg-blue-50/30 px-3 text-sm focus:border-blue-400 outline-none transition-all" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "admin" | "cashier" | "service" })}>
                      <option value="cashier">พนักงานขาย</option>
                      <option value="service">พนักงานบริการ</option>
                      <option value="admin">ผู้ดูแลระบบ</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><Phone className="h-4 w-4 text-blue-500" /> ข้อมูลติดต่อ</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs sm:text-sm">เบอร์โทรศัพท์</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0xx-xxx-xxxx" className="h-10" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs sm:text-sm">ที่อยู่</Label>
                    <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="ที่อยู่พนักงาน" className="h-10" />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="flex items-center gap-1.5 text-xs sm:text-sm"><MessageCircle className="h-3.5 w-3.5 text-green-600" /> LINE User ID</Label>
                    <Input value={form.lineUserId} onChange={(e) => setForm({ ...form, lineUserId: e.target.value })} placeholder="Uxxxxxxxxxxxx" className="h-10" />
                    <p className="text-[10px] text-muted-foreground">ใช้สำหรับส่งข้อมูลการขายให้พนักงานผ่าน LINE</p>
                  </div>
                </div>
              </div>

              {/* Document Images */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><CreditCard className="h-4 w-4 text-blue-500" /> เอกสารและรูปภาพ</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Profile Image */}
                  <div>
                    <Label className="text-xs sm:text-sm">รูปโปรไฟล์</Label>
                    <div className="mt-1.5 flex items-center gap-3">
                      {form.profileImage ? (
                        <div className="relative group">
                          <img src={form.profileImage} alt="Profile" className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl object-cover border-2 border-blue-200 shadow-md" />
                          <button type="button" onClick={() => setForm({ ...form, profileImage: "" })} className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-3 w-3" /></button>
                        </div>
                      ) : (
                        <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl border-2 border-dashed border-blue-200 flex items-center justify-center bg-blue-50/30">
                          <ImageIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-300" />
                        </div>
                      )}
                      <button type="button" onClick={() => handleImageUpload("profileImage")} disabled={uploading === "profileImage"} className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-white px-2.5 py-2 text-[11px] sm:text-xs font-semibold text-blue-700 hover:bg-blue-50 transition-all disabled:opacity-50">
                        <Upload className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        {uploading === "profileImage" ? "อัพโหลด..." : "อัพโหลดรูป"}
                      </button>
                    </div>
                  </div>
                  {/* ID Card Image */}
                  <div>
                    <Label className="text-xs sm:text-sm">รูปบัตรประชาชน</Label>
                    <div className="mt-1.5 flex items-center gap-3">
                      {form.idCardImage ? (
                        <div className="relative group">
                          <img src={form.idCardImage} alt="ID Card" className="h-16 w-24 sm:h-20 sm:w-32 rounded-xl object-cover border-2 border-blue-200 shadow-md" />
                          <button type="button" onClick={() => setForm({ ...form, idCardImage: "" })} className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-3 w-3" /></button>
                        </div>
                      ) : (
                        <div className="h-16 w-24 sm:h-20 sm:w-32 rounded-xl border-2 border-dashed border-blue-200 flex items-center justify-center bg-blue-50/30">
                          <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-blue-300" />
                        </div>
                      )}
                      <button type="button" onClick={() => handleImageUpload("idCardImage")} disabled={uploading === "idCardImage"} className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-white px-2.5 py-2 text-[11px] sm:text-xs font-semibold text-blue-700 hover:bg-blue-50 transition-all disabled:opacity-50">
                        <Upload className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        {uploading === "idCardImage" ? "อัพโหลด..." : "อัพโหลดรูป"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {form.role === "service" && (
                <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-700">
                  <strong>หมายเหตุ:</strong> พนักงานบริการจะสามารถดูข้อมูลหน้า POS ได้เท่านั้น ไม่สามารถแก้ไข เพิ่ม หรือลบข้อมูลใดๆ ในระบบได้
                </div>
              )}

              <div className="flex gap-2">
                <button type="submit" className="rounded-xl gradient-blue px-5 sm:px-6 py-2.5 text-sm font-semibold text-white shadow-luxury hover:shadow-luxury-lg transition-all">{editId ? "บันทึกการแก้ไข" : "เพิ่มพนักงาน"}</button>
                <button type="button" onClick={resetForm} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-all">ยกเลิก</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Employee Detail Modal */}
      {viewEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setViewEmp(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-blue-100 overflow-hidden max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-blue-100 bg-gradient-to-r from-blue-50/80 to-white sticky top-0">
              <h2 className="text-base sm:text-lg font-bold">ข้อมูลพนักงาน</h2>
              <button onClick={() => setViewEmp(null)} className="rounded-lg p-1.5 hover:bg-blue-100 transition-colors"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div className="flex items-center gap-4">
                {viewEmp.profileImage ? (
                  <img src={viewEmp.profileImage} alt="Profile" className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl object-cover border-2 border-blue-200 shadow-md" />
                ) : (
                  <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-lg sm:text-xl font-bold shadow-md">{viewEmp.name?.charAt(0)}</div>
                )}
                <div>
                  <div className="text-base sm:text-lg font-bold text-gray-800">{viewEmp.name}</div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${getRoleBadgeClass(viewEmp.role)}`}>{getRoleIcon(viewEmp.role)} {getRoleLabel(viewEmp.role)}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:gap-3 text-sm">
                <div className="rounded-xl bg-gray-50 p-2.5 sm:p-3"><div className="text-[10px] sm:text-xs text-gray-400 mb-0.5">ชื่อผู้ใช้</div><div className="font-semibold text-xs sm:text-sm">{viewEmp.username}</div></div>
                <div className="rounded-xl bg-gray-50 p-2.5 sm:p-3"><div className="text-[10px] sm:text-xs text-gray-400 mb-0.5">เบอร์โทร</div><div className="font-semibold text-xs sm:text-sm">{viewEmp.phone || "-"}</div></div>
                <div className="rounded-xl bg-gray-50 p-2.5 sm:p-3 col-span-2"><div className="text-[10px] sm:text-xs text-gray-400 mb-0.5">ที่อยู่</div><div className="font-semibold text-xs sm:text-sm">{viewEmp.address || "-"}</div></div>
                <div className="rounded-xl bg-gray-50 p-2.5 sm:p-3 col-span-2"><div className="text-[10px] sm:text-xs text-gray-400 mb-0.5 flex items-center gap-1"><MessageCircle className="h-3 w-3 text-green-600" /> LINE User ID</div><div className="font-semibold text-xs sm:text-sm">{viewEmp.lineUserId || <span className="text-red-400 text-xs">ยังไม่ได้ตั้งค่า</span>}</div></div>
              </div>
              {viewEmp.idCardImage && (
                <div>
                  <div className="text-xs text-gray-400 mb-2 flex items-center gap-1"><CreditCard className="h-3.5 w-3.5" /> รูปบัตรประชาชน</div>
                  <img src={viewEmp.idCardImage} alt="ID Card" className="w-full max-h-48 rounded-xl object-contain border border-blue-200 bg-gray-50" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Employee Cards (Mobile) */}
      <div className="grid grid-cols-1 gap-3 sm:hidden">
        {employees.map((emp: any) => (
          <div key={emp.id} className="rounded-2xl bg-white border border-blue-100/60 shadow-sm p-4 hover:shadow-md transition-all">
            <div className="flex items-start gap-3">
              {/* Avatar */}
              {emp.profileImage ? (
                <img src={emp.profileImage} alt="" className="h-12 w-12 rounded-xl object-cover border border-blue-200 flex-shrink-0" />
              ) : (
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white text-base font-bold flex-shrink-0">{emp.name?.charAt(0)}</div>
              )}
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-gray-800 truncate">{emp.name}</h3>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium flex-shrink-0 ${emp.active ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${emp.active ? "bg-emerald-500" : "bg-red-500"}`} />
                    {emp.active ? "ใช้งาน" : "ปิด"}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${getRoleBadgeClass(emp.role)}`}>
                    {getRoleIcon(emp.role)} {getRoleLabel(emp.role)}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="truncate">@{emp.username}</span>
                  {emp.phone && <span className="flex items-center gap-0.5"><Phone className="h-3 w-3" /> {emp.phone}</span>}
                </div>
                {emp.lineUserId && (
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-green-600">
                    <MessageCircle className="h-3 w-3" /> LINE เชื่อมต่อแล้ว
                  </div>
                )}
              </div>
            </div>
            {/* Actions */}
            <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-100">
              <button onClick={() => setViewEmp(emp)} className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg bg-blue-50 text-blue-600 text-xs font-semibold hover:bg-blue-100 transition-colors">
                <Eye className="h-3.5 w-3.5" /> ดูข้อมูล
              </button>
              <button onClick={() => startEdit(emp)} className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg bg-blue-50 text-blue-600 text-xs font-semibold hover:bg-blue-100 transition-colors">
                <Pencil className="h-3.5 w-3.5" /> แก้ไข
              </button>
              <button onClick={() => handleDelete(emp.id)} className="flex items-center justify-center h-9 w-9 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors flex-shrink-0">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
        {employees.length === 0 && (
          <div className="text-center text-muted-foreground py-12 bg-white rounded-2xl border border-blue-100/60">
            <UserCog className="h-8 w-8 mx-auto mb-2 text-blue-200" />
            ยังไม่มีพนักงาน
          </div>
        )}
      </div>

      {/* Employee Table (Desktop) */}
      <div className="hidden sm:block rounded-2xl bg-white border border-blue-100/60 shadow-luxury overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-blue-50/50 hover:bg-blue-50/50">
                <TableHead className="font-semibold">พนักงาน</TableHead>
                <TableHead className="font-semibold">ชื่อผู้ใช้</TableHead>
                <TableHead className="font-semibold hidden md:table-cell">เบอร์โทร</TableHead>
                <TableHead className="font-semibold">ตำแหน่ง</TableHead>
                <TableHead className="font-semibold">สถานะ</TableHead>
                <TableHead className="w-28"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((emp: any) => (
                <TableRow key={emp.id} className="hover:bg-blue-50/30">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {emp.profileImage ? (
                        <img src={emp.profileImage} alt="" className="h-9 w-9 rounded-xl object-cover border border-blue-200" />
                      ) : (
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white text-sm font-bold">{emp.name?.charAt(0)}</div>
                      )}
                      <div>
                        <span className="font-semibold text-sm">{emp.name}</span>
                        {emp.lineUserId && <div className="flex items-center gap-1 text-[10px] text-green-600"><MessageCircle className="h-2.5 w-2.5" /> LINE</div>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{emp.username}</TableCell>
                  <TableCell className="text-muted-foreground text-sm hidden md:table-cell">{emp.phone || "-"}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${getRoleBadgeClass(emp.role)}`}>
                      {getRoleIcon(emp.role)} {getRoleLabel(emp.role)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${emp.active ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${emp.active ? "bg-emerald-500" : "bg-red-500"}`} />
                      {emp.active ? "ใช้งาน" : "ปิดใช้งาน"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => setViewEmp(emp)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-blue-50 transition-colors" title="ดูข้อมูล"><Eye className="h-4 w-4 text-blue-500" /></button>
                      <button onClick={() => startEdit(emp)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-blue-50 transition-colors" title="แก้ไข"><Pencil className="h-4 w-4 text-muted-foreground" /></button>
                      <button onClick={() => handleDelete(emp.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-red-50 transition-colors" title="ลบ"><Trash2 className="h-4 w-4 text-red-400" /></button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {employees.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-12"><UserCog className="h-8 w-8 mx-auto mb-2 text-blue-200" />ยังไม่มีพนักงาน</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ==================== Job Applications Section ==================== */}
      <div className="rounded-2xl bg-white border border-purple-100/60 shadow-luxury overflow-hidden">
        <button
          onClick={() => setShowJobSection(!showJobSection)}
          className="w-full flex items-center justify-between px-4 sm:px-6 py-4 border-b border-purple-100/60 bg-gradient-to-r from-purple-50/80 to-white hover:bg-purple-50/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-sm">
              <Briefcase className="h-5 w-5 text-white" />
            </div>
            <div className="text-left">
              <h2 className="text-base sm:text-lg font-bold tracking-tight">ผู้สมัครงาน</h2>
              <p className="text-xs text-muted-foreground">{jobApps.length} คน — บันทึกข้อมูลคนมาสมัครงาน</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {jobApps.filter(a => a.status === "pending").length > 0 && (
              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 text-[10px]">
                {jobApps.filter(a => a.status === "pending").length} รอสัมภาษณ์
              </Badge>
            )}
            {showJobSection ? <ChevronUp className="h-5 w-5 text-purple-400" /> : <ChevronDown className="h-5 w-5 text-purple-400" />}
          </div>
        </button>

        {showJobSection && (
          <div className="p-4 sm:p-6 space-y-4">
            {/* Add button */}
            <div className="flex justify-end">
              <button onClick={() => { resetJobForm(); setShowJobForm(true); }} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all active:scale-[0.98]">
                <Plus className="h-4 w-4" /> เพิ่มผู้สมัคร
              </button>
            </div>

            {/* Job Application Form */}
            {showJobForm && (
              <form onSubmit={handleJobSubmit} className="rounded-xl border-2 border-purple-200 bg-purple-50/30 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-purple-700">{editJobId ? "แก้ไขข้อมูลผู้สมัคร" : "เพิ่มผู้สมัครงานใหม่"}</h3>
                  <button type="button" onClick={resetJobForm}><X className="h-4 w-4 text-gray-400" /></button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs sm:text-sm">ชื่อ-นามสกุล *</Label>
                    <Input value={jobForm.name} onChange={(e) => setJobForm({ ...jobForm, name: e.target.value })} placeholder="ชื่อผู้สมัคร" required className="h-10" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs sm:text-sm">เบอร์โทร</Label>
                    <Input value={jobForm.phone} onChange={(e) => setJobForm({ ...jobForm, phone: e.target.value })} placeholder="0xx-xxx-xxxx" className="h-10" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs sm:text-sm">ตำแหน่งที่สมัคร</Label>
                    <select
                      className="w-full h-10 rounded-xl border border-purple-200/60 bg-purple-50/30 px-3 text-sm focus:border-purple-400 outline-none transition-all"
                      value={jobForm.position}
                      onChange={(e) => setJobForm({ ...jobForm, position: e.target.value })}
                    >
                      <option value="">-- เลือกตำแหน่ง --</option>
                      <option value="พนักงานขาย">พนักงานขาย</option>
                      <option value="พนักงานบริการ">พนักงานบริการ</option>
                      <option value="ช่างซ่อม">ช่างซ่อม</option>
                      <option value="อื่นๆ">อื่นๆ</option>
                    </select>
                  </div>
                  {!editJobId && (
                    <div className="space-y-1">
                      <Label className="text-xs sm:text-sm flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-purple-500" /> วันที่สมัคร</Label>
                      <Input type="date" value={jobForm.appliedAt} onChange={(e) => setJobForm({ ...jobForm, appliedAt: e.target.value })} className="h-10" />
                    </div>
                  )}
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-xs sm:text-sm">หมายเหตุ</Label>
                    <Input value={jobForm.note} onChange={(e) => setJobForm({ ...jobForm, note: e.target.value })} placeholder="เช่น มีประสบการณ์ทำงานร้านแบตเตอรี่ 2 ปี" className="h-10" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md">{editJobId ? "บันทึก" : "เพิ่มผู้สมัคร"}</button>
                  <button type="button" onClick={resetJobForm} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50">ยกเลิก</button>
                </div>
              </form>
            )}

            {/* Job Applications List */}
            {jobApps.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Briefcase className="h-8 w-8 mx-auto mb-2 text-purple-200" />
                ยังไม่มีข้อมูลผู้สมัครงาน
              </div>
            ) : (
              <div className="space-y-3">
                {jobApps.map((app) => (
                  <div key={app.id} className={`rounded-xl border p-4 transition-all ${app.status === "accepted" ? "border-green-200 bg-green-50/20" : app.status === "rejected" ? "border-red-100 bg-red-50/10 opacity-60" : app.status === "reviewing" ? "border-purple-200 bg-purple-50/20" : "border-purple-100 bg-white hover:border-purple-200"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-gray-800">{app.name}</h3>
                          {getJobStatusBadge(app.status)}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                          {app.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {app.phone}</span>}
                          {app.position && <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> {app.position}</span>}
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(app.appliedAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}</span>
                        </div>
                        {app.note && <p className="text-[11px] text-muted-foreground mt-1.5 bg-gray-50 rounded-lg px-2.5 py-1.5">{app.note}</p>}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {app.status === "pending" && (
                          <>
                            <button onClick={() => handleJobStatus(app.id, "reviewing")} className="h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center rounded-lg hover:bg-purple-50 transition-colors" title="พิจารณา"><Eye className="h-3.5 w-3.5 text-purple-500" /></button>
                            <button onClick={() => handleJobStatus(app.id, "interviewed")} className="h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center rounded-lg hover:bg-blue-50 transition-colors" title="สัมภาษณ์แล้ว"><Eye className="h-3.5 w-3.5 text-blue-500" /></button>
                            <button onClick={() => handleJobStatus(app.id, "accepted")} className="h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center rounded-lg hover:bg-green-50 transition-colors" title="รับ"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /></button>
                            <button onClick={() => handleJobStatus(app.id, "rejected")} className="h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors" title="ไม่รับ"><XCircle className="h-3.5 w-3.5 text-red-400" /></button>
                          </>
                        )}
                        {app.status === "reviewing" && (
                          <>
                            <button onClick={() => handleJobStatus(app.id, "interviewed")} className="h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center rounded-lg hover:bg-blue-50 transition-colors" title="สัมภาษณ์แล้ว"><Eye className="h-3.5 w-3.5 text-blue-500" /></button>
                            <button onClick={() => handleJobStatus(app.id, "accepted")} className="h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center rounded-lg hover:bg-green-50 transition-colors" title="รับ"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /></button>
                            <button onClick={() => handleJobStatus(app.id, "rejected")} className="h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors" title="ไม่รับ"><XCircle className="h-3.5 w-3.5 text-red-400" /></button>
                          </>
                        )}
                        {app.status === "interviewed" && (
                          <>
                            <button onClick={() => handleJobStatus(app.id, "accepted")} className="h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center rounded-lg hover:bg-green-50 transition-colors" title="รับ"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /></button>
                            <button onClick={() => handleJobStatus(app.id, "rejected")} className="h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors" title="ไม่รับ"><XCircle className="h-3.5 w-3.5 text-red-400" /></button>
                          </>
                        )}
                        <button onClick={() => startEditJob(app)} className="h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center rounded-lg hover:bg-blue-50 transition-colors" title="แก้ไข"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
                        <button onClick={() => handleDeleteJob(app.id)} className="h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors" title="ลบ"><Trash2 className="h-3.5 w-3.5 text-red-400" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getContracts, createContract, updateContract, deleteContract, getCustomers, getProducts, getEmployees } from "@/app/actions";
import { formatCurrency } from "@/lib/utils";
import { Plus, Pencil, Trash2, X, Briefcase, Search } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  active: "กำลังใช้งาน",
  expired: "หมดอายุ",
  cancelled: "ยกเลิก",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  expired: "bg-amber-100 text-amber-700 border-amber-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

export default function ContractsPage() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState({
    customerId: "",
    productId: "",
    employeeId: "",
    startDate: "",
    endDate: "",
    monthlyFee: "",
    status: "active",
    autoRenew: false,
    note: "",
  });

  useEffect(() => { load(); }, []);

  async function load() {
    const [c, cust, prod, emp] = await Promise.all([
      getContracts(),
      getCustomers(),
      getProducts(),
      getEmployees(),
    ]);
    setContracts(c);
    setCustomers(cust);
    setProducts(prod);
    setEmployees(emp);
  }

  function resetForm() {
    setForm({ customerId: "", productId: "", employeeId: "", startDate: "", endDate: "", monthlyFee: "", status: "active", autoRenew: false, note: "" });
    setEditId(null);
    setShowForm(false);
  }

  function startEdit(c: any) {
    setForm({
      customerId: String(c.customerId || ""),
      productId: c.productId ? String(c.productId) : "",
      employeeId: String(c.employeeId || ""),
      startDate: c.startDate ? new Date(c.startDate).toISOString().slice(0, 10) : "",
      endDate: c.endDate ? new Date(c.endDate).toISOString().slice(0, 10) : "",
      monthlyFee: c.monthlyFee || "",
      status: c.status || "active",
      autoRenew: c.autoRenew ?? false,
      note: c.note || "",
    });
    setEditId(c.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = {
      customerId: Number(form.customerId),
      productId: form.productId ? Number(form.productId) : null,
      employeeId: Number(form.employeeId),
      startDate: form.startDate,
      endDate: form.endDate,
      monthlyFee: form.monthlyFee,
      status: form.status,
      autoRenew: form.autoRenew,
      note: form.note,
    };
    if (editId) {
      await updateContract(editId, data);
    } else {
      await createContract(data);
    }
    resetForm();
    load();
  }

  async function handleDelete(id: number) {
    if (!confirm("ยืนยันการลบสัญญา?")) return;
    await deleteContract(id);
    load();
  }

  const filtered = contracts.filter((c: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const custName = c.customers?.name || "";
    const contractNum = c.contracts?.contractNumber || "";
    return (
      contractNum.toLowerCase().includes(q) ||
      custName.toLowerCase().includes(q) ||
      (c.contracts?.status || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Briefcase className="h-7 w-7 text-blue-600" />
            จัดการสัญญา
          </h1>
          <p className="text-sm text-gray-500 mt-1">สัญญาการให้บริการรับจ้างทำการตลาด</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gradient-blue text-white shadow-lg">
          <Plus className="h-4 w-4 mr-1" /> เพิ่มสัญญา
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="ค้นหาสัญญา, ลูกค้า..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Form Modal */}
      {showForm && (
        <Card className="border-blue-200 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{editId ? "แก้ไขสัญญา" : "เพิ่มสัญญาใหม่"}</CardTitle>
            <button onClick={resetForm} className="p-1 rounded-lg hover:bg-gray-100"><X className="h-5 w-5" /></button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>ลูกค้า *</Label>
                <select className="w-full mt-1 rounded-lg border border-gray-300 px-3 py-2" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} required>
                  <option value="">เลือกลูกค้า</option>
                  {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name} {c.companyName ? `(${c.companyName})` : ""}</option>)}
                </select>
              </div>
              <div>
                <Label>แพ็กเกจบริการ</Label>
                <select className="w-full mt-1 rounded-lg border border-gray-300 px-3 py-2" value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
                  <option value="">ไม่ระบุ</option>
                  {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <Label>พนักงานผู้รับผิดชอบ *</Label>
                <select className="w-full mt-1 rounded-lg border border-gray-300 px-3 py-2" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} required>
                  <option value="">เลือกพนักงาน</option>
                  {employees.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <Label>ค่าบริการรายเดือน (บาท) *</Label>
                <Input type="number" step="0.01" value={form.monthlyFee} onChange={(e) => setForm({ ...form, monthlyFee: e.target.value })} required />
              </div>
              <div>
                <Label>วันเริ่มสัญญา *</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
              </div>
              <div>
                <Label>วันสิ้นสุดสัญญา *</Label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
              </div>
              <div>
                <Label>สถานะ</Label>
                <select className="w-full mt-1 rounded-lg border border-gray-300 px-3 py-2" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="active">กำลังใช้งาน</option>
                  <option value="expired">หมดอายุ</option>
                  <option value="cancelled">ยกเลิก</option>
                </select>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input type="checkbox" id="autoRenew" checked={form.autoRenew} onChange={(e) => setForm({ ...form, autoRenew: e.target.checked })} className="h-4 w-4 rounded" />
                <Label htmlFor="autoRenew" className="cursor-pointer">ต่อสัญญาอัตโนมัติ</Label>
              </div>
              <div className="md:col-span-2">
                <Label>หมายเหตุ</Label>
                <textarea className="w-full mt-1 rounded-lg border border-gray-300 px-3 py-2" rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </div>
              <div className="md:col-span-2 flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>ยกเลิก</Button>
                <Button type="submit" className="gradient-blue text-white">บันทึก</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Contracts Table */}
      <Card className="shadow-lg">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-blue-50">
                <TableHead>เลขสัญญา</TableHead>
                <TableHead>ลูกค้า</TableHead>
                <TableHead>แพ็กเกจ</TableHead>
                <TableHead>พนักงาน</TableHead>
                <TableHead>วันเริ่ม</TableHead>
                <TableHead>วันสิ้นสุด</TableHead>
                <TableHead>ค่าบริการ/เดือน</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>ต่ออัตโนมัติ</TableHead>
                <TableHead className="text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-gray-400 py-8">ไม่มีสัญญา</TableCell>
                </TableRow>
              )}
              {filtered.map((c: any) => (
                <TableRow key={c.contracts.id} className="hover:bg-blue-50/50">
                  <TableCell className="font-mono text-sm">{c.contracts.contractNumber}</TableCell>
                  <TableCell className="font-medium">{c.customers?.name || "-"}{c.customers?.companyName ? ` (${c.customers.companyName})` : ""}</TableCell>
                  <TableCell>{c.products?.name || "-"}</TableCell>
                  <TableCell>{c.employees?.name || "-"}</TableCell>
                  <TableCell className="text-sm">{c.contracts.startDate ? new Date(c.contracts.startDate).toLocaleDateString("th-TH") : "-"}</TableCell>
                  <TableCell className="text-sm">{c.contracts.endDate ? new Date(c.contracts.endDate).toLocaleDateString("th-TH") : "-"}</TableCell>
                  <TableCell className="font-semibold text-blue-600">{formatCurrency(c.contracts.monthlyFee)}</TableCell>
                  <TableCell>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[c.contracts.status] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                      {STATUS_LABELS[c.contracts.status] || c.contracts.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">{c.contracts.autoRenew ? "✅" : "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => startEdit(c.contracts)} className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-600"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => handleDelete(c.contracts.id)} className="p-1.5 rounded-lg hover:bg-red-100 text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
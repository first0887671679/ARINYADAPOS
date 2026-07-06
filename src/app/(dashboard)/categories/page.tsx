"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCategories, createCategory, updateCategory, deleteCategory } from "@/app/actions";
import { Plus, Pencil, Trash2, X, FolderOpen } from "lucide-react";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setCategories(await getCategories());
  }

  function resetForm() {
    setName("");
    setDescription("");
    setEditId(null);
    setShowForm(false);
  }

  function startEdit(c: any) {
    setName(c.name);
    setDescription(c.description || "");
    setEditId(c.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editId) {
      await updateCategory(editId, name, description);
    } else {
      await createCategory(name, description);
    }
    resetForm();
    load();
  }

  async function handleDelete(id: number) {
    if (!confirm("ยืนยันการลบหมวดหมู่?")) return;
    const result = await deleteCategory(id);
    if (!result.success) {
      alert(result.error);
      return;
    }
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">จัดการหมวดหมู่</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">จัดกลุ่มหมวดหมู่สินค้า</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-xl gradient-blue px-4 py-2.5 text-sm font-semibold text-white shadow-luxury hover:shadow-luxury-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] w-fit"><Plus className="h-4 w-4" /> เพิ่มหมวดหมู่</button>
      </div>

      {showForm && (
        <div className="rounded-2xl bg-white border border-blue-100/60 shadow-luxury overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-blue-100/60 bg-gradient-to-r from-blue-50/80 to-white">
            <h2 className="text-lg font-bold tracking-tight">{editId ? "แก้ไขหมวดหมู่" : "เพิ่มหมวดหมู่ใหม่"}</h2>
            <button onClick={resetForm} className="rounded-lg p-1.5 hover:bg-blue-100 transition-colors"><X className="h-4 w-4 text-muted-foreground" /></button>
          </div>
          <div className="p-6">
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 sm:items-end">
              <div className="flex-1">
                <Label>ชื่อหมวดหมู่ *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="flex-1">
                <Label>คำอธิบาย</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <button type="submit" className="rounded-xl gradient-blue px-6 py-2.5 text-sm font-semibold text-white shadow-luxury hover:shadow-luxury-lg transition-all w-full sm:w-auto">{editId ? "บันทึก" : "เพิ่ม"}</button>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Card View */}
      <div className="sm:hidden space-y-3">
        {categories.map((c: any) => (
          <div key={c.id} className="rounded-2xl bg-white border border-blue-100/60 shadow-sm p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 border border-blue-200 flex-shrink-0">
                  <FolderOpen className="h-5 w-5 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-gray-800 truncate">{c.name}</h3>
                  {c.description && <p className="text-xs text-muted-foreground truncate">{c.description}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => startEdit(c)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-blue-50 transition-colors"><Pencil className="h-4 w-4 text-blue-500" /></button>
                <button onClick={() => handleDelete(c.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-red-50 transition-colors"><Trash2 className="h-4 w-4 text-red-400" /></button>
              </div>
            </div>
          </div>
        ))}
        {categories.length === 0 && (
          <div className="text-center text-muted-foreground py-12 bg-white rounded-2xl border border-blue-100/60">
            <FolderOpen className="h-8 w-8 mx-auto mb-2 text-blue-200" />ยังไม่มีหมวดหมู่
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block rounded-2xl bg-white border border-blue-100/60 shadow-luxury overflow-hidden">
        <div className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-blue-50/50 hover:bg-blue-50/50">
                <TableHead className="font-semibold">ชื่อหมวดหมู่</TableHead>
                <TableHead className="font-semibold">คำอธิบาย</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((c: any) => (
                <TableRow key={c.id} className="hover:bg-blue-50/30">
                  <TableCell className="font-semibold">{c.name}</TableCell>
                  <TableCell>{c.description || "-"}</TableCell>
                  <TableCell className="text-right">
                    <button onClick={() => startEdit(c)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-blue-50 transition-colors"><Pencil className="h-4 w-4 text-muted-foreground" /></button>
                    <button onClick={() => handleDelete(c.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-red-50 transition-colors"><Trash2 className="h-4 w-4 text-red-400" /></button>
                  </TableCell>
                </TableRow>
              ))}
              {categories.length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-12"><FolderOpen className="h-8 w-8 mx-auto mb-2 text-blue-200" />ยังไม่มีหมวดหมู่</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

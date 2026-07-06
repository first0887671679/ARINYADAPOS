"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getProducts, getCategories, createProduct, updateProduct, deleteProduct, duplicateProduct, swapProductOrder, getStoreSettings, bulkDeleteProducts, bulkUpdateProductCategory } from "@/app/actions";
import { formatCurrency } from "@/lib/utils";
import { uploadToCloudinary, type CloudinaryUploadResult, type UploadProgress } from "@/lib/cloudinary";
import { Plus, Pencil, Trash2, X, Package, Image as ImageIcon, Upload, Star, Loader2, AlertTriangle, Filter, Download, CheckSquare, Square, Copy, ChevronUp, ChevronDown } from "lucide-react";
const loadExportExcel = () => import("@/lib/export-excel");

interface ProductImage {
  publicId: string;
  url: string;
  isMain?: boolean;
}

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const lowStockFilter = searchParams.get("lowStock") === "true";
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [filterLowStock, setFilterLowStock] = useState(lowStockFilter);
  const [lowStockThreshold, setLowStockThreshold] = useState(1);
  const [lowStockAlertEnabled, setLowStockAlertEnabled] = useState(true);
  const [form, setForm] = useState({
    name: "", categoryId: "", brand: "", model: "", size: "", batteryTerminal: "", weight: "",
    sellPrice: "", costPrice: "", stock: "0", warranty: "",
  });
  const [images, setImages] = useState<ProductImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Bulk operations
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [bulkCategoryId, setBulkCategoryId] = useState<string>("");
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [filterOutOfStock, setFilterOutOfStock] = useState(false);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (lowStockFilter) setFilterLowStock(true);
  }, [lowStockFilter]);

  async function load() {
    const [p, c, settings] = await Promise.all([getProducts(), getCategories(), getStoreSettings()]);
    setProducts(p);
    setCategories(c);
    setLowStockThreshold(settings.lowStockThreshold ?? 1);
    setLowStockAlertEnabled(settings.lowStockAlertEnabled ?? true);
  }

  function resetForm() {
    setForm({ name: "", categoryId: "", brand: "", model: "", size: "", batteryTerminal: "", weight: "", sellPrice: "", costPrice: "", stock: "0", warranty: "" });
    setImages([]);
    setUploadProgress(null);
    setEditId(null);
    setShowForm(false);
  }

  function startEdit(row: any) {
    const p = row.products || row;
    setForm({
      name: p.name, categoryId: p.categoryId?.toString() || "",
      brand: p.brand || "", model: p.model || "", size: p.size || "", batteryTerminal: p.batteryTerminal || "", weight: p.weight?.toString() || "",
      sellPrice: p.sellPrice, costPrice: p.costPrice,
      stock: p.stock.toString(), warranty: p.warranty || "",
    });
    // Load existing images
    if (p.images) {
      try {
        const parsed = JSON.parse(p.images);
        setImages(parsed.map((img: any) => ({ ...img, isMain: img.url === p.imageUrl })));
      } catch { setImages([]); }
    } else {
      setImages([]);
    }
    setEditId(p.id);
    setShowForm(true);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress({ loaded: 0, total: 100, percentage: 0 });

    const newImages: ProductImage[] = [];
    const totalFiles = files.length;
    let completedFiles = 0;

    for (const file of Array.from(files)) {
      try {
        const result = await uploadToCloudinary(file, (progress) => {
          const overallProgress = ((completedFiles / totalFiles) + (progress.percentage / 100 / totalFiles)) * 100;
          setUploadProgress({ loaded: progress.loaded, total: progress.total, percentage: Math.round(overallProgress) });
        });
        newImages.push({ publicId: result.publicId, url: result.secureUrl, isMain: images.length + newImages.length === 0 });
        completedFiles++;
      } catch (err: any) {
        console.error("Upload failed:", err);
        alert(`อัพโหลด ${file.name} ไม่สำเร็จ\n${err?.message || err}`);
      }
    }

    setImages([...images, ...newImages]);
    setUploading(false);
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function setMainImage(index: number) {
    setImages(images.map((img, i) => ({ ...img, isMain: i === index })));
  }

  function removeImage(index: number) {
    const newImages = images.filter((_, i) => i !== index);
    // If removed image was main, set first remaining as main
    if (images[index].isMain && newImages.length > 0) {
      newImages[0].isMain = true;
    }
    setImages(newImages);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const mainImage = images.find(img => img.isMain);
    const data = {
      name: form.name,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      brand: form.brand, model: form.model, size: form.size, batteryTerminal: form.batteryTerminal, weight: form.weight || null,
      sellPrice: form.sellPrice, costPrice: form.costPrice,
      stock: Number(form.stock), warranty: form.warranty,
      imageUrl: mainImage?.url || null,
      images: images.length > 0 ? JSON.stringify(images.map(({ publicId, url }) => ({ publicId, url }))) : null,
    };
    if (editId) {
      await updateProduct(editId, data);
    } else {
      await createProduct(data);
    }
    resetForm();
    load();
  }

  async function handleDelete(id: number) {
    if (!confirm("ยืนยันการลบสินค้า?")) return;
    const result = await deleteProduct(id);
    if (!result.success) {
      alert(result.error);
      return;
    }
    load();
  }

  function toggleSelect(id: number) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }

  function toggleSelectAll() {
    const displayProducts = getDisplayProducts();
    const allIds = displayProducts.map((row: any) => row.products?.id || row.id);
    if (selectedIds.length === allIds.length && allIds.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allIds);
    }
  }

  function getDisplayProducts() {
    let filtered = filterOutOfStock
      ? products.filter((row: any) => (row.products?.stock ?? row.stock) === 0)
      : filterLowStock && lowStockAlertEnabled
        ? products.filter((row: any) => (row.products?.stock ?? row.stock) <= lowStockThreshold)
        : products;
    if (categoryFilter) {
      filtered = filtered.filter((row: any) => {
        const p = row.products || row;
        return p.categoryId?.toString() === categoryFilter;
      });
    }
    return filtered;
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return;
    if (!confirm(`ยืนยันการลบสินค้า ${selectedIds.length} รายการ?`)) return;
    setBulkDeleting(true);
    try {
      const result = await bulkDeleteProducts(selectedIds);
      if (!result.success) {
        alert(result.error);
        return;
      }
      setSelectedIds([]);
      load();
    } finally {
      setBulkDeleting(false);
    }
  }

  async function handleBulkCategoryUpdate() {
    if (selectedIds.length === 0 || !bulkCategoryId) return;
    setBulkUpdating(true);
    try {
      await bulkUpdateProductCategory(selectedIds, bulkCategoryId ? parseInt(bulkCategoryId) : null);
      setSelectedIds([]);
      setBulkCategoryId("");
      load();
    } finally {
      setBulkUpdating(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">จัดการสินค้า</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">เพิ่ม แก้ไข และจัดการสินค้าทั้งหมด</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            className="h-10 rounded-xl border border-orange-200 bg-white px-3 text-sm focus:border-orange-400 outline-none"
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setSelectedIds([]); }}
          >
            <option value="">ทุกหมวดหมู่</option>
            {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button
            onClick={() => { setFilterLowStock(!filterLowStock); setFilterOutOfStock(false); }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              filterLowStock
                ? "bg-red-500 text-white shadow-luxury"
                : "bg-white border border-orange-200 text-orange-700 hover:bg-orange-50"
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            {filterLowStock ? "แสดงเฉพาะใกล้หมด" : "สินค้าใกล้หมด"}
          </button>
          <button
            onClick={() => { setFilterOutOfStock(!filterOutOfStock); setFilterLowStock(false); }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              filterOutOfStock
                ? "bg-red-700 text-white shadow-luxury"
                : "bg-white border border-red-200 text-red-700 hover:bg-red-50"
            }`}
          >
            <Package className="h-4 w-4" />
            {filterOutOfStock ? "แสดงเฉพาะหมดแล้ว" : "สินค้าหมด"}
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-xl gradient-orange px-4 py-2.5 text-sm font-semibold text-white shadow-luxury hover:shadow-luxury-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto justify-center"><Plus className="h-4 w-4" /> เพิ่มสินค้า</button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-2xl bg-white border border-orange-100/60 shadow-luxury overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-orange-100/60 bg-gradient-to-r from-orange-50/80 to-white">
            <h2 className="text-lg font-bold tracking-tight">{editId ? "แก้ไขสินค้า" : "เพิ่มสินค้าใหม่"}</h2>
            <button onClick={resetForm} className="rounded-lg p-1.5 hover:bg-orange-100 transition-colors"><X className="h-4 w-4 text-muted-foreground" /></button>
          </div>
          <div className="p-6">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div><Label>ชื่อสินค้า *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div>
                <Label>หมวดหมู่</Label>
                <select className="w-full rounded-xl border border-orange-200/60 bg-orange-50/30 p-2 text-sm focus:border-orange-400 outline-none transition-all" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                  <option value="">-- ไม่ระบุ --</option>
                  {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div><Label>ยี่ห้อ</Label><Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></div>
              <div><Label>รุ่น</Label><Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></div>
              <div><Label>ขนาด</Label><Input value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} placeholder="เช่น 60Ah, 80Ah" /></div>
              <div><Label>น้ำหนัก (kg)</Label><Input type="number" step="0.001" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} placeholder="เช่น 15.500" /></div>
              <div><Label>ราคาขาย *</Label><Input type="number" step="0.01" value={form.sellPrice} onChange={(e) => setForm({ ...form, sellPrice: e.target.value })} required /></div>
              <div><Label>ราคาทุน *</Label><Input type="number" step="0.01" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} required /></div>
              <div><Label>สต็อก</Label><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></div>
              <div><Label>การรับประกัน</Label><Input value={form.warranty} onChange={(e) => setForm({ ...form, warranty: e.target.value })} placeholder="เช่น 12 เดือน" /></div>

              {/* Image Upload Section */}
              <div className="md:col-span-3">
                <Label>รูปภาพสินค้า</Label>
                <div className="mt-2 space-y-3">
                  {/* Upload Button */}
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 rounded-xl border-2 border-dashed border-orange-200 bg-orange-50/30 px-4 py-2.5 cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-all">
                      {uploading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                          <span className="text-sm text-orange-600">กำลังอัพโหลด... {uploadProgress?.percentage}%</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 text-orange-500" />
                          <span className="text-sm text-orange-600">เลือกรูปภาพ</span>
                        </>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={uploading}
                      />
                    </label>
                    <span className="text-xs text-muted-foreground">รองรับหลายไฟล์, คลิกดาวเพื่อเลือกรูปหลัก</span>
                  </div>

                  {/* Progress Bar */}
                  {uploading && uploadProgress && (
                    <div className="w-full">
                      <div className="h-2 w-full rounded-full bg-orange-100 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all duration-300"
                          style={{ width: `${uploadProgress.percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{uploadProgress.percentage}% กำลังอัพโหลด...</p>
                    </div>
                  )}

                  {/* Image Preview Grid */}
                  {images.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {images.map((img, index) => (
                        <div key={img.publicId} className="relative group">
                          <div className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${img.isMain ? "border-orange-500 ring-2 ring-orange-200" : "border-orange-100"}`}>
                            <img src={img.url} alt={`Image ${index + 1}`} className="w-full h-full object-cover" />
                          </div>
                          {/* Actions */}
                          <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => setMainImage(index)}
                              className={`p-1 rounded-lg transition-colors ${img.isMain ? "bg-orange-500 text-white" : "bg-white/90 text-orange-500 hover:bg-orange-100"}`}
                              title="ตั้งเป็นรูปหลัก"
                            >
                              <Star className="h-3.5 w-3.5" fill={img.isMain ? "currentColor" : "none"} />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="p-1 rounded-lg bg-white/90 text-red-500 hover:bg-red-50 transition-colors"
                              title="ลบรูป"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {img.isMain && (
                            <div className="absolute bottom-1 left-1 right-1">
                              <span className="block text-center text-[10px] font-medium bg-orange-500 text-white rounded-md py-0.5">หลัก</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-3">
                <button type="submit" disabled={uploading} className="rounded-xl gradient-orange px-6 py-2.5 text-sm font-semibold text-white shadow-luxury hover:shadow-luxury-lg transition-all disabled:opacity-50">{editId ? "บันทึกการแก้ไข" : "เพิ่มสินค้า"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Card View */}
      <div className="sm:hidden space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-bold">สินค้า</span>
            <span className="text-xs text-muted-foreground">({getDisplayProducts().length})</span>
          </div>
          <Button variant="outline" size="sm" onClick={async () => {
            const rows = getDisplayProducts().map((row: any) => { const p = row.products || row; const cat = row.categories; return { "ชื่อสินค้า": p.name, "หมวดหมู่": cat?.name || "-", "ยี่ห้อ": p.brand || "-", "รุ่น": p.model || "-", "ราคาขาย": parseFloat(p.sellPrice), "สต็อก": p.stock }; });
            const { exportToExcel } = await loadExportExcel(); exportToExcel(rows, `รายการสินค้า_${new Date().toLocaleDateString("th-TH")}`, "สินค้า");
          }} className="h-7 text-[11px] border-orange-200 hover:bg-orange-50 text-orange-700 gap-1 rounded-lg">
            <Download className="h-3 w-3" /> Excel
          </Button>
        </div>
        {getDisplayProducts().map((row: any) => {
          const p = row.products || row;
          const cat = row.categories;
          const isLowStock = lowStockAlertEnabled && p.stock <= lowStockThreshold;
          const isOutOfStock = p.stock === 0;
          return (
            <div key={p.id} className={`rounded-2xl bg-white border shadow-sm overflow-hidden ${isOutOfStock ? "border-red-200 bg-red-50/30" : isLowStock ? "border-red-200/60" : "border-orange-100/60"}`}>
              <div className="p-3">
                <div className="flex items-start gap-3">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="h-14 w-14 rounded-xl object-cover border border-orange-100 flex-shrink-0" />
                  ) : (
                    <div className="h-14 w-14 rounded-xl bg-orange-50 flex items-center justify-center border border-orange-100 flex-shrink-0">
                      <ImageIcon className="h-6 w-6 text-orange-200" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-gray-800 truncate">{p.name}</h3>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs text-muted-foreground">
                      {cat?.name && <span className="px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 text-[10px]">{cat.name}</span>}
                      {(p.brand || p.model) && <span>{[p.brand, p.model].filter(Boolean).join(" ")}</span>}
                      {p.size && <span>{p.size}</span>}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-bold text-orange-600">{formatCurrency(parseFloat(p.sellPrice))}</span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${isOutOfStock ? "bg-red-600 text-white" : isLowStock ? "bg-red-50 text-red-700 border border-red-200" : "bg-orange-50 text-orange-700 border border-orange-200"}`}>
                        {(isOutOfStock || isLowStock) && <AlertTriangle className="h-3 w-3" />}
                        คงเหลือ {p.stock}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center border-t border-orange-100/60 divide-x divide-orange-100/60">
                <button onClick={() => startEdit(row)} className="flex-1 flex items-center justify-center gap-1.5 h-10 text-xs font-semibold text-orange-600 hover:bg-orange-50 transition-colors">
                  <Pencil className="h-3.5 w-3.5" /> แก้ไข
                </button>
                <button onClick={async () => { await duplicateProduct(p.id); load(); }} className="flex-1 flex items-center justify-center gap-1.5 h-10 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors">
                  <Copy className="h-3.5 w-3.5" /> คัดลอก
                </button>
                <button onClick={() => handleDelete(p.id)} className="flex items-center justify-center h-10 w-12 text-red-500 hover:bg-red-50 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
        {getDisplayProducts().length === 0 && (
          <div className="text-center text-muted-foreground py-12 bg-white rounded-2xl border border-orange-100/60">
            <Package className="h-8 w-8 mx-auto mb-2 text-orange-200" />ยังไม่มีสินค้า
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block rounded-2xl bg-white border border-orange-100/60 shadow-luxury overflow-hidden">
        <div className="px-3 sm:px-5 py-3 border-b border-orange-100/60 bg-gradient-to-r from-orange-50/80 to-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-bold">รายการสินค้า</span>
            <span className="text-xs text-muted-foreground">({getDisplayProducts().length} รายการ)</span>
            {selectedIds.length > 0 && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">เลือก {selectedIds.length} รายการ</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <>
                <select
                  className="h-7 rounded-lg border border-blue-200 bg-white px-2 text-xs focus:border-blue-400 outline-none"
                  value={bulkCategoryId}
                  onChange={(e) => setBulkCategoryId(e.target.value)}
                >
                  <option value="">เปลี่ยนหมวดหมู่...</option>
                  <option value="0">-- ไม่ระบุ --</option>
                  {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button
                  onClick={handleBulkCategoryUpdate}
                  disabled={!bulkCategoryId || bulkUpdating}
                  className="h-7 px-3 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                >
                  {bulkUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : null} เปลี่ยนหมวดหมู่
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting}
                  className="h-7 px-3 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
                >
                  {bulkDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />} ลบ ({selectedIds.length})
                </button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={async () => {
              const displayProducts = getDisplayProducts();
              const rows = displayProducts.map((row: any) => {
                const p = row.products || row;
                const cat = row.categories;
                return {
                  "ชื่อสินค้า": p.name,
                  "หมวดหมู่": cat?.name || "-",
                  "ยี่ห้อ": p.brand || "-",
                  "รุ่น": p.model || "-",
                  "ขนาด": p.size || "-",
                  "ขั้วแบตเตอรี่": p.batteryTerminal || "-",
                  "ราคาทุน": parseFloat(p.cost || "0"),
                  "ราคาขาย": parseFloat(p.price),
                  "สต็อก": p.stock,
                  "Barcode": p.barcode || "-",
                  "SKU": p.sku || "-",
                };
              });
              const { exportToExcel } = await loadExportExcel(); exportToExcel(rows, `รายการสินค้า_${new Date().toLocaleDateString("th-TH")}`, "สินค้า");
            }} className="h-7 text-[11px] border-orange-200 hover:bg-orange-50 text-orange-700 gap-1 rounded-lg">
              <Download className="h-3 w-3" /> ส่งออก Excel
            </Button>
          </div>
        </div>
        <div className="p-0 overflow-x-auto">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow className="bg-orange-50/50 hover:bg-orange-50/50">
                <TableHead className="w-10">
                  <button onClick={toggleSelectAll} className="p-1 hover:bg-orange-100 rounded">
                    {selectedIds.length === getDisplayProducts().length && getDisplayProducts().length > 0
                      ? <CheckSquare className="h-4 w-4 text-orange-600" />
                      : <Square className="h-4 w-4 text-gray-400" />}
                  </button>
                </TableHead>
                <TableHead className="font-semibold">ชื่อสินค้า</TableHead>
                <TableHead className="font-semibold">หมวดหมู่</TableHead>
                <TableHead className="font-semibold">ยี่ห้อ/รุ่น</TableHead>
                <TableHead className="font-semibold">ขนาด</TableHead>
                <TableHead className="text-right font-semibold">ราคาขาย</TableHead>
                <TableHead className="text-right font-semibold">สต็อก</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {getDisplayProducts().map((row: any, rowIdx: number, arr: any[]) => {
                const p = row.products || row;
                const cat = row.categories;
                const isLowStock = lowStockAlertEnabled && p.stock <= lowStockThreshold;
                const isOutOfStock = p.stock === 0;
                const isSelected = selectedIds.includes(p.id);
                return (
                  <TableRow key={p.id} className={`hover:bg-orange-50/30 ${isLowStock ? "bg-red-50/20" : ""} ${isOutOfStock ? "bg-red-100/40" : ""} ${isSelected ? "bg-blue-50/30" : ""}`}>
                    <TableCell>
                      <button onClick={() => toggleSelect(p.id)} className="p-1 hover:bg-orange-100 rounded">
                        {isSelected
                          ? <CheckSquare className="h-4 w-4 text-blue-600" />
                          : <Square className="h-4 w-4 text-gray-300" />}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="h-10 w-10 rounded-lg object-cover border border-orange-100" />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-orange-50 flex items-center justify-center border border-orange-100">
                            <ImageIcon className="h-5 w-5 text-orange-200" />
                          </div>
                        )}
                        <span className="font-semibold">{p.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{cat?.name || "-"}</TableCell>
                    <TableCell>{[p.brand, p.model].filter(Boolean).join(" ") || "-"}</TableCell>
                    <TableCell>{p.size || "-"}</TableCell>
                    <TableCell className="text-right font-semibold text-orange-700">{formatCurrency(parseFloat(p.sellPrice))}</TableCell>
                    <TableCell className="text-right">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${isOutOfStock ? "bg-red-600 text-white border border-red-700" : isLowStock ? "bg-red-50 text-red-700 border border-red-200" : "bg-orange-50 text-orange-700 border border-orange-200"}`}>
                        {isOutOfStock && <AlertTriangle className="h-3 w-3" />}
                        {isLowStock && !isOutOfStock && <AlertTriangle className="h-3 w-3" />}
                        {p.stock}
                      </span>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <button title="เลื่อนขึ้น" disabled={rowIdx === 0} onClick={async () => { const prev = (arr[rowIdx - 1].products || arr[rowIdx - 1]); await swapProductOrder(p.id, prev.id); load(); }} className="inline-flex h-7 w-7 items-center justify-center rounded-lg hover:bg-orange-50 transition-colors disabled:opacity-30"><ChevronUp className="h-4 w-4 text-muted-foreground" /></button>
                      <button title="เลื่อนลง" disabled={rowIdx === arr.length - 1} onClick={async () => { const next = (arr[rowIdx + 1].products || arr[rowIdx + 1]); await swapProductOrder(p.id, next.id); load(); }} className="inline-flex h-7 w-7 items-center justify-center rounded-lg hover:bg-orange-50 transition-colors disabled:opacity-30"><ChevronDown className="h-4 w-4 text-muted-foreground" /></button>
                      <button title="คัดลอกสินค้า" onClick={async () => { await duplicateProduct(p.id); load(); }} className="inline-flex h-7 w-7 items-center justify-center rounded-lg hover:bg-blue-50 transition-colors"><Copy className="h-4 w-4 text-blue-500" /></button>
                      <button title="แก้ไข" onClick={() => startEdit(row)} className="inline-flex h-7 w-7 items-center justify-center rounded-lg hover:bg-orange-50 transition-colors"><Pencil className="h-4 w-4 text-muted-foreground" /></button>
                      <button title="ลบ" onClick={() => handleDelete(p.id)} className="inline-flex h-7 w-7 items-center justify-center rounded-lg hover:bg-red-50 transition-colors"><Trash2 className="h-4 w-4 text-red-400" /></button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {getDisplayProducts().length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-12"><Package className="h-8 w-8 mx-auto mb-2 text-orange-200" />ยังไม่มีสินค้า</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

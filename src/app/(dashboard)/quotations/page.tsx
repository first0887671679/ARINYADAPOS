"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  getQuotations, getQuotationItems, createQuotation, updateQuotation, deleteQuotation,
  searchProducts, getCustomers, getSessionUser, getStoreSettings, createSale, bulkDeleteQuotations, markQuotationPrinted,
} from "@/app/actions";
import { formatCurrency } from "@/lib/utils";
import {
  Plus, Search, Trash2, Printer, Edit, Eye, ChevronDown, ChevronUp, FileText, X, Copy, Package, FolderOpen, Receipt, Download, CheckSquare, Square, Loader2, MessageCircle,
} from "lucide-react";
const loadExportExcel = () => import("@/lib/export-excel");

const statusMap: Record<string, { label: string; color: string }> = {
  draft: { label: "แบบร่าง", color: "bg-gray-100 text-gray-700" },
  sent: { label: "ส่งแล้ว", color: "bg-blue-100 text-blue-700" },
  accepted: { label: "ยอมรับ", color: "bg-green-100 text-green-700" },
  rejected: { label: "ปฏิเสธ", color: "bg-red-100 text-red-700" },
  expired: { label: "หมดอายุ", color: "bg-yellow-100 text-yellow-700" },
  converted: { label: "แปลงเป็นบิล", color: "bg-purple-100 text-purple-700" },
};

type FormItem = {
  productId?: number;
  description: string;
  quantity: number;
  unitPrice: string;
  discount: string;
};

export default function QuotationsPage() {
  const [list, setList] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [expandedItems, setExpandedItems] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [storeSettings, setStoreSettingsState] = useState<any>(null);
  // Bulk delete
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Form state
  const [form, setForm] = useState({
    customerId: "" as string,
    buyerName: "",
    buyerPhone: "",
    buyerAddress: "",
    buyerTaxId: "",
    serviceFee: "",
    serviceDescription: "",
    discount: "",
    vatType: "vat_out" as "vat_in" | "vat_out",
    taxRate: "7",
    includeVat: false,
    validDays: "30",
    note: "",
    status: "draft",
  });
  const [formItems, setFormItems] = useState<FormItem[]>([]);
  const [productQuery, setProductQuery] = useState("");
  const [productResults, setProductResults] = useState<any[]>([]);
  const [searchQ, setSearchQ] = useState("");
  // Product browser modal
  const [showProductBrowser, setShowProductBrowser] = useState(false);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [browserFilter, setBrowserFilter] = useState("");
  const [browserCategory, setBrowserCategory] = useState("");
  // LINE send
  const [sendingLineId, setSendingLineId] = useState<number | null>(null);
  // Convert to sale
  const [convertingId, setConvertingId] = useState<number | null>(null);
  const [convertedSale, setConvertedSale] = useState<any>(null);
  const [showConvertModal, setShowConvertModal] = useState(false);

  async function load() {
    const [q, u, c, s] = await Promise.all([getQuotations(), getSessionUser(), getCustomers(), getStoreSettings()]);
    setList(q);
    setUser(u);
    setCustomers(c);
    setStoreSettingsState(s);
  }

  async function openProductBrowser() {
    const { getProducts, getCategories } = await import("@/app/actions");
    const [p, cat] = await Promise.all([getProducts(), getCategories()]);
    setAllProducts(p);
    setAllCategories(cat);
    setShowProductBrowser(true);
  }

  useEffect(() => { load(); }, []);

  async function toggleExpand(id: number) {
    if (expandedId === id) { setExpandedId(null); return; }
    const items = await getQuotationItems(id);
    setExpandedItems(items);
    setExpandedId(id);
  }

  function resetForm() {
    setForm({ customerId: "", buyerName: "", buyerPhone: "", buyerAddress: "", buyerTaxId: "", serviceFee: "", serviceDescription: "", discount: "", vatType: "vat_out", taxRate: "7", includeVat: false, validDays: "30", note: "", status: "draft" });
    setFormItems([]);
    setProductQuery("");
    setProductResults([]);
    setEditId(null);
  }

  // Bulk delete functions
  function toggleSelect(id: number) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }

  function toggleSelectAll() {
    if (selectedIds.length === list.length && list.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(list.map((q: any) => q.quotations.id));
    }
  }

  async function handleDeleteQuotation(id: number) {
    if (!confirm("ยืนยันการลบใบเสนอราคา?")) return;
    const result = await deleteQuotation(id);
    if (!result.success) {
      alert(result.error);
      return;
    }
    load();
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return;
    if (!confirm(`ยืนยันการลบใบเสนอราคา ${selectedIds.length} รายการ?`)) return;
    setBulkDeleting(true);
    try {
      const result = await bulkDeleteQuotations(selectedIds);
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

  function openCreateModal() {
    resetForm();
    setShowModal(true);
  }

  async function openEditModal(q: any) {
    const qt = q.quotations;
    const items = await getQuotationItems(qt.id);
    setEditId(qt.id);
    setForm({
      customerId: qt.customerId ? String(qt.customerId) : "",
      buyerName: qt.buyerName || "",
      buyerPhone: qt.buyerPhone || "",
      buyerAddress: qt.buyerAddress || "",
      buyerTaxId: qt.buyerTaxId || "",
      serviceFee: parseFloat(qt.serviceFee) > 0 ? qt.serviceFee : "",
      serviceDescription: qt.serviceDescription || "",
      discount: parseFloat(qt.discount) > 0 ? qt.discount : "",
      vatType: qt.vatType || "vat_out",
      taxRate: qt.taxRate || "7",
      includeVat: qt.includeVat || false,
      validDays: String(qt.validDays || 30),
      note: qt.note || "",
      status: qt.status || "draft",
    });
    setFormItems(
      items.map((i: any) => ({
        productId: i.quotation_items.productId || undefined,
        description: i.quotation_items.description || i.products?.name || "",
        quantity: i.quotation_items.quantity,
        unitPrice: i.quotation_items.unitPrice,
        discount: parseFloat(i.quotation_items.discount) > 0 ? i.quotation_items.discount : "0",
      }))
    );
    setShowModal(true);
  }

  async function handleSearchProduct(q: string) {
    setProductQuery(q);
    if (q.length < 1) { setProductResults([]); return; }
    const res = await searchProducts(q);
    setProductResults(res);
  }

  function addProduct(p: any) {
    const prod = p.products || p;
    setFormItems(prev => [...prev, { productId: prod.id, description: prod.name, quantity: 1, unitPrice: prod.sellPrice, discount: "0" }]);
    setProductQuery("");
    setProductResults([]);
  }

  function addProductFromBrowser(p: any) {
    const prod = p.products || p;
    // Check if already added
    const exists = formItems.find(item => item.productId === prod.id);
    if (exists) {
      // Increase quantity instead
      setFormItems(prev => prev.map(item => item.productId === prod.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setFormItems(prev => [...prev, { productId: prod.id, description: prod.name, quantity: 1, unitPrice: prod.sellPrice, discount: "0" }]);
    }
  }

  function addCustomItem() {
    setFormItems(prev => [...prev, { description: "", quantity: 1, unitPrice: "0", discount: "0" }]);
  }

  function removeItem(idx: number) {
    setFormItems(prev => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof FormItem, value: any) {
    setFormItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  function getTotals() {
    let subtotal = 0;
    for (const item of formItems) {
      subtotal += parseFloat(item.unitPrice || "0") * item.quantity - parseFloat(item.discount || "0");
    }
    const sfee = parseFloat(form.serviceFee || "0");
    const disc = parseFloat(form.discount || "0");
    const rate = parseFloat(form.taxRate || "7");
    const base = subtotal + sfee - disc;
    let tax = 0;
    let total = base;
    if (form.includeVat) {
      if (form.vatType === "vat_in") {
        tax = base - (base / (1 + rate / 100));
      } else {
        tax = base * (rate / 100);
        total = base + tax;
      }
    }
    return { subtotal, sfee, disc, tax, total };
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    const payload = {
      customerId: form.customerId ? parseInt(form.customerId) : null,
      buyerName: form.buyerName,
      buyerPhone: form.buyerPhone,
      buyerAddress: form.buyerAddress,
      buyerTaxId: form.buyerTaxId,
      items: formItems.map(i => ({
        productId: i.productId,
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discount: i.discount || "0",
      })),
      serviceFee: form.serviceFee || "0",
      serviceDescription: form.serviceDescription,
      discount: form.discount || "0",
      vatType: form.vatType,
      taxRate: form.taxRate,
      includeVat: form.includeVat,
      validDays: parseInt(form.validDays) || 30,
      note: form.note,
      status: form.status,
    };

    if (editId) {
      await updateQuotation(editId, payload);
    } else {
      await createQuotation({ ...payload, employeeId: user.id });
    }
    setSaving(false);
    setShowModal(false);
    resetForm();
    load();
  }

  async function handleDelete(id: number) {
    if (!confirm("ต้องการลบใบเสนอราคานี้?")) return;
    await deleteQuotation(id);
    load();
  }

  async function handleConvertToSale(q: any) {
    if (!user) return;
    const qt = q.quotations;
    if (qt.status === "converted") {
      alert("ใบเสนอราคานี้ถูกแปลงเป็นบิลแล้ว");
      return;
    }
    if (!confirm("ยืนยันแปลงใบเสนอราคาเป็นใบเสร็จ?")) return;

    setConvertingId(qt.id);
    const items = await getQuotationItems(qt.id);

    const saleData = {
      employeeId: user.id,
      customerId: qt.customerId || null,
      items: items.map((i: any) => ({
        productId: i.quotation_items.productId,
        quantity: i.quotation_items.quantity,
        unitPrice: i.quotation_items.unitPrice,
        discount: i.quotation_items.discount || "0",
      })),
      serviceFee: qt.serviceFee || "0",
      serviceDescription: qt.serviceDescription || "",
      discount: qt.discount || "0",
      vatType: qt.vatType || "vat_out",
      taxRate: qt.taxRate || "7",
      isTaxInvoice: qt.includeVat || false,
      buyerName: qt.buyerName || "",
      buyerPhone: qt.buyerPhone || "",
      buyerAddress: qt.buyerAddress || "",
      buyerTaxId: qt.buyerTaxId || "",
      paymentMethod: "cash",
      note: qt.note || "",
    };

    const sale = await createSale(saleData);
    await updateQuotation(qt.id, { status: "converted" });

    setConvertedSale({ ...sale, items, quotationNumber: qt.quotationNumber });
    setShowConvertModal(true);
    setConvertingId(null);
    load();
  }

  function handlePrintReceipt() {
    if (!convertedSale) return;

    const store = storeSettings || {};
    const copyLabels = ["สำหรับลูกค้า", "สำหรับบริษัท", "สำหรับบัญชี"];

    let itemsHtml = "";
    convertedSale.items.forEach((item: any, idx: number) => {
      const it = item.quotation_items || item.sale_items || item;
      const pName = it.description || item.products?.name || "-";
      const lineTotal = parseFloat(it.unitPrice) * it.quantity - parseFloat(it.discount || "0");
      itemsHtml += `<tr><td style="padding:2px 0;font-size:10px">${idx + 1}</td><td style="padding:2px 0;font-size:10px">${pName}</td><td style="text-align:center;padding:2px 0;font-size:10px">${it.quantity}</td><td style="text-align:right;padding:2px 0;font-size:10px">${formatCurrency(parseFloat(it.unitPrice))}</td><td style="text-align:right;padding:2px 0;font-size:10px">${formatCurrency(lineTotal)}</td></tr>`;
    });

    if (parseFloat(convertedSale.serviceFee) > 0) {
      itemsHtml += `<tr style="color:#b45309"><td style="padding:2px 0;font-size:10px">${convertedSale.items.length + 1}</td><td style="padding:2px 0;font-size:10px">${convertedSale.serviceDescription || "ค่าบริการ"}</td><td style="text-align:center;padding:2px 0;font-size:10px">1</td><td style="text-align:right;padding:2px 0;font-size:10px">${formatCurrency(parseFloat(convertedSale.serviceFee))}</td><td style="text-align:right;padding:2px 0;font-size:10px">${formatCurrency(parseFloat(convertedSale.serviceFee))}</td></tr>`;
    }

    const payLabel = "เงินสด";

    function buildReceiptHtml(label: string, idx: number) {
      return `
        <div style="page-break-after:${idx < 2 ? "always" : "auto"};padding:8mm 10mm;font-family:Sarabun,sans-serif;font-size:12px;box-sizing:border-box;">
          <div style="text-align:right;font-size:11px;font-weight:bold;border-bottom:1px solid #999;padding-bottom:4px;margin-bottom:8px;">
            <span style="border:1px solid #666;padding:2px 8px;border-radius:4px;">${label}</span>
            <span style="margin-left:8px;color:#888;font-size:10px;">(${idx+1}/3)</span>
          </div>
          <div style="text-align:center;border-bottom:2px solid #2563eb;padding-bottom:12px;margin-bottom:12px;">
            <div style="font-size:18px;font-weight:bold;color:#2563eb;">${convertedSale.isTaxInvoice ? "ใบกำกับภาษี" : "ใบเสร็จรับเงิน"}</div>
            <div style="font-size:14px;font-weight:600;margin-top:4px;">${store.storeName || "บริษัทรับจ้างทำการตลาด"}</div>
            ${store.branchName ? `<div style="font-size:11px;color:#666;">${store.branchName}</div>` : ""}
            ${store.address ? `<div style="font-size:11px;color:#666;">ที่อยู่: ${store.address}</div>` : ""}
            ${store.phone ? `<div style="font-size:11px;color:#666;">โทร. ${store.phone}</div>` : ""}
            ${store.taxId ? `<div style="font-size:11px;color:#666;">เลขประจำตัวผู้เสียภาษี: ${store.taxId}</div>` : ""}
          </div>
          <div style="border-bottom:1px dashed #ccc;padding-bottom:8px;margin-bottom:8px;">
            <div style="display:flex;justify-content:space-between;"><span>เลขที่${convertedSale.isTaxInvoice ? "ใบกำกับภาษี" : "บิล"}:</span><span style="font-weight:600;">${convertedSale.isTaxInvoice ? convertedSale.taxInvoiceNumber : convertedSale.billNumber}</span></div>
            ${convertedSale.isTaxInvoice ? `<div style="display:flex;justify-content:space-between;color:#888;"><span>เลขที่บิล:</span><span>${convertedSale.billNumber}</span></div>` : ""}
            <div style="display:flex;justify-content:space-between;"><span>วันที่:</span><span>${new Date(convertedSale.createdAt || new Date()).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}</span></div>
            <div style="display:flex;justify-content:space-between;"><span>เวลา:</span><span>${new Date(convertedSale.createdAt || new Date()).toLocaleTimeString("th-TH")}</span></div>
            <div style="display:flex;justify-content:space-between;color:#888;"><span>จากใบเสนอราคา:</span><span>${convertedSale.quotationNumber}</span></div>
          </div>
          ${convertedSale.buyerName ? `
          <div style="border-bottom:1px dashed #ccc;padding-bottom:8px;margin-bottom:8px;padding:6px;background:#f9fafb;border-radius:4px;">
            <div style="font-weight:600;margin-bottom:4px;">ผู้ซื้อ:</div>
            <div>ชื่อ: ${convertedSale.buyerName}</div>
            ${convertedSale.buyerPhone ? `<div>โทร: ${convertedSale.buyerPhone}</div>` : ""}
            ${convertedSale.buyerAddress ? `<div>ที่อยู่: ${convertedSale.buyerAddress}</div>` : ""}
            ${convertedSale.isTaxInvoice && convertedSale.buyerTaxId ? `<div>เลขประจำตัวผู้เสียภาษี: ${convertedSale.buyerTaxId}</div>` : ""}
          </div>` : ""}
          <div style="border-bottom:1px dashed #ccc;padding-bottom:8px;margin-bottom:8px;">
            <table style="width:100%;border-collapse:collapse;">
              <thead><tr style="border-bottom:1px solid #ddd;"><th style="text-align:left;padding:4px 0;font-weight:600;font-size:10px;">#</th><th style="text-align:left;padding:4px 0;font-weight:600;font-size:10px;">รายการ</th><th style="text-align:center;padding:4px 0;font-weight:600;width:50px;font-size:10px;">จำนวน</th><th style="text-align:right;padding:4px 0;font-weight:600;width:70px;font-size:10px;">หน่วยละ</th><th style="text-align:right;padding:4px 0;font-weight:600;width:70px;font-size:10px;">จำนวนเงิน</th></tr></thead>
              <tbody>${itemsHtml}</tbody>
            </table>
          </div>
          <div style="margin-bottom:8px;">
            <div style="display:flex;justify-content:space-between;"><span>รวมมูลค่าสินค้า/บริการ</span><span>${formatCurrency(parseFloat(convertedSale.subtotal) + parseFloat(convertedSale.serviceFee || "0"))}</span></div>
            ${parseFloat(convertedSale.discount) > 0 ? `<div style="display:flex;justify-content:space-between;color:#dc2626;"><span>ส่วนลด</span><span>-${formatCurrency(parseFloat(convertedSale.discount))}</span></div>` : ""}
            ${convertedSale.isTaxInvoice ? `
              <div style="display:flex;justify-content:space-between;"><span>มูลค่าก่อนภาษี</span><span>${formatCurrency(parseFloat(convertedSale.total) - parseFloat(convertedSale.taxAmount || "0"))}</span></div>
              <div style="display:flex;justify-content:space-between;color:#2563eb;"><span>ภาษีมูลค่าเพิ่ม ${convertedSale.vatType === "vat_in" ? "(รวมในราคา)" : ""} ${convertedSale.taxRate}%</span><span>${formatCurrency(parseFloat(convertedSale.taxAmount || "0"))}</span></div>
            ` : ""}
            <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:16px;padding-top:8px;border-top:2px solid #999;margin-top:8px;"><span>จำนวนเงินรวมทั้งสิ้น</span><span style="color:#2563eb;">${formatCurrency(parseFloat(convertedSale.total))}</span></div>
          </div>
          <div style="border-bottom:1px dashed #ccc;padding-bottom:8px;margin-bottom:8px;">
            <div style="display:flex;justify-content:space-between;"><span>วิธีชำระ:</span><span style="font-weight:600;">${payLabel}</span></div>
            ${convertedSale.note ? `<div style="color:#888;margin-top:4px;">หมายเหตุ: ${convertedSale.note}</div>` : ""}
          </div>
          <div style="text-align:center;color:#888;margin-bottom:8px;">ขอบคุณที่ใช้บริการ</div>
          ${convertedSale.isTaxInvoice ? `
          <div style="display:flex;justify-content:space-between;margin-top:16px;padding-top:8px;border-top:1px solid #ddd;">
            <div style="text-align:center;width:100px;"><div style="border-bottom:1px solid #ccc;height:32px;margin-bottom:4px;"></div><div>ผู้รับเงิน</div><div style="font-size:10px;color:#888;">วันที่</div></div>
            <div style="text-align:center;width:100px;"><div style="border-bottom:1px solid #ccc;height:32px;margin-bottom:4px;"></div><div>ผู้สั่งซื้อ</div><div style="font-size:10px;color:#888;">วันที่</div></div>
          </div>` : ""}
        </div>
      `;
    }

    const allPages = copyLabels.map((label, idx) => buildReceiptHtml(label, idx)).join("");

    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="utf-8">
        <title>พิมพ์ใบเสร็จ</title>
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Sarabun', sans-serif; }
          @media print {
            body { margin: 0; padding: 0; }
          }
        </style>
      </head>
      <body>${allPages}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 300);
    };
  }

  async function handleSendLineQuotation(quotationId: number) {
    if (sendingLineId) return;
    setSendingLineId(quotationId);
    try {
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "quotation", id: quotationId, action: "send_line" }),
      });
      const data = await res.json();
      if (data.success) {
        alert("✅ " + data.message);
      } else {
        alert("❌ " + (data.error || "ส่ง LINE ไม่สำเร็จ"));
      }
    } catch (err) {
      alert("❌ เกิดข้อผิดพลาดในการส่ง LINE");
    } finally {
      setSendingLineId(null);
    }
  }

  function handlePrintQuotation(q: any) {
    const qt = q.quotations;
    const store: any = storeSettings || {};
    const cust = q.customers;
    const isConverted = qt.status === "converted";
    const isReceipt = isConverted;
    const logoUrl = store.storeLogo || "";

    getQuotationItems(qt.id).then((items) => {
      const bName = qt.buyerName || cust?.name || "";
      const bPhone = qt.buyerPhone || cust?.phone || "";
      const bAddr = qt.buyerAddress || cust?.address || "";
      const bTaxId = qt.buyerTaxId || cust?.taxId || "";
      const fmtD = (d: Date) => d.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
      const createdAt = new Date(qt.createdAt);
      const validDate = new Date(createdAt);
      validDate.setDate(validDate.getDate() + (qt.validDays || 30));

      let idx = 0;
      let itemsHtml = "";
      const hasDiscCol = !isReceipt;
      items.forEach((item: any) => {
        idx++;
        const it = item.quotation_items;
        const pName = it.description || item.products?.name || "-";
        const disc = parseFloat(it.discount || "0");
        const lineTotal = parseFloat(it.unitPrice) * it.quantity - disc;
        const bg = idx % 2 === 0 ? ' style="background:#fafafa"' : '';
        if (hasDiscCol) {
          itemsHtml += `<tr${bg}><td class="tc">${idx}</td><td>${pName}</td><td class="tc">${it.quantity}</td><td class="tr">${formatCurrency(parseFloat(it.unitPrice))}</td><td class="tr">${disc > 0 ? formatCurrency(disc) : "-"}</td><td class="tr">${formatCurrency(lineTotal)}</td></tr>`;
        } else {
          itemsHtml += `<tr${bg}><td class="tc">${idx}</td><td>${pName}</td><td class="tc">${it.quantity}</td><td class="tr">${formatCurrency(parseFloat(it.unitPrice))}</td><td class="tr">${formatCurrency(lineTotal)}</td></tr>`;
        }
      });
      if (parseFloat(qt.serviceFee || "0") > 0) {
        idx++;
        if (hasDiscCol) {
          itemsHtml += `<tr class="svc"><td class="tc">${idx}</td><td>${qt.serviceDescription || "ค่าบริการ"}</td><td class="tc">1</td><td class="tr">${formatCurrency(parseFloat(qt.serviceFee))}</td><td class="tr">-</td><td class="tr">${formatCurrency(parseFloat(qt.serviceFee))}</td></tr>`;
        } else {
          itemsHtml += `<tr class="svc"><td class="tc">${idx}</td><td>${qt.serviceDescription || "ค่าบริการ"}</td><td class="tc">1</td><td class="tr">${formatCurrency(parseFloat(qt.serviceFee))}</td><td class="tr">${formatCurrency(parseFloat(qt.serviceFee))}</td></tr>`;
        }
      }

      const docTitle = isReceipt ? (qt.includeVat ? "ใบกำกับภาษี / TAX INVOICE" : "ใบเสร็จรับเงิน / RECEIPT") : "ใบเสนอราคา / QUOTATION";
      const copyLabels = ["สำหรับลูกค้า", "สำหรับบริษัท", "สำหรับบัญชี"];

      const thCols = hasDiscCol
        ? `<th class="tc" style="width:30px">#</th><th style="text-align:left">รายการบริการ / Description</th><th class="tc" style="width:50px">จำนวน</th><th class="tr" style="width:80px">ราคา/หน่วย</th><th class="tr" style="width:65px">ส่วนลด</th><th class="tr" style="width:90px">จำนวนเงิน</th>`
        : `<th class="tc" style="width:30px">#</th><th style="text-align:left">รายการบริการ / Description</th><th class="tc" style="width:50px">จำนวน</th><th class="tr" style="width:80px">ราคา/หน่วย</th><th class="tr" style="width:90px">จำนวนเงิน</th>`;

      function buildPage(label: string, i: number) {
        return `<div class="page" style="page-break-after:${i < 2 ? "always" : "auto"}">
  <div class="copy-label"><span class="copy-tag">${label}</span><span class="copy-num">(${i+1}/3)</span></div>
  <div class="header-bar">
    <div class="logo-box">${logoUrl ? `<img src="${logoUrl}" alt="logo">` : `<div class="logo-ph"></div>`}</div>
    <div class="header-text">
      <div class="doc-title">${docTitle}</div>
      <div class="store-name">${store.storeName || "บริษัทรับจ้างทำการตลาด"}${store.branchName ? ` - ${store.branchName}` : ""}</div>
      <div class="store-detail">${store.address || ""}${store.phone ? ` | โทร. ${store.phone}` : ""}${store.taxId ? `<br>เลขประจำตัวผู้เสียภาษี: ${store.taxId}` : ""}</div>
    </div>
  </div>
  <div class="info-section">
    <div class="info-left">
      <div class="info-row"><span class="info-label">${isReceipt ? "เลขที่" : "เลขที่ใบเสนอราคา"}</span><span class="info-val">${qt.quotationNumber}</span></div>
      ${bName ? `<div class="info-row"><span class="info-label">ลูกค้า</span><span class="info-val">${bName}</span></div>` : ""}
      ${bPhone ? `<div class="info-row"><span class="info-label">โทร</span><span class="info-val">${bPhone}</span></div>` : ""}
    </div>
    <div class="info-right">
      <div class="info-row"><span class="info-label">${isReceipt ? "วันที่" : "วันที่ออก"}</span><span class="info-val">${fmtD(createdAt)}</span></div>
      ${!isReceipt ? `<div class="info-row"><span class="info-label">ใช้ได้ถึง</span><span class="info-val">${fmtD(validDate)}</span></div>` : `<div class="info-row"><span class="info-label">เวลา</span><span class="info-val">${createdAt.toLocaleTimeString("th-TH")}</span></div>`}
    </div>
  </div>
  ${bAddr || bTaxId ? `<div class="buyer-section">
    <div class="buyer-title">${isReceipt ? "ข้อมูลผู้ซื้อ / Customer Information" : "ข้อมูลลูกค้า / Customer Information"}</div>
    <div class="buyer-grid">
      ${bName ? `<div class="buyer-item"><span class="bl">ชื่อ:</span> ${bName}</div>` : ""}
      ${bPhone ? `<div class="buyer-item"><span class="bl">โทร:</span> ${bPhone}</div>` : ""}
      ${bAddr ? `<div class="buyer-item" style="min-width:100%"><span class="bl">ที่อยู่:</span> ${bAddr}</div>` : ""}
      ${bTaxId ? `<div class="buyer-item"><span class="bl">เลขประจำตัวผู้เสียภาษี:</span> ${bTaxId}</div>` : ""}
    </div>
  </div>` : ""}
  <table class="items"><thead><tr>${thCols}</tr></thead><tbody>${itemsHtml}</tbody></table>
  <div class="summary-section"><div class="summary-box">
    <div class="s-row"><span>รวมมูลค่าสินค้า/บริการ</span><span>${formatCurrency(parseFloat(qt.subtotal) + parseFloat(qt.serviceFee || "0"))}</span></div>
    ${parseFloat(qt.discount || "0") > 0 ? `<div class="s-row disc"><span>ส่วนลด</span><span>-${formatCurrency(parseFloat(qt.discount))}</span></div>` : ""}
    ${qt.includeVat ? `<div class="s-row"><span>มูลค่าก่อนภาษี</span><span>${formatCurrency(parseFloat(qt.total) - parseFloat(qt.taxAmount || "0"))}</span></div><div class="s-row tax"><span>ภาษีมูลค่าเพิ่ม ${qt.vatType === "vat_in" ? "(รวมในราคา) " : ""}${qt.taxRate}%</span><span>${formatCurrency(parseFloat(qt.taxAmount || "0"))}</span></div>` : ""}
    <div class="s-row total"><span>ยอดรวมทั้งสิ้น</span><span class="amt">${formatCurrency(parseFloat(qt.total))} บาท</span></div>
  </div></div>
  ${!isReceipt ? `<div class="validity-bar">ใบเสนอราคามีอายุ ${qt.validDays || 30} วัน นับจากวันที่ออก (ใช้ได้ถึง ${fmtD(validDate)})</div>` : ""}
  ${qt.note ? `<div class="note-section"><strong>หมายเหตุ:</strong> ${qt.note}</div>` : ""}
  <div class="sig-section">
    ${isReceipt ? `
    <div class="sig-block"><div class="sig-line"></div><div class="sig-label">ผู้รับเงิน</div><div class="sig-sub">(...............................)</div><div class="sig-sub">วันที่ ____/____/____</div></div>
    <div class="sig-block"><div class="sig-line"></div><div class="sig-label">ผู้จ่ายเงิน / ผู้ซื้อ</div><div class="sig-sub">(...............................)</div><div class="sig-sub">วันที่ ____/____/____</div></div>
    <div class="sig-block"><div class="sig-line"></div><div class="sig-label">ผู้อนุมัติ</div><div class="sig-sub">(...............................)</div><div class="sig-sub">วันที่ ____/____/____</div></div>
    ` : `
    <div class="sig-block"><div class="sig-line"></div><div class="sig-label">ผู้เสนอราคา</div><div class="sig-sub">(...............................)</div><div class="sig-sub">วันที่ ____/____/____</div></div>
    <div class="sig-block"><div class="sig-line"></div><div class="sig-label">ผู้อนุมัติ</div><div class="sig-sub">(...............................)</div><div class="sig-sub">วันที่ ____/____/____</div></div>
    <div class="sig-block"><div class="sig-line"></div><div class="sig-label">ลูกค้า / ผู้สั่งซื้อ</div><div class="sig-sub">(...............................)</div><div class="sig-sub">วันที่ ____/____/____</div></div>
    `}
  </div>
  <div class="footer"><div class="footer-thanks">${isReceipt ? "ขอบคุณที่ใช้บริการ / Thank you for your business" : "ขอบคุณที่ไว้วางใจ / Thank you for your trust"}</div><div class="footer-sub">${store.storeName || "บริษัทรับจ้างทำการตลาด"}${store.phone ? ` | โทร. ${store.phone}` : ""}</div></div>
</div>`;
      }

      const allPages = copyLabels.map((label, i) => buildPage(label, i)).join("");
      const printTitle = isReceipt ? "ใบเสร็จ" : `ใบเสนอราคา ${qt.quotationNumber}`;
      const pw = window.open("", "_blank", "width=800,height=600");
      if (!pw) return;
      pw.document.write(`<!DOCTYPE html><html lang="th"><head><meta charset="utf-8"><title>${printTitle}</title>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Sarabun',sans-serif}
.page{padding:10mm 12mm;font-size:11px;color:#1a1a1a;line-height:1.4}
.copy-label{text-align:right;margin-bottom:8px;font-size:10px}
.copy-tag{border:1px solid #666;padding:2px 10px;border-radius:4px;font-weight:700;font-size:11px}
.copy-num{margin-left:6px;color:#888}
.header-bar{background:linear-gradient(135deg,#2563eb,#2563eb);color:#fff;padding:14px 18px;border-radius:8px;margin-bottom:12px;display:flex;align-items:center;gap:14px}
.logo-box{width:72px;height:72px;background:#fff;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;padding:4px;box-shadow:0 1px 3px rgba(0,0,0,0.1)}
.logo-box img{width:100%;height:100%;object-fit:contain}
.logo-ph{width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.3)}
.header-text{flex:1}
.doc-title{font-size:17px;font-weight:700;letter-spacing:.5px}
.store-name{font-size:13px;font-weight:600;margin-top:2px;opacity:.95}
.store-detail{font-size:9.5px;opacity:.85;margin-top:2px;line-height:1.4}
.info-section{display:flex;gap:10px;margin-bottom:10px}
.info-left,.info-right{flex:1;background:#f8f8f8;border:1px solid #e8e8e8;border-radius:6px;padding:10px 12px;font-size:10.5px}
.info-right{text-align:right}
.info-label{color:#888;font-size:9.5px;display:block;margin-bottom:1px}
.info-val{font-weight:600;color:#1a1a1a}
.info-row{margin-bottom:4px}
.buyer-section{border:1px solid #e0e0e0;border-radius:6px;padding:10px 12px;margin-bottom:10px;font-size:10.5px;background:#fefefe}
.buyer-title{font-weight:700;font-size:11px;color:#2563eb;margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid #f0f0f0}
.buyer-grid{display:flex;flex-wrap:wrap;gap:4px 20px}
.buyer-item{min-width:45%}
.buyer-item .bl{color:#888;font-size:9.5px}
table.items{width:100%;border-collapse:collapse;margin-bottom:10px}
table.items th{background:#eff6ff;border-top:2px solid #2563eb;border-bottom:2px solid #2563eb;padding:6px 5px;font-weight:700;font-size:9.5px;text-transform:uppercase;color:#92400e;letter-spacing:.3px}
table.items td{padding:5px;border-bottom:1px solid #f0f0f0;font-size:10.5px}
table.items .tc{text-align:center}
table.items .tr{text-align:right}
table.items tr.svc td{color:#b45309;font-style:italic}
table.items tbody tr:last-child td{border-bottom:2px solid #2563eb}
.summary-section{display:flex;justify-content:flex-end;margin-bottom:10px}
.summary-box{width:260px}
.s-row{display:flex;justify-content:space-between;padding:3px 0;font-size:11px}
.s-row.disc{color:#dc2626}
.s-row.tax{color:#2563eb}
.s-row.total{font-weight:700;font-size:15px;border-top:3px double #2563eb;padding-top:8px;margin-top:4px}
.s-row.total .amt{color:#2563eb}
.validity-bar{background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:8px 12px;text-align:center;font-size:10.5px;color:#92400e;font-weight:600;margin-bottom:10px}
.note-section{background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:8px 12px;font-size:10px;color:#555;margin-bottom:10px}
.note-section strong{color:#333}
.sig-section{display:flex;justify-content:space-around;margin-top:24px;padding-top:12px;border-top:1px solid #e0e0e0}
.sig-block{text-align:center;width:150px}
.sig-line{border-bottom:1px dotted #999;height:40px;margin-bottom:4px}
.sig-label{font-size:10px;font-weight:600;color:#333}
.sig-sub{font-size:8.5px;color:#999;margin-top:1px}
.footer{text-align:center;margin-top:12px;padding-top:8px;border-top:1px solid #eee}
.footer-thanks{font-size:12px;font-weight:600;color:#2563eb}
.footer-sub{font-size:9px;color:#aaa;margin-top:2px}
@media print{body{margin:0;padding:0}.header-bar{-webkit-print-color-adjust:exact;print-color-adjust:exact}table.items th{-webkit-print-color-adjust:exact;print-color-adjust:exact}.validity-bar{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>${allPages}</body></html>`);
      pw.document.close();
      pw.onload = () => { setTimeout(() => { pw.print(); pw.close(); }, 300); };
      
      markQuotationPrinted(qt.id).catch(() => {});
      load();
    });
  }

  const { subtotal, sfee, disc, tax, total } = getTotals();

  const filtered = searchQ
    ? list.filter((q: any) => {
        const qt = q.quotations;
        const c = q.customers;
        const s = searchQ.toLowerCase();
        return qt.quotationNumber.toLowerCase().includes(s)
          || (qt.buyerName || "").toLowerCase().includes(s)
          || (c?.name || "").toLowerCase().includes(s);
      })
    : list;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">ใบเสนอราคา</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">จัดการใบเสนอราคาทั้งหมด</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="h-8 px-3 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
            >
              {bulkDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} ลบ ({selectedIds.length})
            </button>
          )}
          <Button variant="outline" size="sm" onClick={async () => {
            const { exportQuotationsExcel } = await loadExportExcel(); exportQuotationsExcel(filtered, storeSettings?.storeName || "บริษัทรับจ้างทำการตลาด");
          }} className="h-8 text-xs border-blue-200 hover:bg-blue-50 text-blue-700 gap-1 rounded-lg">
            <Download className="h-3.5 w-3.5" /> Excel
          </Button>
          <Button className="gap-2 gradient-blue text-white rounded-xl shadow-luxury" onClick={openCreateModal}>
            <Plus className="h-4 w-4" /> สร้างใบเสนอราคา
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="ค้นหาเลขที่ใบเสนอราคา, ชื่อลูกค้า..." value={searchQ} onChange={(e) => setSearchQ(e.target.value)} className="pl-10 rounded-xl border-blue-200" />
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 && <div className="text-center text-muted-foreground py-8">ไม่มีใบเสนอราคา</div>}
        {/* Select All */}
        {filtered.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
            <button onClick={toggleSelectAll} className="p-1 hover:bg-gray-200 rounded">
              {selectedIds.length === filtered.length && filtered.length > 0
                ? <CheckSquare className="h-4 w-4 text-red-600" />
                : <Square className="h-4 w-4 text-gray-400" />}
            </button>
            <span className="text-xs text-muted-foreground">เลือกทั้งหมด</span>
            {selectedIds.length > 0 && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">เลือก {selectedIds.length} รายการ</span>
            )}
          </div>
        )}
        {filtered.map((q: any) => {
          const qt = q.quotations;
          const emp = q.employees;
          const cust = q.customers;
          const st = statusMap[qt.status] || statusMap.draft;
          const isExpanded = expandedId === qt.id;
          const isSelected = selectedIds.includes(qt.id);
          return (
            <div key={qt.id} className={`rounded-xl border shadow-sm cursor-pointer transition-all ${isSelected ? "bg-red-50/50 border-red-200" : "bg-white border-blue-100/60 hover:shadow-luxury"}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 gap-3">
                <div className="flex items-center gap-2 sm:gap-3 flex-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSelect(qt.id); }}
                    className="p-1 hover:bg-gray-200 rounded flex-shrink-0"
                  >
                    {isSelected
                      ? <CheckSquare className="h-4 w-4 text-red-600" />
                      : <Square className="h-4 w-4 text-gray-300" />}
                  </button>
                  <div className={`rounded-lg p-2 ${st.color} flex-shrink-0`}>
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{qt.quotationNumber}</div>
                    <div className="text-xs text-muted-foreground truncate">{new Date(qt.createdAt).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" })} • {emp?.name || "-"}</div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 justify-between sm:justify-end">
                  <div className="text-left sm:text-right">
                    <div className="font-bold text-blue-600 text-sm sm:text-base">{formatCurrency(parseFloat(qt.total))}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[120px] sm:max-w-none">{cust?.name || qt.buyerName || "-"}</div>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    <Badge className={`text-[10px] ${st.color} flex-shrink-0`}>{st.label}</Badge>
                    {qt.printed && (
                      <span className="text-[10px] px-1 py-0.5 rounded-full bg-green-100 text-green-700 font-medium flex-shrink-0">🖨️</span>
                    )}
                  </div>
                  <div className="flex gap-0.5 sm:gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={(e) => { e.stopPropagation(); openEditModal(q); }}>
                      <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={(e) => { e.stopPropagation(); handlePrintQuotation(q); }}>
                      <Printer className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={(e) => { e.stopPropagation(); handleSendLineQuotation(qt.id); }} disabled={sendingLineId === qt.id} title="ส่งผ่าน LINE">
                      {sendingLineId === qt.id ? <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin text-green-500" /> : <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />}
                    </Button>
                    {qt.status !== "converted" && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={(e) => { e.stopPropagation(); handleConvertToSale(q); }} disabled={convertingId === qt.id}>
                        <Receipt className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-600" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={(e) => { e.stopPropagation(); handleDeleteQuotation(qt.id); }}>
                      <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500" />
                    </Button>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 flex-shrink-0" />}
                </div>
              </div>
              {isExpanded && (
                <div className="border-t border-blue-100 p-4 bg-blue-50/20">
                  <table className="w-full text-xs mb-3">
                    <thead><tr className="text-muted-foreground"><th className="text-left py-1 font-medium">#</th><th className="text-left py-1 font-medium">รายการ</th><th className="text-center py-1 font-medium w-16">จำนวน</th><th className="text-right py-1 font-medium w-20">หน่วยละ</th><th className="text-right py-1 font-medium w-20">รวม</th></tr></thead>
                    <tbody>
                      {expandedItems.map((item: any, idx: number) => (
                        <tr key={idx} className="border-t border-gray-100">
                          <td className="py-1.5">{idx + 1}</td>
                          <td className="py-1.5">{item.quotation_items.description || item.products?.name || "-"}</td>
                          <td className="text-center py-1.5">{item.quotation_items.quantity}</td>
                          <td className="text-right py-1.5">{formatCurrency(parseFloat(item.quotation_items.unitPrice))}</td>
                          <td className="text-right py-1.5">{formatCurrency(parseFloat(item.quotation_items.total))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="space-y-1 text-xs border-t border-gray-200 pt-2">
                    <div className="flex justify-between"><span>รวมสินค้า</span><span>{formatCurrency(parseFloat(qt.subtotal))}</span></div>
                    {parseFloat(qt.serviceFee) > 0 && <div className="flex justify-between text-amber-700"><span>ค่าบริการ: {qt.serviceDescription || "-"}</span><span>{formatCurrency(parseFloat(qt.serviceFee))}</span></div>}
                    {parseFloat(qt.discount) > 0 && <div className="flex justify-between text-red-600"><span>ส่วนลด</span><span>-{formatCurrency(parseFloat(qt.discount))}</span></div>}
                    {qt.includeVat && <div className="flex justify-between text-blue-600"><span>ภาษี {qt.taxRate}%</span><span>{formatCurrency(parseFloat(qt.taxAmount || "0"))}</span></div>}
                    <div className="flex justify-between font-bold text-sm pt-1 border-t"><span>ยอดรวม</span><span className="text-blue-600">{formatCurrency(parseFloat(qt.total))}</span></div>
                  </div>
                  {qt.note && <div className="mt-2 text-xs text-muted-foreground">หมายเหตุ: {qt.note}</div>}
                  <div className="mt-2 text-xs text-muted-foreground">
                    ใช้ได้ถึง: {(() => { const d = new Date(qt.createdAt); d.setDate(d.getDate() + (qt.validDays || 30)); return d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" }); })()}
                    ({qt.validDays || 30} วัน)
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-auto py-2 sm:py-8">
          <div className="w-full sm:max-w-2xl bg-white rounded-none sm:rounded-2xl shadow-luxury-lg border-0 sm:border border-blue-100 p-4 sm:p-6 sm:mx-4 min-h-screen sm:min-h-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base sm:text-lg font-bold">{editId ? "แก้ไขใบเสนอราคา" : "สร้างใบเสนอราคาใหม่"}</h2>
              <Button variant="ghost" size="icon" onClick={() => { setShowModal(false); resetForm(); }}><X className="h-5 w-5" /></Button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-auto pr-2">
              {/* Status & Valid days */}
              {editId && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">สถานะ</Label>
                    <select className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      <option value="draft">แบบร่าง</option>
                      <option value="sent">ส่งแล้ว</option>
                      <option value="accepted">ยอมรับ</option>
                      <option value="rejected">ปฏิเสธ</option>
                      <option value="expired">หมดอายุ</option>
                      <option value="converted">แปลงเป็นบิล</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">ใช้ได้ (วัน)</Label>
                    <Input className="h-9" type="number" value={form.validDays} onChange={(e) => setForm({ ...form, validDays: e.target.value })} />
                  </div>
                </div>
              )}
              {!editId && (
                <div>
                  <Label className="text-xs">ใช้ได้ (วัน)</Label>
                  <Input className="h-9 max-w-[120px]" type="number" value={form.validDays} onChange={(e) => setForm({ ...form, validDays: e.target.value })} />
                </div>
              )}

              {/* Customer */}
              <div>
                <Label className="text-xs">ลูกค้า (เลือกหรือกรอกเอง)</Label>
                <select className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm" value={form.customerId} onChange={(e) => {
                  const cid = e.target.value;
                  setForm({ ...form, customerId: cid });
                  if (cid) {
                    const c = customers.find((c: any) => c.id === parseInt(cid));
                    if (c) setForm(prev => ({ ...prev, customerId: cid, buyerName: c.name || "", buyerPhone: c.phone || "", buyerAddress: c.address || "", buyerTaxId: c.taxId || "" }));
                  }
                }}>
                  <option value="">-- ไม่ระบุ --</option>
                  {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ""}</option>)}
                </select>
              </div>

              {/* Buyer info */}
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">ชื่อลูกค้า</Label><Input className="h-9" value={form.buyerName} onChange={(e) => setForm({ ...form, buyerName: e.target.value })} /></div>
                <div><Label className="text-xs">โทร</Label><Input className="h-9" value={form.buyerPhone} onChange={(e) => setForm({ ...form, buyerPhone: e.target.value })} /></div>
                <div><Label className="text-xs">ที่อยู่</Label><Input className="h-9" value={form.buyerAddress} onChange={(e) => setForm({ ...form, buyerAddress: e.target.value })} /></div>
                <div><Label className="text-xs">เลขผู้เสียภาษี</Label><Input className="h-9" value={form.buyerTaxId} onChange={(e) => setForm({ ...form, buyerTaxId: e.target.value })} /></div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-semibold">รายการบริการ</Label>
                  <div className="flex gap-2">
                    <Button type="button" variant="default" size="sm" className="text-xs h-8 gap-1.5 gradient-blue text-white shadow-sm" onClick={openProductBrowser}>
                      <Package className="h-3.5 w-3.5" /> เลือกสินค้า
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs h-8 gap-1" onClick={addCustomItem}><Plus className="h-3 w-3" /> เพิ่มรายการเอง</Button>
                  </div>
                </div>
                {/* Quick search */}
                <div className="relative mb-3">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input className="h-8 pl-8 text-xs rounded-lg border-gray-200" placeholder="พิมพ์ชื่อสินค้าเพื่อค้นหาเร็ว..." value={productQuery} onChange={(e) => handleSearchProduct(e.target.value)} />
                  {productResults.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-auto">
                      {productResults.map((p: any) => (
                        <div key={p.id} className="px-3 py-2 hover:bg-blue-50 cursor-pointer flex justify-between items-center text-xs border-b last:border-0" onClick={() => addProduct(p)}>
                          <div>
                            <div className="font-medium">{p.name}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-blue-600 font-semibold">{formatCurrency(parseFloat(p.sellPrice))}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Item list */}
                <div className="space-y-2">
                  {formItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <Input className="h-7 text-xs mb-1" placeholder="รายละเอียด" value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} />
                        <div className="flex gap-2">
                          <div className="w-16"><Input className="h-7 text-xs text-center" type="number" min={1} value={item.quantity} onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 1)} /></div>
                          <div className="w-24"><Input className="h-7 text-xs text-right" placeholder="ราคา" value={item.unitPrice} onChange={(e) => updateItem(idx, "unitPrice", e.target.value)} /></div>
                          <div className="w-20"><Input className="h-7 text-xs text-right" placeholder="ส่วนลด" value={item.discount} onChange={(e) => updateItem(idx, "discount", e.target.value)} /></div>
                          <div className="text-xs font-semibold text-right pt-1.5 w-24 text-blue-600">
                            {formatCurrency(parseFloat(item.unitPrice || "0") * item.quantity - parseFloat(item.discount || "0"))}
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(idx)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Service fee & Discount */}
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">ค่าบริการ</Label><Input className="h-9" type="number" value={form.serviceFee} onChange={(e) => setForm({ ...form, serviceFee: e.target.value })} placeholder="0" /></div>
                <div><Label className="text-xs">รายละเอียดบริการ</Label><Input className="h-9" value={form.serviceDescription} onChange={(e) => setForm({ ...form, serviceDescription: e.target.value })} /></div>
                <div><Label className="text-xs">ส่วนลดรวม</Label><Input className="h-9" type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} placeholder="0" /></div>
              </div>

              {/* VAT */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.includeVat} onChange={(e) => setForm({ ...form, includeVat: e.target.checked })} className="rounded" />
                  คำนวณภาษี
                </label>
                {form.includeVat && (
                  <>
                    <select className="h-8 rounded-lg border px-2 text-xs" value={form.vatType} onChange={(e) => setForm({ ...form, vatType: e.target.value as any })}>
                      <option value="vat_out">แวทนอก</option>
                      <option value="vat_in">แวทใน</option>
                    </select>
                    <Input className="h-8 w-16 text-xs text-center" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} />
                    <span className="text-xs">%</span>
                  </>
                )}
              </div>

              {/* Note */}
              <div><Label className="text-xs">หมายเหตุ</Label><Input className="h-9" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>

              {/* Summary */}
              <div className="bg-blue-50 rounded-xl p-3 space-y-1 text-sm">
                <div className="flex justify-between"><span>รวมสินค้า</span><span>{formatCurrency(subtotal)}</span></div>
                {sfee > 0 && <div className="flex justify-between text-amber-700"><span>ค่าบริการ</span><span>{formatCurrency(sfee)}</span></div>}
                {disc > 0 && <div className="flex justify-between text-red-600"><span>ส่วนลด</span><span>-{formatCurrency(disc)}</span></div>}
                {form.includeVat && <div className="flex justify-between text-blue-600"><span>ภาษี {form.taxRate}%</span><span>{formatCurrency(tax)}</span></div>}
                <div className="flex justify-between font-bold text-lg pt-1 border-t border-blue-200"><span>ยอดรวมสุทธิ</span><span className="text-blue-600">{formatCurrency(total)}</span></div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-4">
              <Button className="flex-1 gradient-blue text-white rounded-xl h-10" disabled={saving || formItems.length === 0} onClick={handleSave}>
                {saving ? "กำลังบันทึก..." : editId ? "บันทึกการแก้ไข" : "สร้างใบเสนอราคา"}
              </Button>
              <Button variant="outline" className="rounded-xl h-10" onClick={() => { setShowModal(false); resetForm(); }}>ยกเลิก</Button>
            </div>
          </div>
        </div>
      )}

      {/* Product Browser Modal */}
      {showProductBrowser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full sm:max-w-4xl max-h-[90vh] sm:max-h-[85vh] bg-white rounded-none sm:rounded-2xl shadow-luxury-lg border-0 sm:border border-blue-100 flex flex-col sm:mx-4">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-blue">
                  <Package className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">เลือกสินค้า</h2>
                  <p className="text-xs text-muted-foreground">คลิกเพื่อเพิ่มสินค้าลงรายการ</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowProductBrowser(false)}><X className="h-5 w-5" /></Button>
            </div>

            {/* Filters */}
            <div className="flex gap-3 p-4 border-b border-gray-100 bg-gray-50/50">
              <div className="relative flex-1 overflow-x-auto min-w-[300px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="h-9 pl-9" placeholder="ค้นหาสินค้า..." value={browserFilter} onChange={(e) => setBrowserFilter(e.target.value)} />
              </div>
              <select className="h-9 rounded-lg border border-gray-200 px-3 text-sm min-w-[160px]" value={browserCategory} onChange={(e) => setBrowserCategory(e.target.value)}>
                <option value="">ทุกหมวดหมู่</option>
                {allCategories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Product Grid */}
            <div className="flex-1 overflow-auto p-4">
              {(() => {
                const filtered = allProducts.filter((row: any) => {
                  const p = row.products || row;
                  const matchName = p.name.toLowerCase().includes(browserFilter.toLowerCase());
                  const matchCategory = !browserCategory || p.categoryId === parseInt(browserCategory);
                  return matchName && matchCategory;
                });

                if (filtered.length === 0) {
                  return <div className="text-center text-muted-foreground py-12">ไม่พบสินค้า</div>;
                }

                return (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {filtered.map((row: any) => {
                      const p = row.products || row;
                      const cat = allCategories.find((c: any) => c.id === p.categoryId);
                      const alreadyAdded = formItems.find(item => item.productId === p.id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => addProductFromBrowser(row)}
                          className={`relative p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md ${
                            alreadyAdded
                              ? "border-blue-400 bg-blue-50 ring-2 ring-blue-200"
                              : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50"
                          }`}
                        >
                          {alreadyAdded && (
                            <div className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold shadow">
                              {formItems.filter(i => i.productId === p.id).reduce((sum, i) => sum + i.quantity, 0)}
                            </div>
                          )}
                          {/* Product image or placeholder */}
                          <div className="h-20 rounded-lg bg-gray-100 mb-2 flex items-center justify-center overflow-hidden">
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                            ) : (
                              <Package className="h-8 w-8 text-gray-300" />
                            )}
                          </div>
                          <div className="text-xs font-semibold line-clamp-2 mb-1">{p.name}</div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-blue-600">{formatCurrency(parseFloat(p.sellPrice))}</span>
                          </div>
                          {cat && (
                            <Badge variant="outline" className="mt-1.5 text-[9px] px-1.5 py-0 h-4">{cat.name}</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-gray-100 bg-gray-50/50">
              <div className="text-sm text-muted-foreground">
                เลือกแล้ว <span className="font-semibold text-blue-600">{formItems.length}</span> รายการ
                {formItems.length > 0 && (
                  <span> • รวม <span className="font-semibold">{formatCurrency(formItems.reduce((sum, item) => sum + parseFloat(item.unitPrice || "0") * item.quantity - parseFloat(item.discount || "0"), 0))}</span></span>
                )}
              </div>
              <Button className="gradient-blue text-white rounded-xl" onClick={() => setShowProductBrowser(false)}>
                เสร็จสิ้น
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Convert Success Modal */}
      {showConvertModal && convertedSale && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-green-100 p-6 mx-4">
            <div className="text-center mb-4">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-3">
                <Receipt className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-lg font-bold text-green-700">แปลงเป็นบิลสำเร็จ!</h2>
              <p className="text-sm text-muted-foreground mt-1">
                ใบเสนอราคา {convertedSale.quotationNumber} ถูกแปลงเป็น{convertedSale.isTaxInvoice ? "ใบกำกับภาษี" : "ใบเสร็จ"}แล้ว
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 mb-4 text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-muted-foreground">เลขที่{convertedSale.isTaxInvoice ? "ใบกำกับภาษี" : "บิล"}:</span>
                <span className="font-semibold">{convertedSale.isTaxInvoice ? convertedSale.taxInvoiceNumber : convertedSale.billNumber}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-muted-foreground">จำนวนรายการ:</span>
                <span>{convertedSale.items?.length || 0} รายการ</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>ยอดรวม:</span>
                <span className="text-green-600">{formatCurrency(parseFloat(convertedSale.total))}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => { setShowConvertModal(false); setConvertedSale(null); }}>
                ปิด
              </Button>
              <Button className="flex-1 rounded-xl bg-green-500 text-white hover:bg-green-600 gap-2" onClick={() => { handlePrintReceipt(); }}>
                <Printer className="h-4 w-4" /> พิมพ์ใบเสร็จ (3 ฉบับ)
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

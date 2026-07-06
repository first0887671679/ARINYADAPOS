"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getSalesWithDate, updateSale, getSaleById, searchProducts, getCustomers, getStoreSettings, markSalePrinted, voidSale, deleteSale } from "@/app/actions";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Receipt, Wrench, Pencil, X, FileText, ChevronDown, ChevronUp, Plus, Minus, Trash2, Search, Calendar, Printer, Eye, Download, Loader2, Send, MessageCircle, Ban } from "lucide-react";
import { PaymentBadge } from "@/components/payment-badge";
const loadExportExcel = () => import("@/lib/export-excel");

interface EditItem {
  productId: number;
  name: string;
  quantity: number;
  unitPrice: string;
  discount: string;
}

export default function SalesPage() {
  const searchParams = useSearchParams();
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => searchParams.get("from") || new Date().toISOString().split("T")[0]);
  const [dateTo, setDateTo] = useState(() => searchParams.get("to") || new Date().toISOString().split("T")[0]);
  const [editSale, setEditSale] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editItems, setEditItems] = useState<EditItem[]>([]);
  const [editForm, setEditForm] = useState({
    buyerName: "", buyerPhone: "", buyerAddress: "", buyerTaxId: "",
    note: "", paymentMethod: "cash", serviceFee: "0", serviceDescription: "",
    discount: "0", vatType: "vat_out" as "vat_in" | "vat_out", taxRate: "7",
    isTaxInvoice: false, status: "completed",
  });
  const [saving, setSaving] = useState(false);
  const [expandedSale, setExpandedSale] = useState<number | null>(null);
  const [saleDetails, setSaleDetails] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const [productResults, setProductResults] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [editCustomerId, setEditCustomerId] = useState<number | null>(null);
  const [storeSettings, setStoreSettings] = useState<any>(null);
  // LINE send
  const [sendingLineId, setSendingLineId] = useState<number | null>(null);
  // Void sale
  const [voidingId, setVoidingId] = useState<number | null>(null);
  // Delete sale
  const [deletingId, setDeletingId] = useState<number | null>(null);
  // Batch print
  const [selectedBills, setSelectedBills] = useState<Set<number>>(new Set());
  const [showBatchPrintModal, setShowBatchPrintModal] = useState(false);
  const [batchPrintType, setBatchPrintType] = useState<"customer" | "accounting" | "company">("customer");
  const [batchPrinting, setBatchPrinting] = useState(false);

  useEffect(() => { load(); }, [dateFrom, dateTo]);

  async function load() {
    setLoading(true);
    const [data, custs, settings] = await Promise.all([getSalesWithDate(dateFrom, dateTo), getCustomers(), getStoreSettings()]);
    setSales(data);
    setCustomers(custs);
    setStoreSettings(settings);
    setLoading(false);
  }

  // Quick filter presets
  const setToday = () => {
    const today = new Date().toISOString().split("T")[0];
    setDateFrom(today);
    setDateTo(today);
  };

  const setThisMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
    setDateFrom(firstDay);
    setDateTo(lastDay);
  };

  const setThisYear = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
    const lastDay = new Date(now.getFullYear(), 11, 31).toISOString().split("T")[0];
    setDateFrom(firstDay);
    setDateTo(lastDay);
  };

  const setLastMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0];
    setDateFrom(firstDay);
    setDateTo(lastDay);
  };

  async function handleVoidSale(id: number) {
    if (!confirm("ยืนยันยกเลิกบิลนี้? (สินค้าจะถูกคืนสต๊อก)")) return;
    setVoidingId(id);
    try {
      const result = await voidSale(id);
      if (!result.success) {
        alert(result.error || "ยกเลิกไม่สำเร็จ");
      }
      load();
    } catch (err: any) {
      alert("เกิดข้อผิดพลาด: " + (err?.message || "ไม่สามารถยกเลิกบิลได้"));
    } finally {
      setVoidingId(null);
    }
  }

  async function handleDeleteSale(id: number) {
    if (!confirm("⚠️ ยืนยันลบบิลนี้ออกจากระบบถาวร?\n\n(ข้อมูลจะถูกลบออกจากระบบทั้งหมด ไม่สามารถกู้คืนได้)")) return;
    setDeletingId(id);
    try {
      const result = await deleteSale(id);
      if (!result.success) {
        alert(result.error || "ลบไม่สำเร็จ");
      }
      load();
    } catch (err: any) {
      alert("เกิดข้อผิดพลาด: " + (err?.message || "ไม่สามารถลบบิลได้"));
    } finally {
      setDeletingId(null);
    }
  }

  async function openEditModal(saleRow: any) {
    const sale = saleRow;
    const detail = await getSaleById(sale.id);
    const items: EditItem[] = (detail?.items || []).map((si: any) => ({
      productId: si.sale_items.productId,
      name: si.products?.name || `สินค้า #${si.sale_items.productId}`,
      quantity: si.sale_items.quantity,
      unitPrice: si.sale_items.unitPrice,
      discount: si.sale_items.discount || "0",
    }));
    setEditSale(sale);
    setEditItems(items);
    setEditCustomerId(sale.customerId || null);
    setEditForm({
      buyerName: sale.buyerName || "",
      buyerPhone: sale.buyerPhone || "",
      buyerAddress: sale.buyerAddress || "",
      buyerTaxId: sale.buyerTaxId || "",
      note: sale.note || "",
      paymentMethod: sale.paymentMethod || "cash",
      serviceFee: sale.serviceFee || "0",
      serviceDescription: sale.serviceDescription || "",
      discount: sale.discount || "0",
      vatType: (sale.vatType || "vat_out") as "vat_in" | "vat_out",
      taxRate: sale.taxRate || "7",
      isTaxInvoice: sale.isTaxInvoice || false,
      status: sale.status || "completed",
    });
    setProductQuery("");
    setProductResults([]);
    setShowEditModal(true);
  }

  function closeEditModal() {
    setShowEditModal(false);
    setEditSale(null);
    setEditItems([]);
  }

  async function handleSearchProduct(q: string) {
    setProductQuery(q);
    if (q.length < 1) { setProductResults([]); return; }
    const res = await searchProducts(q);
    setProductResults(res);
  }

  function addProductToEdit(p: any) {
    const product = p.products || p;
    const existing = editItems.find(i => i.productId === product.id);
    if (existing) {
      setEditItems(editItems.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setEditItems([...editItems, {
        productId: product.id,
        name: product.name,
        quantity: 1,
        unitPrice: product.price,
        discount: "0",
      }]);
    }
    setProductQuery("");
    setProductResults([]);
  }

  function removeEditItem(productId: number) {
    setEditItems(editItems.filter(i => i.productId !== productId));
  }

  function updateEditItemQty(productId: number, delta: number) {
    setEditItems(editItems.map(i => {
      if (i.productId === productId) {
        const newQty = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }));
  }

  function updateEditItemPrice(productId: number, price: string) {
    setEditItems(editItems.map(i => i.productId === productId ? { ...i, unitPrice: price } : i));
  }

  function updateEditItemDiscount(productId: number, disc: string) {
    setEditItems(editItems.map(i => i.productId === productId ? { ...i, discount: disc } : i));
  }

  // Calculate totals for preview
  function getEditTotals() {
    const subtotal = editItems.reduce((sum, i) => sum + (parseFloat(i.unitPrice) * i.quantity - parseFloat(i.discount || "0")), 0);
    const sf = parseFloat(editForm.serviceFee || "0");
    const disc = parseFloat(editForm.discount || "0");
    const taxRate = parseFloat(editForm.taxRate || "7");
    let tax = 0, total = 0;
    if (editForm.isTaxInvoice) {
      if (editForm.vatType === "vat_in") {
        total = subtotal + sf - disc;
        tax = total - total / (1 + taxRate / 100);
      } else {
        const before = subtotal + sf - disc;
        tax = before * taxRate / 100;
        total = before + tax;
      }
    } else {
      total = subtotal + sf - disc;
    }
    return { subtotal, tax, total };
  }

  async function handleSaveEdit() {
    if (!editSale) return;
    setSaving(true);
    await updateSale(editSale.id, {
      customerId: editCustomerId,
      buyerName: editForm.buyerName,
      buyerPhone: editForm.buyerPhone,
      buyerAddress: editForm.buyerAddress,
      buyerTaxId: editForm.buyerTaxId,
      items: editItems.map(i => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice, discount: i.discount })),
      discount: editForm.discount,
      serviceFee: editForm.serviceFee,
      serviceDescription: editForm.serviceDescription,
      paymentMethod: editForm.paymentMethod,
      vatType: editForm.vatType,
      taxRate: editForm.taxRate,
      isTaxInvoice: editForm.isTaxInvoice,
      note: editForm.note,
      status: editForm.status,
    });
    setSaving(false);
    closeEditModal();
    load();
  }

  async function toggleSaleDetails(saleId: number) {
    if (expandedSale === saleId) {
      setExpandedSale(null);
      setSaleDetails([]);
      return;
    }
    setExpandedSale(saleId);
    setLoadingItems(true);
    const sale = await getSaleById(saleId);
    setSaleDetails(sale?.items || []);
    setLoadingItems(false);
  }

  async function handleSendLine(saleId: number) {
    if (sendingLineId) return;
    setSendingLineId(saleId);
    try {
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "receipt", id: saleId, action: "send_line" }),
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

  async function handlePrintReceipt(saleRow: any) {
    const sale = saleRow.sales;
    const detail = await getSaleById(sale.id);
    const items = detail?.items || [];
    const store: any = storeSettings || {};
    const copyLabels = ["สำหรับลูกค้า", "สำหรับบริษัท", "สำหรับบัญชี"];
    const emp = saleRow.employees;
    const logoUrl = store.storeLogo || "";

    let idx = 0;
    let itemsHtml = "";
    items.forEach((si: any) => {
      idx++;
      const p = si.products;
      const item = si.sale_items || si;
      const nameDisplay = p?.name || "บริการ";
      const bg = idx % 2 === 0 ? ' style="background:#fafafa"' : '';
      itemsHtml += `<tr${bg}><td class="tc">${idx}</td><td>${nameDisplay}</td><td class="tc">${item.quantity}</td><td class="tr">${formatCurrency(parseFloat(item.unitPrice))}</td><td class="tr">${formatCurrency(parseFloat(item.total))}</td></tr>`;
    });
    if (parseFloat(sale.serviceFee || "0") > 0) {
      idx++;
      itemsHtml += `<tr class="svc"><td class="tc">${idx}</td><td>${sale.serviceDescription || "ค่าบริการ"}</td><td class="tc">1</td><td class="tr">${formatCurrency(parseFloat(sale.serviceFee))}</td><td class="tr">${formatCurrency(parseFloat(sale.serviceFee))}</td></tr>`;
    }
    const payLabel = sale.paymentMethod === "cash" ? "เงินสด" : sale.paymentMethod === "transfer" ? "โอนเงิน" : "เครดิต";
    const bName = sale.buyerName || "";
    const bPhone = sale.buyerPhone || "";
    const bAddr = sale.buyerAddress || "";
    const bTaxId = sale.buyerTaxId || "";
    const docTitle = sale.isTaxInvoice ? "ใบกำกับภาษี / TAX INVOICE" : "ใบเสร็จรับเงิน / RECEIPT";
    const fmtD = (d: Date) => d.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
    const fmtT = (d: Date) => d.toLocaleTimeString("th-TH");
    const createdAt = new Date(sale.createdAt);

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
      <div class="info-row"><span class="info-label">เลขที่${sale.isTaxInvoice ? "ใบกำกับภาษี" : "บิล"}</span><span class="info-val">${sale.isTaxInvoice ? sale.taxInvoiceNumber : sale.billNumber}</span></div>
      ${sale.isTaxInvoice && sale.billNumber !== sale.taxInvoiceNumber ? `<div class="info-row"><span class="info-label">เลขที่บิลอ้างอิง</span><span class="info-val">${sale.billNumber}</span></div>` : ""}
      ${emp?.name ? `<div class="info-row"><span class="info-label">พนักงานขาย</span><span class="info-val">${emp.name}</span></div>` : ""}
    </div>
    <div class="info-right">
      <div class="info-row"><span class="info-label">วันที่</span><span class="info-val">${fmtD(createdAt)}</span></div>
      <div class="info-row"><span class="info-label">เวลา</span><span class="info-val">${fmtT(createdAt)}</span></div>
    </div>
  </div>
  ${bName || bTaxId || bAddr ? `<div class="buyer-section">
    <div class="buyer-title">ข้อมูลผู้ซื้อ / Customer Information</div>
    <div class="buyer-grid">
      ${bName ? `<div class="buyer-item"><span class="bl">ชื่อ:</span> ${bName}</div>` : ""}
      ${bPhone ? `<div class="buyer-item"><span class="bl">โทร:</span> ${bPhone}</div>` : ""}
      ${bAddr ? `<div class="buyer-item" style="min-width:100%"><span class="bl">ที่อยู่:</span> ${bAddr}</div>` : ""}
      ${bTaxId ? `<div class="buyer-item"><span class="bl">เลขประจำตัวผู้เสียภาษี:</span> ${bTaxId}</div>` : ""}
    </div>
  </div>` : ""}
  <table class="items">
    <thead><tr><th class="tc" style="width:30px">#</th><th style="text-align:left">รายการบริการ / Description</th><th class="tc" style="width:50px">จำนวน</th><th class="tr" style="width:80px">ราคา/หน่วย</th><th class="tr" style="width:90px">จำนวนเงิน</th></tr></thead>
    <tbody>${itemsHtml}</tbody>
  </table>
  <div class="summary-section"><div class="summary-box">
    <div class="s-row"><span>รวมมูลค่าสินค้า/บริการ</span><span>${formatCurrency(parseFloat(sale.subtotal || "0") + parseFloat(sale.serviceFee || "0"))}</span></div>
    ${parseFloat(sale.discount || "0") > 0 ? `<div class="s-row disc"><span>ส่วนลด</span><span>-${formatCurrency(parseFloat(sale.discount))}</span></div>` : ""}
    ${sale.isTaxInvoice ? `<div class="s-row"><span>มูลค่าก่อนภาษี</span><span>${formatCurrency(parseFloat(sale.total) - parseFloat(sale.taxAmount || "0"))}</span></div><div class="s-row tax"><span>ภาษีมูลค่าเพิ่ม ${sale.vatType === "vat_in" ? "(รวมในราคา) " : ""}${sale.taxRate}%</span><span>${formatCurrency(parseFloat(sale.taxAmount || "0"))}</span></div>` : ""}
    <div class="s-row total"><span>ยอดรวมทั้งสิ้น</span><span class="amt">${formatCurrency(parseFloat(sale.total))} บาท</span></div>
  </div></div>
  <div class="pay-section"><span>วิธีชำระเงิน</span><span class="pay-method">${payLabel}</span></div>
  ${sale.note ? `<div class="note-section"><strong>หมายเหตุ:</strong> ${sale.note}</div>` : ""}
  <div class="sig-section">
    <div class="sig-block"><div class="sig-line"></div><div class="sig-label">ผู้รับเงิน</div><div class="sig-sub">(...............................)</div><div class="sig-sub">วันที่ ____/____/____</div></div>
    <div class="sig-block"><div class="sig-line"></div><div class="sig-label">ผู้จ่ายเงิน / ผู้ซื้อ</div><div class="sig-sub">(...............................)</div><div class="sig-sub">วันที่ ____/____/____</div></div>
    <div class="sig-block"><div class="sig-line"></div><div class="sig-label">ผู้อนุมัติ</div><div class="sig-sub">(...............................)</div><div class="sig-sub">วันที่ ____/____/____</div></div>
  </div>
  <div class="footer"><div class="footer-thanks">ขอบคุณที่ใช้บริการ / Thank you for your business</div><div class="footer-sub">${store.storeName || "บริษัทรับจ้างทำการตลาด"}${store.phone ? ` | โทร. ${store.phone}` : ""}</div></div>
</div>`;
    }

    const allPages = copyLabels.map((label, i) => buildPage(label, i)).join("");

    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html lang="th"><head><meta charset="utf-8"><title>พิมพ์ใบเสร็จ</title>
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
.pay-section{display:flex;justify-content:space-between;align-items:center;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:8px 12px;margin-bottom:10px;font-size:11px}
.pay-method{font-weight:700;color:#2563eb}
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
@media print{body{margin:0;padding:0}.header-bar{-webkit-print-color-adjust:exact;print-color-adjust:exact}table.items th{-webkit-print-color-adjust:exact;print-color-adjust:exact}.pay-section{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>${allPages}</body></html>`);
    printWindow.document.close();
    printWindow.onload = () => { setTimeout(() => { printWindow.print(); printWindow.close(); }, 300); };
    
    markSalePrinted(sale.id).catch(() => {});
    load();
  }

  // Batch print handlers
  function toggleSelectBill(id: number) {
    setSelectedBills(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedBills.size === sales.length) {
      setSelectedBills(new Set());
    } else {
      setSelectedBills(new Set(sales.map((row: any) => row.sales.id)));
    }
  }

  async function handleBatchPrint() {
    if (selectedBills.size === 0) return;
    setBatchPrinting(true);
    try {
      const selectedSales = sales.filter((row: any) => selectedBills.has(row.sales.id));
      const copyTypeLabel = batchPrintType === "customer" ? "สำหรับลูกค้า" : batchPrintType === "accounting" ? "สำหรับบัญชี" : "สำหรับบริษัท";
      const store: any = storeSettings || {};
      const logoUrl = store.storeLogo || "";
      const fmtD = (d: Date) => d.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
      const fmtT = (d: Date) => d.toLocaleTimeString("th-TH");

      let allPagesHtml = "";
      for (const row of selectedSales) {
        const sale = row.sales;
        const detail = await getSaleById(sale.id);
        const items = detail?.items || [];
        const emp = row.employees;
        const payLabel = sale.paymentMethod === "cash" ? "เงินสด" : sale.paymentMethod === "transfer" ? "โอนเงิน" : "เครดิต";
        const bName = sale.buyerName || "";
        const bPhone = sale.buyerPhone || "";
        const bAddr = sale.buyerAddress || "";
        const bTaxId = sale.buyerTaxId || "";
        const docTitle = sale.isTaxInvoice ? "ใบกำกับภาษี / TAX INVOICE" : "ใบเสร็จรับเงิน / RECEIPT";
        const createdAt = new Date(sale.createdAt);

        let idx = 0;
        let itemsHtml = "";
        items.forEach((si: any) => {
          idx++;
          const p = si.products;
          const item = si.sale_items || si;
          const nameDisplay = p?.name || "บริการ";
          const bg = idx % 2 === 0 ? ' style="background:#fafafa"' : '';
          itemsHtml += `<tr${bg}><td class="tc">${idx}</td><td>${nameDisplay}</td><td class="tc">${item.quantity}</td><td class="tr">${formatCurrency(parseFloat(item.unitPrice))}</td><td class="tr">${formatCurrency(parseFloat(item.total))}</td></tr>`;
        });
        if (parseFloat(sale.serviceFee || "0") > 0) {
          idx++;
          itemsHtml += `<tr class="svc"><td class="tc">${idx}</td><td>${sale.serviceDescription || "ค่าบริการ"}</td><td class="tc">1</td><td class="tr">${formatCurrency(parseFloat(sale.serviceFee))}</td><td class="tr">${formatCurrency(parseFloat(sale.serviceFee))}</td></tr>`;
        }

        allPagesHtml += `<div class="page">
  <div class="copy-label"><span class="copy-tag">${copyTypeLabel}</span></div>
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
      <div class="info-row"><span class="info-label">เลขที่${sale.isTaxInvoice ? "ใบกำกับภาษี" : "บิล"}</span><span class="info-val">${sale.isTaxInvoice ? sale.taxInvoiceNumber : sale.billNumber}</span></div>
      ${sale.isTaxInvoice && sale.billNumber !== sale.taxInvoiceNumber ? `<div class="info-row"><span class="info-label">เลขที่บิลอ้างอิง</span><span class="info-val">${sale.billNumber}</span></div>` : ""}
      ${emp?.name ? `<div class="info-row"><span class="info-label">พนักงานขาย</span><span class="info-val">${emp.name}</span></div>` : ""}
    </div>
    <div class="info-right">
      <div class="info-row"><span class="info-label">วันที่</span><span class="info-val">${fmtD(createdAt)}</span></div>
      <div class="info-row"><span class="info-label">เวลา</span><span class="info-val">${fmtT(createdAt)}</span></div>
    </div>
  </div>
  ${bName || bTaxId || bAddr ? `<div class="buyer-section">
    <div class="buyer-title">ข้อมูลผู้ซื้อ / Customer Information</div>
    <div class="buyer-grid">
      ${bName ? `<div class="buyer-item"><span class="bl">ชื่อ:</span> ${bName}</div>` : ""}
      ${bPhone ? `<div class="buyer-item"><span class="bl">โทร:</span> ${bPhone}</div>` : ""}
      ${bAddr ? `<div class="buyer-item" style="min-width:100%"><span class="bl">ที่อยู่:</span> ${bAddr}</div>` : ""}
      ${bTaxId ? `<div class="buyer-item"><span class="bl">เลขประจำตัวผู้เสียภาษี:</span> ${bTaxId}</div>` : ""}
    </div>
  </div>` : ""}
  <table class="items">
    <thead><tr><th class="tc" style="width:30px">#</th><th style="text-align:left">รายการบริการ / Description</th><th class="tc" style="width:50px">จำนวน</th><th class="tr" style="width:80px">ราคา/หน่วย</th><th class="tr" style="width:90px">จำนวนเงิน</th></tr></thead>
    <tbody>${itemsHtml}</tbody>
  </table>
  <div class="summary-section"><div class="summary-box">
    <div class="s-row"><span>รวมมูลค่าสินค้า/บริการ</span><span>${formatCurrency(parseFloat(sale.subtotal || "0") + parseFloat(sale.serviceFee || "0"))}</span></div>
    ${parseFloat(sale.discount || "0") > 0 ? `<div class="s-row disc"><span>ส่วนลด</span><span>-${formatCurrency(parseFloat(sale.discount))}</span></div>` : ""}
    ${sale.isTaxInvoice ? `<div class="s-row"><span>มูลค่าก่อนภาษี</span><span>${formatCurrency(parseFloat(sale.total) - parseFloat(sale.taxAmount || "0"))}</span></div><div class="s-row tax"><span>ภาษีมูลค่าเพิ่ม ${sale.vatType === "vat_in" ? "(รวมในราคา) " : ""}${sale.taxRate}%</span><span>${formatCurrency(parseFloat(sale.taxAmount || "0"))}</span></div>` : ""}
    <div class="s-row total"><span>ยอดรวมทั้งสิ้น</span><span class="amt">${formatCurrency(parseFloat(sale.total))} บาท</span></div>
  </div></div>
  <div class="pay-section"><span>วิธีชำระเงิน</span><span class="pay-method">${payLabel}</span></div>
  ${sale.note ? `<div class="note-section"><strong>หมายเหตุ:</strong> ${sale.note}</div>` : ""}
  <div class="sig-section">
    <div class="sig-block"><div class="sig-line"></div><div class="sig-label">ผู้รับเงิน</div><div class="sig-sub">(...............................)</div><div class="sig-sub">วันที่ ____/____/____</div></div>
    <div class="sig-block"><div class="sig-line"></div><div class="sig-label">ผู้จ่ายเงิน / ผู้ซื้อ</div><div class="sig-sub">(...............................)</div><div class="sig-sub">วันที่ ____/____/____</div></div>
    <div class="sig-block"><div class="sig-line"></div><div class="sig-label">ผู้อนุมัติ</div><div class="sig-sub">(...............................)</div><div class="sig-sub">วันที่ ____/____/____</div></div>
  </div>
  <div class="footer"><div class="footer-thanks">ขอบคุณที่ใช้บริการ / Thank you for your business</div><div class="footer-sub">${store.storeName || "บริษัทรับจ้างทำการตลาด"}${store.phone ? ` | โทร. ${store.phone}` : ""}</div></div>
</div>`;

        // Mark as printed
        markSalePrinted(sale.id).catch(() => {});
      }

      // Build the full print HTML
      const printHtml = `<!DOCTYPE html><html lang="th"><head><meta charset="utf-8"><title>พิมพ์หลายรายการ</title>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Sarabun',sans-serif}
.page{padding:10mm 12mm;font-size:11px;color:#1a1a1a;line-height:1.4;page-break-after:always}
.page:last-child{page-break-after:auto}
.copy-label{text-align:right;margin-bottom:8px;font-size:10px}
.copy-tag{border:1px solid #666;padding:2px 10px;border-radius:4px;font-weight:700;font-size:11px}
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
.pay-section{display:flex;justify-content:space-between;align-items:center;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:8px 12px;margin-bottom:10px;font-size:11px}
.pay-method{font-weight:700;color:#2563eb}
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
@media print{body{margin:0;padding:0}.header-bar{-webkit-print-color-adjust:exact;print-color-adjust:exact}table.items th{-webkit-print-color-adjust:exact;print-color-adjust:exact}.pay-section{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>${allPagesHtml}</body></html>`;

      // Use hidden iframe to bypass pop-up blockers
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.style.visibility = "hidden";
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        alert("ไม่สามารถสร้างเอกสารสำหรับพิมพ์ได้");
        document.body.removeChild(iframe);
        setBatchPrinting(false);
        return;
      }

      iframeDoc.open();
      iframeDoc.write(printHtml);
      iframeDoc.close();

      // Wait for iframe content to load, then fonts, then print
      iframe.onload = () => {
        const iframeWin = iframe.contentWindow;
        if (!iframeWin) return;
        iframeWin.document.fonts.ready.then(() => {
          setTimeout(() => {
            iframeWin.focus();
            iframeWin.print();
            // Cleanup after print dialog closes
            setTimeout(() => {
              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
              }
            }, 1000);
          }, 500);
        });
      };

      // Fallback if onload doesn't fire within 3 seconds
      setTimeout(() => {
        try {
          const iframeWin = iframe.contentWindow;
          if (iframeWin && iframeWin.document.readyState === "complete") {
            iframeWin.document.fonts.ready.then(() => {
              iframeWin.focus();
              iframeWin.print();
              setTimeout(() => {
                if (document.body.contains(iframe)) {
                  document.body.removeChild(iframe);
                }
              }, 1000);
            });
          }
        } catch {}
      }, 3000);

      setSelectedBills(new Set());
      setShowBatchPrintModal(false);
      load();
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการพิมพ์รวม");
    } finally {
      setBatchPrinting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">ประวัติการขาย</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">รายการขายทั้งหมด</p>
        </div>
      </div>

      {/* Date Filter */}
      <div className="bg-white rounded-xl border border-blue-100/60 p-3 sm:p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">ช่วงวันที่:</span>
          </div>
          
          {/* Quick filters */}
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <Button variant="outline" size="sm" onClick={setToday} className="h-7 sm:h-8 text-[11px] sm:text-xs border-blue-200 hover:bg-blue-50">วันนี้</Button>
            <Button variant="outline" size="sm" onClick={setThisMonth} className="h-7 sm:h-8 text-[11px] sm:text-xs border-blue-200 hover:bg-blue-50">เดือนนี้</Button>
            <Button variant="outline" size="sm" onClick={setLastMonth} className="h-7 sm:h-8 text-[11px] sm:text-xs border-blue-200 hover:bg-blue-50">เดือนก่อน</Button>
            <Button variant="outline" size="sm" onClick={setThisYear} className="h-7 sm:h-8 text-[11px] sm:text-xs border-blue-200 hover:bg-blue-50">ปีนี้</Button>
          </div>

          {/* Date inputs */}
          <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="flex-1 sm:w-36 h-8 text-sm border-blue-200"
            />
            <span className="text-muted-foreground text-xs">ถึง</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="flex-1 sm:w-36 h-8 text-sm border-blue-200"
            />
          </div>
        </div>
      </div>

      {/* Full Edit Modal */}
      {showEditModal && editSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-auto py-2 sm:py-4">
          <div className="bg-white rounded-none sm:rounded-2xl shadow-xl w-full sm:max-w-2xl sm:mx-4 overflow-hidden my-auto min-h-screen sm:min-h-0">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b bg-gradient-to-r from-blue-50/80 to-white">
              <div>
                <h2 className="text-base sm:text-lg font-bold">แก้ไขใบเสร็จ</h2>
                <span className="text-xs text-muted-foreground">
                  เลขที่: {editSale.isTaxInvoice ? editSale.taxInvoiceNumber : editSale.billNumber}
                </span>
              </div>
              <button onClick={closeEditModal} className="rounded-lg p-1.5 hover:bg-blue-100 transition-colors">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">

              {/* สถานะ & การชำระเงิน */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">สถานะ</Label>
                  <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm">
                    <option value="completed">สำเร็จ</option>
                    <option value="voided">ยกเลิก</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs">วิธีชำระเงิน</Label>
                  <select value={editForm.paymentMethod} onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value })} className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm">
                    <option value="cash">เงินสด</option>
                    <option value="transfer">โอนเงิน</option>
                    <option value="credit">เครดิต</option>
                  </select>
                </div>
              </div>

              {/* ลูกค้า */}
              <div>
                <Label className="text-xs">ลูกค้า</Label>
                <select value={editCustomerId || ""} onChange={(e) => setEditCustomerId(e.target.value ? parseInt(e.target.value) : null)} className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm">
                  <option value="">ลูกค้าทั่วไป</option>
                  {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ""}</option>)}
                </select>
              </div>

              {/* รายการบริการ */}
              <div>
                <Label className="text-xs font-semibold">รายการบริการ</Label>
                <div className="relative mt-1 mb-2">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-8 text-xs pl-8"
                    placeholder="ค้นหาสินค้าเพื่อเพิ่ม..."
                    value={productQuery}
                    onChange={(e) => handleSearchProduct(e.target.value)}
                  />
                  {productResults.length > 0 && (
                    <div className="absolute z-10 w-full bg-white border rounded-lg shadow-lg mt-1 max-h-40 overflow-auto">
                      {productResults.map((p: any) => {
                        const prod = p.products || p;
                        return (
                          <button key={prod.id} onClick={() => addProductToEdit(p)} className="w-full text-left px-3 py-2 hover:bg-blue-50 text-xs flex justify-between">
                            <span>{prod.name}</span>
                            <span className="text-blue-600 font-medium">{formatCurrency(parseFloat(prod.price))}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                {editItems.length === 0 ? (
                  <div className="text-center py-4 text-xs text-muted-foreground border border-dashed rounded-lg">ยังไม่มีรายการบริการ</div>
                ) : (
                  <div className="space-y-1">
                    {editItems.map((item) => (
                      <div key={item.productId} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">{item.name}</div>
                          <div className="flex gap-2 mt-1">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-muted-foreground">ราคา:</span>
                              <Input className="h-6 w-20 text-[10px] px-1" value={item.unitPrice} onChange={(e) => updateEditItemPrice(item.productId, e.target.value)} />
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-muted-foreground">ลด:</span>
                              <Input className="h-6 w-16 text-[10px] px-1" value={item.discount} onChange={(e) => updateEditItemDiscount(item.productId, e.target.value)} />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => updateEditItemQty(item.productId, -1)} className="h-6 w-6 flex items-center justify-center rounded bg-gray-200 hover:bg-gray-300"><Minus className="h-3 w-3" /></button>
                          <span className="text-xs font-bold w-6 text-center">{item.quantity}</span>
                          <button onClick={() => updateEditItemQty(item.productId, 1)} className="h-6 w-6 flex items-center justify-center rounded bg-gray-200 hover:bg-gray-300"><Plus className="h-3 w-3" /></button>
                        </div>
                        <div className="text-xs font-semibold text-right w-20">
                          {formatCurrency(parseFloat(item.unitPrice) * item.quantity - parseFloat(item.discount || "0"))}
                        </div>
                        <button onClick={() => removeEditItem(item.productId)} className="h-6 w-6 flex items-center justify-center rounded hover:bg-red-100"><Trash2 className="h-3 w-3 text-red-400" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ค่าบริการ & ส่วนลด */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">ค่าบริการ</Label>
                  <Input className="h-9 text-sm" type="number" value={editForm.serviceFee} onChange={(e) => setEditForm({ ...editForm, serviceFee: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">รายละเอียดบริการ</Label>
                  <Input className="h-9 text-sm" value={editForm.serviceDescription} onChange={(e) => setEditForm({ ...editForm, serviceDescription: e.target.value })} />
                </div>
              </div>
              <div>
                <Label className="text-xs">ส่วนลดรวม</Label>
                <Input className="h-9 text-sm" type="number" value={editForm.discount} onChange={(e) => setEditForm({ ...editForm, discount: e.target.value })} />
              </div>

              {/* ภาษี */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={editForm.isTaxInvoice} onChange={(e) => setEditForm({ ...editForm, isTaxInvoice: e.target.checked })} className="rounded" />
                  ใบกำกับภาษี
                </label>
                {editForm.isTaxInvoice && (
                  <>
                    <select value={editForm.vatType} onChange={(e) => setEditForm({ ...editForm, vatType: e.target.value as "vat_in" | "vat_out" })} className="h-7 rounded border px-2 text-xs">
                      <option value="vat_out">แวทนอก</option>
                      <option value="vat_in">แวทใน</option>
                    </select>
                    <div className="flex items-center gap-1 text-xs">
                      <Input className="h-7 w-14 text-xs px-1" type="number" value={editForm.taxRate} onChange={(e) => setEditForm({ ...editForm, taxRate: e.target.value })} />
                      <span>%</span>
                    </div>
                  </>
                )}
              </div>

              {/* ผู้ซื้อ */}
              <div className="border border-blue-100 rounded-xl p-3 bg-blue-50/30">
                <div className="text-xs font-semibold text-blue-700 mb-2">ข้อมูลผู้ซื้อ</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px]">ชื่อ</Label>
                    <Input className="h-8 text-xs" value={editForm.buyerName} onChange={(e) => setEditForm({ ...editForm, buyerName: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-[10px]">โทร</Label>
                    <Input className="h-8 text-xs" value={editForm.buyerPhone} onChange={(e) => setEditForm({ ...editForm, buyerPhone: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-[10px]">ที่อยู่</Label>
                    <Input className="h-8 text-xs" value={editForm.buyerAddress} onChange={(e) => setEditForm({ ...editForm, buyerAddress: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-[10px]">เลขประจำตัวผู้เสียภาษี</Label>
                    <Input className="h-8 text-xs" value={editForm.buyerTaxId} onChange={(e) => setEditForm({ ...editForm, buyerTaxId: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* หมายเหตุ */}
              <div>
                <Label className="text-xs">หมายเหตุ</Label>
                <Input className="h-9 text-sm" value={editForm.note} onChange={(e) => setEditForm({ ...editForm, note: e.target.value })} />
              </div>

              {/* สรุปยอด */}
              {(() => { const t = getEditTotals(); return (
                <div className="bg-gray-50 rounded-xl p-3 space-y-1 text-xs">
                  <div className="flex justify-between"><span>รวมสินค้า</span><span>{formatCurrency(t.subtotal)}</span></div>
                  {parseFloat(editForm.serviceFee) > 0 && <div className="flex justify-between text-amber-600"><span>ค่าบริการ</span><span>+{formatCurrency(parseFloat(editForm.serviceFee))}</span></div>}
                  {parseFloat(editForm.discount) > 0 && <div className="flex justify-between text-red-500"><span>ส่วนลด</span><span>-{formatCurrency(parseFloat(editForm.discount))}</span></div>}
                  {editForm.isTaxInvoice && t.tax > 0 && <div className="flex justify-between text-blue-600"><span>ภาษี {editForm.taxRate}%</span><span>{formatCurrency(t.tax)}</span></div>}
                  <div className="flex justify-between font-bold text-sm pt-1 border-t border-gray-200"><span>ยอดสุทธิ</span><span className="text-blue-600">{formatCurrency(t.total)}</span></div>
                </div>
              ); })()}

              {/* ปุ่ม */}
              <div className="flex gap-2 pt-2">
                <button onClick={closeEditModal} className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">ยกเลิก</button>
                <button onClick={handleSaveEdit} disabled={saving} className="flex-1 rounded-xl gradient-blue px-4 py-2.5 text-sm font-semibold text-white shadow-luxury hover:shadow-luxury-lg transition-all disabled:opacity-50">
                  {saving ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Card View */}
      <div className="sm:hidden space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-bold">รายการขาย</span>
            <span className="text-xs text-muted-foreground">({sales.length})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={async () => {
              const { exportSalesExcel } = await loadExportExcel(); exportSalesExcel(sales, storeSettings?.storeName || "บริษัทรับจ้างทำการตลาด");
            }} className="h-7 text-[11px] border-blue-200 hover:bg-blue-50 text-blue-700 gap-1 rounded-lg">
              <Download className="h-3 w-3" /> Excel</Button>
            <Button variant="outline" size="sm" onClick={async () => {
              const { exportSalesReportExcel } = await loadExportExcel(); await exportSalesReportExcel(sales, storeSettings?.storeName || "บริษัทรับจ้างทำการตลาด", dateFrom, dateTo, customers);
            }} className="h-7 text-[11px] border-green-200 hover:bg-green-50 text-green-700 gap-1 rounded-lg">
              <FileText className="h-3 w-3" /> ภาษี
            </Button>
            <Button 
              size="sm" 
              onClick={() => setShowBatchPrintModal(true)} 
              disabled={selectedBills.size === 0}
              className="h-7 text-[11px] bg-blue-600 hover:bg-blue-700 text-white gap-1 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="h-3 w-3" /> พิมพ์ ({selectedBills.size})
            </Button>
          </div>
        </div>
        {loading ? (
          <div className="text-center text-muted-foreground py-12 bg-white rounded-2xl border border-blue-100/60">กำลังโหลด...</div>
        ) : sales.length === 0 ? (
          <div className="text-center text-muted-foreground py-12 bg-white rounded-2xl border border-blue-100/60">
            <Receipt className="h-8 w-8 mx-auto mb-2 text-blue-200" />ยังไม่มีรายการขาย
          </div>
        ) : (
          sales.map((row: any) => {
            const sale = row.sales;
            const payLabel = sale.paymentMethod === "cash" ? "เงินสด" : sale.paymentMethod === "transfer" ? "โอน" : "เครดิต";
            return (
              <div key={sale.id} className="rounded-2xl bg-white border border-blue-100/60 shadow-sm overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start gap-2">
                    <input 
                      type="checkbox" 
                      checked={selectedBills.has(sale.id)}
                      onChange={() => toggleSelectBill(sale.id)}
                      className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className={`rounded-lg p-1 ${sale.isTaxInvoice ? "bg-blue-100" : "bg-blue-100"}`}>
                          <FileText className={`h-3.5 w-3.5 ${sale.isTaxInvoice ? "text-blue-600" : "text-blue-600"}`} />
                        </div>
                        <span className={`font-mono text-xs font-semibold ${sale.status === "voided" ? "text-red-400 line-through" : "text-blue-700"}`}>{sale.isTaxInvoice ? sale.taxInvoiceNumber : sale.billNumber}</span>
                        {sale.status === "voided" && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-300 font-bold">❌ ยกเลิกแล้ว</span>}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {sale.isTaxInvoice && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">ใบกำกับภาษี</span>}
                        {sale.printed && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">🖨️ พิมพ์แล้ว</span>}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${sale.status === "completed" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                          {sale.status === "completed" ? "สำเร็จ" : "ยกเลิก"}
                        </span>
                        <PaymentBadge paymentMethod={sale.paymentMethod} />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-base font-bold text-blue-600">{formatCurrency(parseFloat(sale.total))}</div>
                      <div className="text-[10px] text-muted-foreground">{formatDate(sale.createdAt)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    {row.employees?.name && <span>👤 {row.employees.name}</span>}
                    <span>🛒 {row.customers?.name || sale.buyerName || "ลูกค้าทั่วไป"}</span>
                  </div>
                </div>
                <div className="flex items-center border-t border-blue-100/60 divide-x divide-blue-100/60">
                  <button onClick={() => toggleSaleDetails(sale.id)} className="flex-1 flex items-center justify-center gap-1.5 h-10 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors">
                    {expandedSale === sale.id ? <ChevronUp className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    รายละเอียด
                  </button>
                  <button onClick={() => handlePrintReceipt(row)} className="flex-1 flex items-center justify-center gap-1.5 h-10 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors">
                    <Printer className="h-3.5 w-3.5" /> พิมพ์
                  </button>
                  <button onClick={() => handleSendLine(sale.id)} disabled={sendingLineId === sale.id} className="flex-1 flex items-center justify-center gap-1.5 h-10 text-xs font-semibold text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50">
                    {sendingLineId === sale.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="h-3.5 w-3.5" />} LINE
                  </button>
                  <button onClick={() => openEditModal(sale)} className="flex-1 flex items-center justify-center gap-1.5 h-10 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                    <Pencil className="h-3.5 w-3.5" /> แก้ไข
                  </button>
                  {sale.status === "completed" && (
                    <button onClick={() => handleVoidSale(sale.id)} disabled={voidingId === sale.id} className="flex-1 flex items-center justify-center gap-1.5 h-10 text-xs font-semibold text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-50">
                      {voidingId === sale.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />} ยกเลิกขาย
                    </button>
                  )}
                  <button onClick={() => handleDeleteSale(sale.id)} disabled={deletingId === sale.id} className="flex-1 flex items-center justify-center gap-1.5 h-10 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50">
                    {deletingId === sale.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} ลบบิล
                  </button>
                </div>
                {expandedSale === sale.id && (
                  <div className="border-t border-blue-100/60 bg-gray-50/50 p-3">
                    {loadingItems ? (
                      <div className="text-center py-3 text-xs text-muted-foreground">กำลังโหลด...</div>
                    ) : (
                      <div className="space-y-1.5">
                        {saleDetails.map((si: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center text-xs">
                            <span className="flex-1 truncate">{si.products?.name || "-"}</span>
                            <span className="text-muted-foreground mx-2">x{si.sale_items.quantity}</span>
                            <span className="font-semibold">{formatCurrency(parseFloat(si.sale_items.total))}</span>
                          </div>
                        ))}
                        {parseFloat(sale.serviceFee || "0") > 0 && (
                          <div className="flex justify-between items-center text-xs text-amber-600">
                            <span>{sale.serviceDescription || "ค่าบริการ"}</span>
                            <span className="font-semibold">{formatCurrency(parseFloat(sale.serviceFee))}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center text-xs font-bold pt-1.5 border-t border-gray-200">
                          <span>ยอดรวม</span>
                          <span className="text-blue-600">{formatCurrency(parseFloat(sale.total))}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block rounded-2xl bg-white border border-blue-100/60 shadow-luxury overflow-hidden">
        <div className="px-3 sm:px-5 py-3 border-b border-blue-100/60 bg-gradient-to-r from-blue-50/80 to-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Receipt className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-bold">รายการขาย</span>
            <span className="text-xs text-muted-foreground">({sales.length} รายการ)</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={async () => {
              const { exportSalesExcel } = await loadExportExcel(); exportSalesExcel(sales, storeSettings?.storeName || "บริษัทรับจ้างทำการตลาด");
            }} className="h-7 text-[11px] border-blue-200 hover:bg-blue-50 text-blue-700 gap-1 rounded-lg">
              <Download className="h-3 w-3" /> ส่งออก Excel</Button>
            <Button variant="outline" size="sm" onClick={async () => {
              const { exportSalesReportExcel } = await loadExportExcel(); await exportSalesReportExcel(sales, storeSettings?.storeName || "บริษัทรับจ้างทำการตลาด", dateFrom, dateTo, customers);
            }} className="h-7 text-[11px] border-green-200 hover:bg-green-50 text-green-700 gap-1 rounded-lg">
              <FileText className="h-3 w-3" /> ภาษี
            </Button>
            <Button 
              size="sm" 
              onClick={() => setShowBatchPrintModal(true)} 
              disabled={selectedBills.size === 0}
              className="h-7 text-[11px] bg-blue-600 hover:bg-blue-700 text-white gap-1 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="h-3 w-3" /> พิมพ์หลายรายการ ({selectedBills.size})
            </Button>
          </div>
        </div>
        <div className="p-0 overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow className="bg-blue-50/50 hover:bg-blue-50/50">
                <TableHead className="font-semibold w-10">
                  <input 
                    type="checkbox" 
                    checked={sales.length > 0 && selectedBills.size === sales.length}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </TableHead>
                <TableHead className="font-semibold w-8"></TableHead>
                <TableHead className="font-semibold">เลขที่บิล</TableHead>
                <TableHead className="font-semibold">พนักงาน</TableHead>
                <TableHead className="font-semibold">ลูกค้า</TableHead>
                <TableHead className="text-right font-semibold">สินค้า</TableHead>
                <TableHead className="text-right font-semibold">บริการ</TableHead>
                <TableHead className="text-right font-semibold">ยอดรวม</TableHead>
                <TableHead className="font-semibold">ชำระโดย</TableHead>
                <TableHead className="font-semibold">สถานะ</TableHead>
                <TableHead className="font-semibold">วันที่</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={13} className="text-center text-muted-foreground py-12">กำลังโหลด...</TableCell>
                </TableRow>
              ) : (
                <>
                  {sales.map((row: any) => {
                    return (
                    <>
                      <TableRow key={row.sales.id} className="hover:bg-blue-50/30">
                        <TableCell>
                          <input 
                            type="checkbox" 
                            checked={selectedBills.has(row.sales.id)}
                            onChange={() => toggleSelectBill(row.sales.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => toggleSaleDetails(row.sales.id)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg hover:bg-blue-100 transition-colors"
                            title="ดูรายละเอียด"
                          >
                            {expandedSale === row.sales.id ? <ChevronUp className="h-4 w-4 text-blue-500" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                          </button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`rounded-lg p-1 ${row.sales.isTaxInvoice ? 'bg-blue-100' : 'bg-blue-100'}`}>
                              <FileText className={`h-3.5 w-3.5 ${row.sales.isTaxInvoice ? 'text-blue-600' : 'text-blue-600'}`} />
                            </div>
                            <div>
                              <div className={`font-mono text-xs font-medium ${row.sales.status === "voided" ? "text-red-400 line-through" : "text-blue-700"}`}>
                                {row.sales.isTaxInvoice ? row.sales.taxInvoiceNumber : row.sales.billNumber}
                              </div>
                              <div className="flex items-center gap-1 flex-wrap">
                                {row.sales.status === "voided" && (
                                  <span className="text-[10px] px-1 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-300 font-bold">
                                    ❌ ยกเลิกแล้ว
                                  </span>
                                )}
                                {row.sales.isTaxInvoice && (
                                  <span className="text-[10px] px-1 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                                    ใบกำกับภาษี
                                  </span>
                                )}
                                {row.sales.printed && (
                                  <span className="text-[10px] px-1 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                                    🖨️ พิมพ์แล้ว
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{row.employees?.name || "-"}</TableCell>
                        <TableCell>
                          <div>
                            <div>{row.customers?.name || row.sales.buyerName || "ลูกค้าทั่วไป"}</div>
                            {(row.sales.buyerPhone || row.sales.buyerTaxId) && (
                              <div className="text-[10px] text-muted-foreground">
                                {row.sales.buyerPhone && <span>โทร: {row.sales.buyerPhone}</span>}
                                {row.sales.buyerPhone && row.sales.buyerTaxId && <span> • </span>}
                                {row.sales.buyerTaxId && <span>เลขภาษี: {row.sales.buyerTaxId}</span>}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(parseFloat(row.sales.subtotal))}</TableCell>
                        <TableCell className="text-right">
                          {parseFloat(row.sales.serviceFee) > 0 ? (
                            <div className="flex items-center justify-end gap-1">
                              <Wrench className="h-3 w-3 text-amber-500" />
                              <span className="text-amber-600 font-medium">{formatCurrency(parseFloat(row.sales.serviceFee))}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(parseFloat(row.sales.total))}</TableCell>
                        <TableCell>
                          <PaymentBadge paymentMethod={row.sales.paymentMethod} size="md" />
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${row.sales.status === "completed" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${row.sales.status === "completed" ? "bg-emerald-500" : "bg-red-500"}`} />
                            {row.sales.status === "completed" ? "สำเร็จ" : row.sales.status === "voided" ? "ยกเลิก" : row.sales.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(row.sales.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => handlePrintReceipt(row)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-blue-50 transition-colors" title="พิมพ์ใบเสร็จ">
                              <Printer className="h-4 w-4 text-blue-500" />
                            </button>
                            <button onClick={() => handleSendLine(row.sales.id)} disabled={sendingLineId === row.sales.id} className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50" title="ส่งผ่าน LINE">
                              {sendingLineId === row.sales.id ? <Loader2 className="h-4 w-4 animate-spin text-green-500" /> : <MessageCircle className="h-4 w-4 text-green-500" />}
                            </button>
                            <button onClick={() => openEditModal(row.sales)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-blue-50 transition-colors" title="แก้ไข">
                              <Pencil className="h-4 w-4 text-muted-foreground" />
                            </button>
                            {row.sales.status === "completed" && (
                              <button onClick={() => handleVoidSale(row.sales.id)} disabled={voidingId === row.sales.id} className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-amber-50 transition-colors disabled:opacity-50" title="ยกเลิกการขาย (คืนสต๊อก)">
                                {voidingId === row.sales.id ? <Loader2 className="h-4 w-4 animate-spin text-amber-500" /> : <Ban className="h-4 w-4 text-amber-500" />}
                              </button>
                            )}
                            <button onClick={() => handleDeleteSale(row.sales.id)} disabled={deletingId === row.sales.id} className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50" title="ลบบิลถาวร">
                              {deletingId === row.sales.id ? <Loader2 className="h-4 w-4 animate-spin text-red-500" /> : <Trash2 className="h-4 w-4 text-red-400" />}
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedSale === row.sales.id && (
                        <TableRow key={`details-${row.sales.id}`}>
                          <TableCell colSpan={12} className="p-0 bg-gradient-to-r from-blue-50/30 to-blue-50/20">
                            <div className="px-6 py-4">
                              {loadingItems ? (
                                <div className="text-center py-4 text-sm text-muted-foreground">กำลังโหลด...</div>
                              ) : (
                                <>
                                  <table className="w-full text-xs mb-3">
                                    <thead>
                                      <tr className="text-muted-foreground">
                                        <th className="text-left py-1 font-medium">สินค้า</th>
                                        <th className="text-center py-1 font-medium w-16">จำนวน</th>
                                        <th className="text-right py-1 font-medium w-20">หน่วยละ</th>
                                        <th className="text-right py-1 font-medium w-20">รวม</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {saleDetails.map((si: any, idx: number) => (
                                        <tr key={idx} className="border-t border-gray-100">
                                          <td className="py-1.5">{si.products?.name || "-"}</td>
                                          <td className="text-center py-1.5">{si.sale_items.quantity}</td>
                                          <td className="text-right py-1.5">{formatCurrency(parseFloat(si.sale_items.unitPrice))}</td>
                                          <td className="text-right py-1.5">{formatCurrency(parseFloat(si.sale_items.total))}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                  <div className="space-y-1 text-xs border-t border-gray-200 pt-2">
                                    {row.sales.buyerAddress && (
                                      <div className="text-muted-foreground">ที่อยู่: {row.sales.buyerAddress}</div>
                                    )}
                                    {row.sales.note && (
                                      <div className="text-muted-foreground">หมายเหตุ: {row.sales.note}</div>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                    );
                  })}
                  {sales.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={13} className="text-center text-muted-foreground py-12"><Receipt className="h-8 w-8 mx-auto mb-2 text-blue-200" />ยังไม่มีรายการขาย</TableCell>
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Batch Print Modal */}
      {showBatchPrintModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-50/80 to-white">
              <div className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-bold">พิมพ์หลายรายการ</h2>
              </div>
              <button onClick={() => setShowBatchPrintModal(false)} className="rounded-lg p-1.5 hover:bg-blue-100 transition-colors">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-sm text-muted-foreground">
                เลือกจำนวน <span className="font-semibold text-blue-600">{selectedBills.size} รายการ</span> ที่จะพิมพ์
              </div>
              
              <div>
                <Label className="text-sm font-semibold mb-2 block">ประเภทสำเนา</Label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-blue-50 cursor-pointer transition-colors">
                    <input 
                      type="radio" 
                      name="copyType" 
                      value="customer" 
                      checked={batchPrintType === "customer"} 
                      onChange={() => setBatchPrintType("customer")}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">สำหรับลูกค้า</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-blue-50 cursor-pointer transition-colors">
                    <input 
                      type="radio" 
                      name="copyType" 
                      value="accounting" 
                      checked={batchPrintType === "accounting"} 
                      onChange={() => setBatchPrintType("accounting")}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">สำหรับบัญชี</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-blue-50 cursor-pointer transition-colors">
                    <input 
                      type="radio" 
                      name="copyType" 
                      value="company" 
                      checked={batchPrintType === "company"} 
                      onChange={() => setBatchPrintType("company")}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">สำหรับบริษัท</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowBatchPrintModal(false)} 
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={handleBatchPrint} 
                  disabled={batchPrinting}
                  className="flex-1 rounded-xl gradient-blue px-4 py-2.5 text-sm font-semibold text-white shadow-luxury hover:shadow-luxury-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {batchPrinting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      กำลังพิมพ์...
                    </>
                  ) : (
                    <>
                      <Printer className="h-4 w-4" />
                      ยืนยันพิมพ์
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

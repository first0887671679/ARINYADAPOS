"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, getSalesByCustomerId, getSaleItemsBySaleId, updateSale, getQuotationsByCustomerId, getQuotationItems, updateQuotation, searchProducts, getProducts, getCategories, getStoreSettings } from "@/app/actions";
import { formatCurrency } from "@/lib/utils";
import { Plus, Pencil, Trash2, X, Users, FileText, ChevronDown, ChevronUp, Receipt, Eye, FileSpreadsheet, Search, Package, Printer, Download } from "lucide-react";
import { PaymentBadge } from "@/components/payment-badge";
const loadExportExcel = () => import("@/lib/export-excel");

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", licensePlate: "", address: "", taxId: "" });
  const [expandedCustomer, setExpandedCustomer] = useState<number | null>(null);
  const [customerSales, setCustomerSales] = useState<any[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [expandedSale, setExpandedSale] = useState<number | null>(null);
  const [saleItems, setSaleItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [editSale, setEditSale] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ buyerName: "", buyerPhone: "", buyerAddress: "", buyerTaxId: "", note: "" });
  const [saving, setSaving] = useState(false);
  // Quotations
  const [customerQuotations, setCustomerQuotations] = useState<any[]>([]);
  const [loadingQuotations, setLoadingQuotations] = useState(false);
  const [expandedQuotation, setExpandedQuotation] = useState<number | null>(null);
  const [quotationItems, setQuotationItems] = useState<any[]>([]);
  const [editQuotation, setEditQuotation] = useState<any>(null);
  const [showEditQuotationModal, setShowEditQuotationModal] = useState(false);
  const [editQuotationForm, setEditQuotationForm] = useState({
    status: "draft", validDays: "30", note: "",
    buyerName: "", buyerPhone: "", buyerAddress: "", buyerTaxId: "",
    serviceFee: "", serviceDescription: "", discount: "",
    vatType: "vat_out" as "vat_in" | "vat_out", taxRate: "7", includeVat: false,
  });
  const [editQuotationItems, setEditQuotationItems] = useState<any[]>([]);
  const [savingQuotation, setSavingQuotation] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const [productResults, setProductResults] = useState<any[]>([]);
  const [showProductBrowser, setShowProductBrowser] = useState(false);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [browserFilter, setBrowserFilter] = useState("");
  const [browserCategory, setBrowserCategory] = useState("");
  const [storeSettings, setStoreSettings] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCustomers = customers.filter((c: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.name || "").toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q) ||
      (c.licensePlate || "").toLowerCase().includes(q) ||
      (c.address || "").toLowerCase().includes(q) ||
      (c.taxId || "").toLowerCase().includes(q)
    );
  });

  useEffect(() => { load(); loadStoreSettings(); }, []);

  async function load() {
    setCustomers(await getCustomers());
  }

  async function loadStoreSettings() {
    const settings = await getStoreSettings();
    setStoreSettings(settings);
  }

  function resetForm() {
    setForm({ name: "", phone: "", licensePlate: "", address: "", taxId: "" });
    setEditId(null);
    setShowForm(false);
  }

  function startEdit(c: any) {
    setForm({ name: c.name, phone: c.phone || "", licensePlate: c.licensePlate || "", address: c.address || "", taxId: c.taxId || "" });
    setEditId(c.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editId) {
      await updateCustomer(editId, form);
    } else {
      await createCustomer(form);
    }
    resetForm();
    load();
  }

  async function handleDelete(id: number) {
    if (!confirm("ยืนยันการลบลูกค้า?")) return;
    await deleteCustomer(id);
    load();
  }

  async function toggleCustomerSales(customerId: number) {
    if (expandedCustomer === customerId) {
      setExpandedCustomer(null);
      setCustomerSales([]);
      setExpandedSale(null);
      setSaleItems([]);
      setCustomerQuotations([]);
      setExpandedQuotation(null);
      setQuotationItems([]);
      return;
    }
    setExpandedCustomer(customerId);
    setExpandedSale(null);
    setSaleItems([]);
    setExpandedQuotation(null);
    setQuotationItems([]);
    setLoadingSales(true);
    setLoadingQuotations(true);
    const [sales, quotations] = await Promise.all([
      getSalesByCustomerId(customerId),
      getQuotationsByCustomerId(customerId),
    ]);
    setCustomerSales(sales);
    setCustomerQuotations(quotations);
    setLoadingSales(false);
    setLoadingQuotations(false);
  }

  async function toggleSaleItems(saleId: number) {
    if (expandedSale === saleId) {
      setExpandedSale(null);
      setSaleItems([]);
      return;
    }
    setExpandedSale(saleId);
    setLoadingItems(true);
    const items = await getSaleItemsBySaleId(saleId);
    setSaleItems(items);
    setLoadingItems(false);
  }

  async function toggleQuotationItems(quotationId: number) {
    if (expandedQuotation === quotationId) {
      setExpandedQuotation(null);
      setQuotationItems([]);
      return;
    }
    setExpandedQuotation(quotationId);
    const items = await getQuotationItems(quotationId);
    setQuotationItems(items);
  }

  async function openProductBrowser() {
    const [p, cat] = await Promise.all([getProducts(), getCategories()]);
    setAllProducts(p);
    setAllCategories(cat);
    setShowProductBrowser(true);
  }

  async function handleSearchProduct(q: string) {
    setProductQuery(q);
    if (q.length < 1) { setProductResults([]); return; }
    const res = await searchProducts(q);
    setProductResults(res);
  }

  function addProductToEdit(p: any) {
    const prod = p.products || p;
    setEditQuotationItems(prev => [...prev, { productId: prod.id, description: prod.name, quantity: 1, unitPrice: prod.sellPrice, discount: "0" }]);
    setProductQuery("");
    setProductResults([]);
  }

  function addProductFromBrowser(p: any) {
    const prod = p.products || p;
    const exists = editQuotationItems.find(item => item.productId === prod.id);
    if (exists) {
      setEditQuotationItems(prev => prev.map(item => item.productId === prod.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setEditQuotationItems(prev => [...prev, { productId: prod.id, description: prod.name, quantity: 1, unitPrice: prod.sellPrice, discount: "0" }]);
    }
  }

  function addCustomItemToEdit() {
    setEditQuotationItems(prev => [...prev, { description: "", quantity: 1, unitPrice: "0", discount: "0" }]);
  }

  function removeEditQuotationItem(idx: number) {
    setEditQuotationItems(prev => prev.filter((_, i) => i !== idx));
  }

  function updateEditQuotationItem(idx: number, field: string, value: any) {
    setEditQuotationItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  function getEditQuotationTotals() {
    let subtotal = 0;
    for (const item of editQuotationItems) {
      subtotal += parseFloat(item.unitPrice || "0") * item.quantity - parseFloat(item.discount || "0");
    }
    const sfee = parseFloat(editQuotationForm.serviceFee || "0");
    const disc = parseFloat(editQuotationForm.discount || "0");
    const rate = parseFloat(editQuotationForm.taxRate || "7");
    const base = subtotal + sfee - disc;
    let tax = 0;
    let total = base;
    if (editQuotationForm.includeVat) {
      if (editQuotationForm.vatType === "vat_in") {
        tax = base - (base / (1 + rate / 100));
      } else {
        tax = base * (rate / 100);
        total = base + tax;
      }
    }
    return { subtotal, sfee, disc, tax, total };
  }

  async function openEditQuotationModal(qt: any) {
    const items = await getQuotationItems(qt.id);
    setEditQuotation(qt);
    setEditQuotationForm({
      status: qt.status || "draft",
      validDays: String(qt.validDays || 30),
      note: qt.note || "",
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
    });
    setEditQuotationItems(
      items.map((i: any) => ({
        productId: i.quotation_items.productId || undefined,
        description: i.quotation_items.description || i.products?.name || "",
        quantity: i.quotation_items.quantity,
        unitPrice: i.quotation_items.unitPrice,
        discount: parseFloat(i.quotation_items.discount) > 0 ? i.quotation_items.discount : "0",
      }))
    );
    setShowEditQuotationModal(true);
  }

  function closeEditQuotationModal() {
    setShowEditQuotationModal(false);
    setEditQuotation(null);
    setEditQuotationForm({
      status: "draft", validDays: "30", note: "",
      buyerName: "", buyerPhone: "", buyerAddress: "", buyerTaxId: "",
      serviceFee: "", serviceDescription: "", discount: "",
      vatType: "vat_out", taxRate: "7", includeVat: false,
    });
    setEditQuotationItems([]);
    setProductQuery("");
    setProductResults([]);
  }

  async function handleSaveEditQuotation() {
    if (!editQuotation) return;
    setSavingQuotation(true);
    await updateQuotation(editQuotation.id, {
      status: editQuotationForm.status,
      validDays: parseInt(editQuotationForm.validDays) || 30,
      note: editQuotationForm.note,
      buyerName: editQuotationForm.buyerName,
      buyerPhone: editQuotationForm.buyerPhone,
      buyerAddress: editQuotationForm.buyerAddress,
      buyerTaxId: editQuotationForm.buyerTaxId,
      serviceFee: editQuotationForm.serviceFee || "0",
      serviceDescription: editQuotationForm.serviceDescription,
      discount: editQuotationForm.discount || "0",
      vatType: editQuotationForm.vatType,
      taxRate: editQuotationForm.taxRate,
      includeVat: editQuotationForm.includeVat,
      items: editQuotationItems.map(i => ({
        productId: i.productId,
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discount: i.discount || "0",
      })),
    });
    setSavingQuotation(false);
    closeEditQuotationModal();
    // Refresh quotations
    if (expandedCustomer) {
      const quotations = await getQuotationsByCustomerId(expandedCustomer);
      setCustomerQuotations(quotations);
    }
  }

  function openEditModal(sale: any) {
    setEditSale(sale);
    setEditForm({
      buyerName: sale.buyerName || "",
      buyerPhone: sale.buyerPhone || "",
      buyerAddress: sale.buyerAddress || "",
      buyerTaxId: sale.buyerTaxId || "",
      note: sale.note || "",
    });
    setShowEditModal(true);
  }

  function closeEditModal() {
    setShowEditModal(false);
    setEditSale(null);
    setEditForm({ buyerName: "", buyerPhone: "", buyerAddress: "", buyerTaxId: "", note: "" });
  }

  async function handleSaveEdit() {
    if (!editSale) return;
    setSaving(true);
    await updateSale(editSale.id, editForm);
    setSaving(false);
    closeEditModal();
    // Refresh sales
    if (expandedCustomer) {
      const sales = await getSalesByCustomerId(expandedCustomer);
      setCustomerSales(sales);
    }
  }

  async function handlePrintReceipt(sale: any) {
    const store = storeSettings || {};
    const items = await getSaleItemsBySaleId(sale.id);

    const copyLabels = ["สำหรับลูกค้า", "สำหรับบริษัท", "สำหรับบัญชี"];

    let itemsHtml = "";
    items.forEach((item: any, idx: number) => {
      const it = item.sale_items;
      const pName = it.description || item.products?.name || "-";
      const lineTotal = parseFloat(it.unitPrice) * it.quantity - parseFloat(it.discount || "0");
      itemsHtml += `<tr><td style="padding:2px 0;font-size:10px">${idx + 1}</td><td style="padding:2px 0;font-size:10px">${pName}</td><td style="text-align:center;padding:2px 0;font-size:10px">${it.quantity}</td><td style="text-align:right;padding:2px 0;font-size:10px">${formatCurrency(parseFloat(it.unitPrice))}</td><td style="text-align:right;padding:2px 0;font-size:10px">${formatCurrency(lineTotal)}</td></tr>`;
    });

    if (parseFloat(sale.serviceFee) > 0) {
      itemsHtml += `<tr style="color:#b45309"><td style="padding:2px 0;font-size:10px">${items.length + 1}</td><td style="padding:2px 0;font-size:10px">${sale.serviceDescription || "ค่าบริการ"}</td><td style="text-align:center;padding:2px 0;font-size:10px">1</td><td style="text-align:right;padding:2px 0;font-size:10px">${formatCurrency(parseFloat(sale.serviceFee))}</td><td style="text-align:right;padding:2px 0;font-size:10px">${formatCurrency(parseFloat(sale.serviceFee))}</td></tr>`;
    }

    const payLabel = sale.paymentMethod === "cash" ? "เงินสด" : sale.paymentMethod === "transfer" ? "โอนเงิน" : "เครดิต";

    function buildReceiptHtml(label: string, idx: number) {
      return `
        <div style="page-break-after:${idx < 2 ? "always" : "auto"};padding:8mm 10mm;font-family:Sarabun,sans-serif;font-size:12px;box-sizing:border-box;">
          <div style="text-align:right;font-size:11px;font-weight:bold;border-bottom:1px solid #999;padding-bottom:4px;margin-bottom:8px;">
            <span style="border:1px solid #666;padding:2px 8px;border-radius:4px;">${label}</span>
            <span style="margin-left:8px;color:#888;font-size:10px;">(${idx+1}/3)</span>
          </div>
          <div style="text-align:center;border-bottom:2px solid #2563eb;padding-bottom:12px;margin-bottom:12px;">
            <div style="font-size:18px;font-weight:bold;color:#2563eb;">${sale.isTaxInvoice ? "ใบกำกับภาษี" : "ใบเสร็จรับเงิน"}</div>
            <div style="font-size:14px;font-weight:600;margin-top:4px;">${store.storeName || "ร้านแบตเตอรี่"}</div>
            ${store.branchName ? `<div style="font-size:11px;color:#666;">${store.branchName}</div>` : ""}
            ${store.address ? `<div style="font-size:11px;color:#666;">ที่อยู่: ${store.address}</div>` : ""}
            ${store.phone ? `<div style="font-size:11px;color:#666;">โทร. ${store.phone}</div>` : ""}
            ${store.taxId ? `<div style="font-size:11px;color:#666;">เลขประจำตัวผู้เสียภาษี: ${store.taxId}</div>` : ""}
          </div>
          <div style="border-bottom:1px dashed #ccc;padding-bottom:8px;margin-bottom:8px;">
            <div style="display:flex;justify-content:space-between;"><span>เลขที่${sale.isTaxInvoice ? "ใบกำกับภาษี" : "บิล"}:</span><span style="font-weight:600;">${sale.isTaxInvoice ? sale.taxInvoiceNumber : sale.billNumber}</span></div>
            ${sale.isTaxInvoice ? `<div style="display:flex;justify-content:space-between;color:#888;"><span>เลขที่บิล:</span><span>${sale.billNumber}</span></div>` : ""}
            <div style="display:flex;justify-content:space-between;"><span>วันที่:</span><span>${new Date(sale.createdAt || new Date()).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}</span></div>
            <div style="display:flex;justify-content:space-between;"><span>เวลา:</span><span>${new Date(sale.createdAt || new Date()).toLocaleTimeString("th-TH")}</span></div>
          </div>
          ${sale.buyerName ? `
          <div style="border-bottom:1px dashed #ccc;padding-bottom:8px;margin-bottom:8px;padding:6px;background:#f9fafb;border-radius:4px;">
            <div style="font-weight:600;margin-bottom:4px;">ผู้ซื้อ:</div>
            <div>ชื่อ: ${sale.buyerName}</div>
            ${sale.buyerPhone ? `<div>โทร: ${sale.buyerPhone}</div>` : ""}
            ${sale.buyerAddress ? `<div>ที่อยู่: ${sale.buyerAddress}</div>` : ""}
            ${sale.isTaxInvoice && sale.buyerTaxId ? `<div>เลขประจำตัวผู้เสียภาษี: ${sale.buyerTaxId}</div>` : ""}
          </div>` : ""}
          <div style="border-bottom:1px dashed #ccc;padding-bottom:8px;margin-bottom:8px;">
            <table style="width:100%;border-collapse:collapse;">
              <thead><tr style="border-bottom:1px solid #ddd;"><th style="text-align:left;padding:4px 0;font-weight:600;font-size:10px;">#</th><th style="text-align:left;padding:4px 0;font-weight:600;font-size:10px;">รายการ</th><th style="text-align:center;padding:4px 0;font-weight:600;width:50px;font-size:10px;">จำนวน</th><th style="text-align:right;padding:4px 0;font-weight:600;width:70px;font-size:10px;">หน่วยละ</th><th style="text-align:right;padding:4px 0;font-weight:600;width:70px;font-size:10px;">จำนวนเงิน</th></tr></thead>
              <tbody>${itemsHtml}</tbody>
            </table>
          </div>
          <div style="margin-bottom:8px;">
            <div style="display:flex;justify-content:space-between;"><span>รวมมูลค่าสินค้า/บริการ</span><span>${formatCurrency(parseFloat(sale.subtotal) + parseFloat(sale.serviceFee || "0"))}</span></div>
            ${parseFloat(sale.discount) > 0 ? `<div style="display:flex;justify-content:space-between;color:#dc2626;"><span>ส่วนลด</span><span>-${formatCurrency(parseFloat(sale.discount))}</span></div>` : ""}
            ${sale.isTaxInvoice ? `
              <div style="display:flex;justify-content:space-between;"><span>มูลค่าก่อนภาษี</span><span>${formatCurrency(parseFloat(sale.total) - parseFloat(sale.taxAmount || "0"))}</span></div>
              <div style="display:flex;justify-content:space-between;color:#2563eb;"><span>ภาษีมูลค่าเพิ่ม ${sale.vatType === "vat_in" ? "(รวมในราคา)" : ""} ${sale.taxRate}%</span><span>${formatCurrency(parseFloat(sale.taxAmount || "0"))}</span></div>
            ` : ""}
            <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:16px;padding-top:8px;border-top:2px solid #999;margin-top:8px;"><span>จำนวนเงินรวมทั้งสิ้น</span><span style="color:#2563eb;">${formatCurrency(parseFloat(sale.total))}</span></div>
          </div>
          <div style="border-bottom:1px dashed #ccc;padding-bottom:8px;margin-bottom:8px;">
            <div style="display:flex;justify-content:space-between;"><span>วิธีชำระ:</span><span style="font-weight:600;">${payLabel}</span></div>
            ${sale.note ? `<div style="color:#888;margin-top:4px;">หมายเหตุ: ${sale.note}</div>` : ""}
          </div>
          <div style="text-align:center;color:#888;margin-bottom:8px;">ขอบคุณที่ใช้บริการ</div>
          ${sale.isTaxInvoice ? `
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

  async function handlePrintQuotation(qt: any) {
    const store = storeSettings || {};
    const items = await getQuotationItems(qt.id);
    const isConverted = qt.status === "converted";
    const isReceipt = isConverted;
    const docTitle = isReceipt ? (qt.includeVat ? "ใบกำกับภาษี" : "ใบเสร็จรับเงิน") : "ใบเสนอราคา / Quotation";
    const accentColor = isReceipt ? "#2563eb" : "#2563eb";
    const printTitle = isReceipt ? "พิมพ์ใบเสร็จ" : "พิมพ์ใบเสนอราคา";

    const copyLabels = ["สำหรับลูกค้า", "สำหรับบริษัท", "สำหรับบัญชี"];

    let itemsHtml = "";
    if (isReceipt) {
      items.forEach((item: any, idx: number) => {
        const it = item.quotation_items;
        const pName = it.description || item.products?.name || "-";
        const lineTotal = parseFloat(it.unitPrice) * it.quantity - parseFloat(it.discount || "0");
        itemsHtml += `<tr><td style="padding:2px 0;font-size:10px">${idx + 1}</td><td style="padding:2px 0;font-size:10px">${pName}</td><td style="text-align:center;padding:2px 0;font-size:10px">${it.quantity}</td><td style="text-align:right;padding:2px 0;font-size:10px">${formatCurrency(parseFloat(it.unitPrice))}</td><td style="text-align:right;padding:2px 0;font-size:10px">${formatCurrency(lineTotal)}</td></tr>`;
      });
      if (parseFloat(qt.serviceFee) > 0) {
        itemsHtml += `<tr style="color:#b45309"><td style="padding:2px 0;font-size:10px">${items.length + 1}</td><td style="padding:2px 0;font-size:10px">${qt.serviceDescription || "ค่าบริการ"}</td><td style="text-align:center;padding:2px 0;font-size:10px">1</td><td style="text-align:right;padding:2px 0;font-size:10px">${formatCurrency(parseFloat(qt.serviceFee))}</td><td style="text-align:right;padding:2px 0;font-size:10px">${formatCurrency(parseFloat(qt.serviceFee))}</td></tr>`;
      }
    } else {
      items.forEach((item: any, idx: number) => {
        const it = item.quotation_items;
        const pName = it.description || item.products?.name || "-";
        const lineTotal = parseFloat(it.unitPrice) * it.quantity - parseFloat(it.discount || "0");
        itemsHtml += `<tr><td style="padding:4px 0;font-size:11px;">${idx + 1}</td><td style="padding:4px 0;font-size:11px;">${pName}</td><td style="text-align:center;padding:4px 0;font-size:11px;">${it.quantity}</td><td style="text-align:right;padding:4px 0;font-size:11px;">${formatCurrency(parseFloat(it.unitPrice))}</td><td style="text-align:right;padding:4px 0;font-size:11px;">${parseFloat(it.discount) > 0 ? formatCurrency(parseFloat(it.discount)) : "-"}</td><td style="text-align:right;padding:4px 0;font-size:11px;">${formatCurrency(lineTotal)}</td></tr>`;
      });
      if (parseFloat(qt.serviceFee) > 0) {
        itemsHtml += `<tr style="color:#b45309;"><td style="padding:4px 0;font-size:11px;">${items.length + 1}</td><td style="padding:4px 0;font-size:11px;">${qt.serviceDescription || "ค่าบริการ"}</td><td style="text-align:center;padding:4px 0;font-size:11px;">1</td><td style="text-align:right;padding:4px 0;font-size:11px;">${formatCurrency(parseFloat(qt.serviceFee))}</td><td style="text-align:right;padding:4px 0;font-size:11px;">-</td><td style="text-align:right;padding:4px 0;font-size:11px;">${formatCurrency(parseFloat(qt.serviceFee))}</td></tr>`;
      }
    }

    const validDate = new Date(qt.createdAt);
    validDate.setDate(validDate.getDate() + (qt.validDays || 30));

    function buildPageHtml(label: string, idx: number) {
      if (isReceipt) {
        return `
        <div style="page-break-after:${idx < 2 ? "always" : "auto"};padding:8mm 10mm;font-family:Sarabun,sans-serif;font-size:12px;box-sizing:border-box;">
          <div style="text-align:right;font-size:11px;font-weight:bold;border-bottom:1px solid #999;padding-bottom:4px;margin-bottom:8px;">
            <span style="border:1px solid #666;padding:2px 8px;border-radius:4px;">${label}</span>
            <span style="margin-left:8px;color:#888;font-size:10px;">(${idx+1}/3)</span>
          </div>
          <div style="text-align:center;border-bottom:2px solid ${accentColor};padding-bottom:12px;margin-bottom:12px;">
            <div style="font-size:18px;font-weight:bold;color:${accentColor};">${docTitle}</div>
            <div style="font-size:14px;font-weight:600;margin-top:4px;">${store.storeName || "ร้านแบตเตอรี่"}</div>
            ${store.branchName ? `<div style="font-size:11px;color:#666;">${store.branchName}</div>` : ""}
            ${store.address ? `<div style="font-size:11px;color:#666;">ที่อยู่: ${store.address}</div>` : ""}
            ${store.phone ? `<div style="font-size:11px;color:#666;">โทร. ${store.phone}</div>` : ""}
            ${store.taxId ? `<div style="font-size:11px;color:#666;">เลขประจำตัวผู้เสียภาษี: ${store.taxId}</div>` : ""}
          </div>
          <div style="border-bottom:1px dashed #ccc;padding-bottom:8px;margin-bottom:8px;">
            <div style="display:flex;justify-content:space-between;"><span>เลขที่:</span><span style="font-weight:600;">${qt.quotationNumber}</span></div>
            <div style="display:flex;justify-content:space-between;"><span>วันที่:</span><span>${new Date(qt.createdAt).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}</span></div>
            <div style="display:flex;justify-content:space-between;"><span>เวลา:</span><span>${new Date(qt.createdAt).toLocaleTimeString("th-TH")}</span></div>
          </div>
          ${qt.buyerName ? `
          <div style="border-bottom:1px dashed #ccc;padding-bottom:8px;margin-bottom:8px;padding:6px;background:#f9fafb;border-radius:4px;">
            <div style="font-weight:600;margin-bottom:4px;">ผู้ซื้อ:</div>
            <div>ชื่อ: ${qt.buyerName}</div>
            ${qt.buyerPhone ? `<div>โทร: ${qt.buyerPhone}</div>` : ""}
            ${qt.buyerAddress ? `<div>ที่อยู่: ${qt.buyerAddress}</div>` : ""}
            ${qt.includeVat && qt.buyerTaxId ? `<div>เลขประจำตัวผู้เสียภาษี: ${qt.buyerTaxId}</div>` : ""}
          </div>` : ""}
          <div style="border-bottom:1px dashed #ccc;padding-bottom:8px;margin-bottom:8px;">
            <table style="width:100%;border-collapse:collapse;">
              <thead><tr style="border-bottom:1px solid #ddd;"><th style="text-align:left;padding:4px 0;font-weight:600;font-size:10px;">#</th><th style="text-align:left;padding:4px 0;font-weight:600;font-size:10px;">รายการ</th><th style="text-align:center;padding:4px 0;font-weight:600;width:50px;font-size:10px;">จำนวน</th><th style="text-align:right;padding:4px 0;font-weight:600;width:70px;font-size:10px;">หน่วยละ</th><th style="text-align:right;padding:4px 0;font-weight:600;width:70px;font-size:10px;">จำนวนเงิน</th></tr></thead>
              <tbody>${itemsHtml}</tbody>
            </table>
          </div>
          <div style="margin-bottom:8px;">
            <div style="display:flex;justify-content:space-between;"><span>รวมมูลค่าสินค้า/บริการ</span><span>${formatCurrency(parseFloat(qt.subtotal) + parseFloat(qt.serviceFee || "0"))}</span></div>
            ${parseFloat(qt.discount) > 0 ? `<div style="display:flex;justify-content:space-between;color:#dc2626;"><span>ส่วนลด</span><span>-${formatCurrency(parseFloat(qt.discount))}</span></div>` : ""}
            ${qt.includeVat ? `
              <div style="display:flex;justify-content:space-between;"><span>มูลค่าก่อนภาษี</span><span>${formatCurrency(parseFloat(qt.total) - parseFloat(qt.taxAmount || "0"))}</span></div>
              <div style="display:flex;justify-content:space-between;color:#2563eb;"><span>ภาษีมูลค่าเพิ่ม ${qt.vatType === "vat_in" ? "(รวมในราคา)" : ""} ${qt.taxRate}%</span><span>${formatCurrency(parseFloat(qt.taxAmount || "0"))}</span></div>
            ` : ""}
            <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:16px;padding-top:8px;border-top:2px solid #999;margin-top:8px;"><span>จำนวนเงินรวมทั้งสิ้น</span><span style="color:${accentColor};">${formatCurrency(parseFloat(qt.total))}</span></div>
          </div>
          ${qt.note ? `<div style="border-bottom:1px dashed #ccc;padding-bottom:8px;margin-bottom:8px;"><span style="color:#888;">หมายเหตุ: ${qt.note}</span></div>` : ""}
          <div style="text-align:center;color:#888;margin-bottom:8px;">ขอบคุณที่ใช้บริการ</div>
          ${qt.includeVat ? `
          <div style="display:flex;justify-content:space-between;margin-top:16px;padding-top:8px;border-top:1px solid #ddd;">
            <div style="text-align:center;width:100px;"><div style="border-bottom:1px solid #ccc;height:32px;margin-bottom:4px;"></div><div>ผู้รับเงิน</div><div style="font-size:10px;color:#888;">วันที่</div></div>
            <div style="text-align:center;width:100px;"><div style="border-bottom:1px solid #ccc;height:32px;margin-bottom:4px;"></div><div>ผู้สั่งซื้อ</div><div style="font-size:10px;color:#888;">วันที่</div></div>
          </div>` : ""}
        </div>
        `;
      } else {
        return `
        <div style="page-break-after:${idx < 2 ? "always" : "auto"};padding:10mm 12mm;font-family:Sarabun,sans-serif;font-size:12px;">
          <div style="text-align:right;font-size:11px;font-weight:bold;border-bottom:1px solid #999;padding-bottom:4px;margin-bottom:8px;">
            <span style="border:1px solid #666;padding:2px 8px;border-radius:4px;">${label}</span>
            <span style="margin-left:8px;color:#888;font-size:10px;">(${idx + 1}/3)</span>
          </div>
          <div style="text-align:center;border-bottom:2px solid ${accentColor};padding-bottom:12px;margin-bottom:12px;">
            <div style="font-size:20px;font-weight:bold;color:${accentColor};">${docTitle}</div>
            <div style="font-size:14px;font-weight:600;margin-top:4px;">${store.storeName || "ร้านแบตเตอรี่"}</div>
            ${store.branchName ? `<div style="font-size:11px;color:#666;">${store.branchName}</div>` : ""}
            ${store.address ? `<div style="font-size:11px;color:#666;">ที่อยู่: ${store.address}</div>` : ""}
            ${store.phone ? `<div style="font-size:11px;color:#666;">โทร. ${store.phone}</div>` : ""}
            ${store.taxId ? `<div style="font-size:11px;color:#666;">เลขประจำตัวผู้เสียภาษี: ${store.taxId}</div>` : ""}
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
            <div style="flex:1;">
              <div style="font-weight:600;margin-bottom:4px;">ลูกค้า:</div>
              ${qt.buyerName ? `<div>ชื่อ: ${qt.buyerName}</div>` : ""}
              ${qt.buyerPhone ? `<div>โทร: ${qt.buyerPhone}</div>` : ""}
              ${qt.buyerAddress ? `<div>ที่อยู่: ${qt.buyerAddress}</div>` : ""}
              ${qt.buyerTaxId ? `<div>เลขประจำตัวผู้เสียภาษี: ${qt.buyerTaxId}</div>` : ""}
            </div>
            <div style="text-align:right;">
              <div style="display:flex;justify-content:space-between;gap:16px;"><span>เลขที่:</span><span style="font-weight:600;">${qt.quotationNumber}</span></div>
              <div style="display:flex;justify-content:space-between;gap:16px;"><span>วันที่:</span><span>${new Date(qt.createdAt).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}</span></div>
              <div style="display:flex;justify-content:space-between;gap:16px;"><span>ใช้ได้ถึง:</span><span>${validDate.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}</span></div>
            </div>
          </div>
          <div style="border-bottom:1px dashed #ccc;margin-bottom:8px;">
            <table style="width:100%;border-collapse:collapse;">
              <thead><tr style="border-bottom:1px solid #ddd;"><th style="text-align:left;padding:4px 0;font-weight:600;font-size:11px;">#</th><th style="text-align:left;padding:4px 0;font-weight:600;font-size:11px;">รายการ</th><th style="text-align:center;padding:4px 0;font-weight:600;font-size:11px;">จำนวน</th><th style="text-align:right;padding:4px 0;font-weight:600;font-size:11px;">หน่วยละ</th><th style="text-align:right;padding:4px 0;font-weight:600;font-size:11px;">ส่วนลด</th><th style="text-align:right;padding:4px 0;font-weight:600;font-size:11px;">จำนวนเงิน</th></tr></thead>
              <tbody>${itemsHtml}</tbody>
            </table>
          </div>
          <div style="margin-bottom:8px;">
            <div style="display:flex;justify-content:space-between;"><span>รวมมูลค่าสินค้า/บริการ</span><span>${formatCurrency(parseFloat(qt.subtotal) + parseFloat(qt.serviceFee || "0"))}</span></div>
            ${parseFloat(qt.discount) > 0 ? `<div style="display:flex;justify-content:space-between;color:#dc2626;"><span>ส่วนลด</span><span>-${formatCurrency(parseFloat(qt.discount))}</span></div>` : ""}
            ${qt.includeVat ? `
              <div style="display:flex;justify-content:space-between;"><span>มูลค่าก่อนภาษี</span><span>${formatCurrency(parseFloat(qt.total) - parseFloat(qt.taxAmount || "0"))}</span></div>
              <div style="display:flex;justify-content:space-between;color:#2563eb;"><span>ภาษีมูลค่าเพิ่ม ${qt.vatType === "vat_in" ? "(รวมในราคา)" : ""} ${qt.taxRate}%</span><span>${formatCurrency(parseFloat(qt.taxAmount || "0"))}</span></div>
            ` : ""}
            <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:16px;padding-top:8px;border-top:2px solid #999;margin-top:8px;"><span>จำนวนเงินรวมทั้งสิ้น</span><span style="color:${accentColor};">${formatCurrency(parseFloat(qt.total))}</span></div>
          </div>
          ${qt.note ? `<div style="border-bottom:1px dashed #ccc;padding-bottom:8px;margin-bottom:8px;"><span style="color:#888;">หมายเหตุ: ${qt.note}</span></div>` : ""}
          <div style="display:flex;justify-content:space-between;margin-top:24px;padding-top:8px;border-top:1px solid #ddd;">
            <div style="text-align:center;width:120px;"><div style="border-bottom:1px solid #ccc;height:40px;margin-bottom:4px;"></div><div>ผู้เสนอราคา</div><div style="font-size:10px;color:#888;">วันที่</div></div>
            <div style="text-align:center;width:120px;"><div style="border-bottom:1px solid #ccc;height:40px;margin-bottom:4px;"></div><div>ผู้อนุมัติ</div><div style="font-size:10px;color:#888;">วันที่</div></div>
          </div>
        </div>
        `;
      }
    }

    const allPages = copyLabels.map((label, idx) => buildPageHtml(label, idx)).join("");

    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="utf-8">
        <title>${printTitle}</title>
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">จัดการลูกค้า</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">เพิ่ม แก้ไข และจัดการข้อมูลลูกค้า</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-xl gradient-blue px-4 py-2.5 text-sm font-semibold text-white shadow-luxury hover:shadow-luxury-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] w-fit"><Plus className="h-4 w-4" /> เพิ่มลูกค้า</button>
      </div>

      {showForm && (
        <div className="rounded-2xl bg-white border border-blue-100/60 shadow-luxury overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-blue-100/60 bg-gradient-to-r from-blue-50/80 to-white">
            <h2 className="text-lg font-bold tracking-tight">{editId ? "แก้ไขลูกค้า" : "เพิ่มลูกค้าใหม่"}</h2>
            <button onClick={resetForm} className="rounded-lg p-1.5 hover:bg-blue-100 transition-colors"><X className="h-4 w-4 text-muted-foreground" /></button>
          </div>
          <div className="p-6">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <Label>ชื่อลูกค้า *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <Label>เบอร์โทร</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <Label>ทะเบียนรถ</Label>
                <Input value={form.licensePlate} onChange={(e) => setForm({ ...form, licensePlate: e.target.value })} />
              </div>
              <div>
                <Label>ที่อยู่</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div>
                <Label>เลขประจำตัวผู้เสียภาษี</Label>
                <Input value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} placeholder="xxx-xxx-xxx-xxx" />
              </div>
              <div className="md:col-span-3">
                <button type="submit" className="rounded-xl gradient-blue px-6 py-2.5 text-sm font-semibold text-white shadow-luxury hover:shadow-luxury-lg transition-all">{editId ? "บันทึกการแก้ไข" : "เพิ่มลูกค้า"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Sale Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-50/80 to-white">
              <h2 className="text-lg font-bold">แก้ไขใบเสร็จ</h2>
              <button onClick={closeEditModal} className="rounded-lg p-1.5 hover:bg-blue-100 transition-colors">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-xs text-muted-foreground mb-2">
                เลขที่: {editSale?.isTaxInvoice ? editSale?.taxInvoiceNumber : editSale?.billNumber}
              </div>
              <div>
                <Label>ชื่อผู้ซื้อ</Label>
                <Input value={editForm.buyerName} onChange={(e) => setEditForm({ ...editForm, buyerName: e.target.value })} />
              </div>
              <div>
                <Label>เบอร์โทร</Label>
                <Input value={editForm.buyerPhone} onChange={(e) => setEditForm({ ...editForm, buyerPhone: e.target.value })} />
              </div>
              <div>
                <Label>ที่อยู่</Label>
                <Input value={editForm.buyerAddress} onChange={(e) => setEditForm({ ...editForm, buyerAddress: e.target.value })} />
              </div>
              <div>
                <Label>เลขประจำตัวผู้เสียภาษี</Label>
                <Input value={editForm.buyerTaxId} onChange={(e) => setEditForm({ ...editForm, buyerTaxId: e.target.value })} />
              </div>
              <div>
                <Label>หมายเหตุ</Label>
                <Input value={editForm.note} onChange={(e) => setEditForm({ ...editForm, note: e.target.value })} />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={closeEditModal} className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">ยกเลิก</button>
                <button onClick={handleSaveEdit} disabled={saving} className="flex-1 rounded-xl gradient-blue px-4 py-2.5 text-sm font-semibold text-white shadow-luxury hover:shadow-luxury-lg transition-all disabled:opacity-50">
                  {saving ? "กำลังบันทึก..." : "บันทึก"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Filter */}
      <div className="bg-white rounded-xl border border-blue-100/60 p-3 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาลูกค้า... ชื่อ, เบอร์โทร, ทะเบียนรถ, ที่อยู่"
            className="pl-10 h-10 border-blue-200/60 focus:border-blue-400"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="sm:hidden space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-bold">รายชื่อลูกค้า</span>
            <span className="text-xs text-muted-foreground">({filteredCustomers.length} ราย{searchQuery ? ` จาก ${customers.length}` : ""})</span>
          </div>
          <Button variant="outline" size="sm" onClick={async () => {
            const rows = customers.map((c: any) => ({
              "ชื่อลูกค้า": c.name, "เบอร์โทร": c.phone || "-", "ทะเบียนรถ": c.licensePlate || "-", "ที่อยู่": c.address || "-", "เลขประจำตัวผู้เสียภาษี": c.taxId || "-",
            }));
            const { exportToExcel } = await loadExportExcel(); exportToExcel(rows, `รายชื่อลูกค้า_${new Date().toLocaleDateString("th-TH")}`, "ลูกค้า");
          }} className="h-7 text-[11px] border-blue-200 hover:bg-blue-50 text-blue-700 gap-1 rounded-lg">
            <Download className="h-3 w-3" /> Excel
          </Button>
        </div>
        {filteredCustomers.map((c: any) => (
          <div key={c.id} className="rounded-2xl bg-white border border-blue-100/60 shadow-sm overflow-hidden">
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-gray-800 truncate">{c.name}</h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                    {c.phone && <span className="flex items-center gap-1">📞 {c.phone}</span>}
                    {c.licensePlate && <span className="flex items-center gap-1 text-blue-600 font-medium">🚗 {c.licensePlate}</span>}
                  </div>
                  {c.address && <p className="text-[11px] text-muted-foreground mt-1 truncate">📍 {c.address}</p>}
                  {c.taxId && <p className="text-[11px] text-blue-600 mt-0.5">TAX: {c.taxId}</p>}
                </div>
              </div>
            </div>
            <div className="flex items-center border-t border-blue-100/60 divide-x divide-blue-100/60">
              <button onClick={() => toggleCustomerSales(c.id)} className="flex-1 flex items-center justify-center gap-1.5 h-10 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors">
                {expandedCustomer === c.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                ประวัติ
              </button>
              <button onClick={() => startEdit(c)} className="flex-1 flex items-center justify-center gap-1.5 h-10 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors">
                <Pencil className="h-3.5 w-3.5" /> แก้ไข
              </button>
              <button onClick={() => handleDelete(c.id)} className="flex items-center justify-center h-10 w-12 text-red-500 hover:bg-red-50 transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            {expandedCustomer === c.id && (
              <div className="border-t border-blue-100/60 bg-gray-50/50 p-3 space-y-3">
                {loadingSales || loadingQuotations ? (
                  <div className="text-center py-4 text-xs text-muted-foreground">กำลังโหลด...</div>
                ) : (
                  <>
                    {customerQuotations.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-2"><FileSpreadsheet className="h-3.5 w-3.5 text-blue-500" /><span className="text-xs font-bold text-blue-700">ใบเสนอราคา ({customerQuotations.length})</span></div>
                        {customerQuotations.map((q: any) => {
                          const qt = q.quotations;
                          return (
                            <div key={qt.id} className="rounded-lg border border-blue-200 bg-white p-3 mb-2 text-xs">
                              <div className="flex justify-between items-center"><span className="font-semibold text-blue-600">{qt.quotationNumber}</span><span className="font-bold text-blue-600">{formatCurrency(parseFloat(qt.total))}</span></div>
                              <div className="text-muted-foreground mt-1">{new Date(qt.createdAt).toLocaleDateString("th-TH")}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {customerSales.length > 0 ? (
                      <div>
                        <div className="flex items-center gap-1.5 mb-2"><Receipt className="h-3.5 w-3.5 text-blue-500" /><span className="text-xs font-bold text-blue-700">ประวัติซื้อ ({customerSales.length})</span></div>
                        {customerSales.map((s: any) => {
                          const sale = s.sales;
                          return (
                            <div key={sale.id} className="rounded-lg border border-blue-200 bg-white p-3 mb-2 text-xs">
                              <div className="flex justify-between items-center"><span className="font-semibold">{sale.isTaxInvoice ? sale.taxInvoiceNumber : sale.billNumber}</span><span className="font-bold text-blue-600">{formatCurrency(parseFloat(sale.total))}</span></div>
                              <div className="flex justify-between items-center mt-1 text-muted-foreground"><span>{new Date(sale.createdAt).toLocaleDateString("th-TH")}</span><PaymentBadge paymentMethod={sale.paymentMethod} /></div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-3 text-xs text-muted-foreground">ยังไม่มีประวัติ</div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))}
        {customers.length === 0 && (
          <div className="text-center text-muted-foreground py-12 bg-white rounded-2xl border border-blue-100/60">
            <Users className="h-8 w-8 mx-auto mb-2 text-blue-200" />ยังไม่มีลูกค้า
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block rounded-2xl bg-white border border-blue-100/60 shadow-luxury overflow-hidden">
        <div className="px-3 sm:px-5 py-3 border-b border-blue-100/60 bg-gradient-to-r from-blue-50/80 to-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-bold">รายชื่อลูกค้า</span>
            <span className="text-xs text-muted-foreground">({filteredCustomers.length} ราย{searchQuery ? ` จาก ${customers.length}` : ""})</span>
          </div>
          <Button variant="outline" size="sm" onClick={async () => {
            const rows = filteredCustomers.map((c: any) => ({
              "ชื่อลูกค้า": c.name,
              "เบอร์โทร": c.phone || "-",
              "ทะเบียนรถ": c.licensePlate || "-",
              "ที่อยู่": c.address || "-",
              "เลขประจำตัวผู้เสียภาษี": c.taxId || "-",
            }));
            const { exportToExcel } = await loadExportExcel(); exportToExcel(rows, `รายชื่อลูกค้า_${new Date().toLocaleDateString("th-TH")}`, "ลูกค้า");
          }} className="h-7 text-[11px] border-blue-200 hover:bg-blue-50 text-blue-700 gap-1 rounded-lg">
            <Download className="h-3 w-3" /> ส่งออก Excel
          </Button>
        </div>
        <div className="p-0 overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow className="bg-blue-50/50 hover:bg-blue-50/50">
                <TableHead className="font-semibold w-8"></TableHead>
                <TableHead className="font-semibold">ชื่อลูกค้า</TableHead>
                <TableHead className="font-semibold">เบอร์โทร</TableHead>
                <TableHead className="font-semibold">ทะเบียนรถ</TableHead>
                <TableHead className="font-semibold">ที่อยู่</TableHead>
                <TableHead className="font-semibold">เลขประจำตัวผู้เสียภาษี</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((c: any) => (
                <>
                  <TableRow key={c.id} className="hover:bg-blue-50/30">
                    <TableCell>
                      <button
                        onClick={() => toggleCustomerSales(c.id)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg hover:bg-blue-100 transition-colors"
                        title="ดูประวัติการซื้อ"
                      >
                        {expandedCustomer === c.id ? <ChevronUp className="h-4 w-4 text-blue-500" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </button>
                    </TableCell>
                    <TableCell className="font-semibold">{c.name}</TableCell>
                    <TableCell>{c.phone || "-"}</TableCell>
                    <TableCell className="text-blue-700 font-medium">{c.licensePlate || "-"}</TableCell>
                    <TableCell className="text-muted-foreground">{c.address || "-"}</TableCell>
                    <TableCell className="text-blue-600 font-medium">{c.taxId || "-"}</TableCell>
                    <TableCell className="text-right">
                      <button onClick={() => startEdit(c)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-blue-50 transition-colors"><Pencil className="h-4 w-4 text-muted-foreground" /></button>
                      <button onClick={() => handleDelete(c.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-red-50 transition-colors"><Trash2 className="h-4 w-4 text-red-400" /></button>
                    </TableCell>
                  </TableRow>
                  {expandedCustomer === c.id && (
                    <>
                      {/* Quotations Section - แสดงก่อน */}
                      <TableRow key={`quotations-${c.id}`}>
                        <TableCell colSpan={7} className="p-0 bg-gradient-to-r from-blue-50/30 to-purple-50/20">
                          <div className="px-6 py-4">
                            <div className="flex items-center gap-2 mb-3">
                              <FileSpreadsheet className="h-4 w-4 text-blue-500" />
                              <h3 className="text-sm font-bold text-blue-700">ประวัติใบเสนอราคา ของ {c.name}</h3>
                            </div>
                            {loadingQuotations ? (
                              <div className="text-center py-4 text-sm text-muted-foreground">กำลังโหลด...</div>
                            ) : customerQuotations.length === 0 ? (
                              <div className="text-center py-4 text-sm text-muted-foreground">ยังไม่มีประวัติใบเสนอราคา</div>
                            ) : (
                              <div className="space-y-2">
                                {customerQuotations.map((q: any) => {
                                  const qt = q.quotations;
                                  const emp = q.employees;
                                  const statusColors: Record<string, string> = {
                                    draft: "bg-gray-100 text-gray-700",
                                    sent: "bg-blue-100 text-blue-700",
                                    accepted: "bg-green-100 text-green-700",
                                    rejected: "bg-red-100 text-red-700",
                                    expired: "bg-yellow-100 text-yellow-700",
                                    converted: "bg-purple-100 text-purple-700",
                                  };
                                  const statusLabels: Record<string, string> = {
                                    draft: "แบบร่าง",
                                    sent: "ส่งแล้ว",
                                    accepted: "ยอมรับ",
                                    rejected: "ปฏิเสธ",
                                    expired: "หมดอายุ",
                                    converted: "แปลงเป็นบิล",
                                  };
                                  const validDate = new Date(qt.createdAt);
                                  validDate.setDate(validDate.getDate() + (qt.validDays || 30));
                                  const isExpired = new Date() > validDate && qt.status === "draft";
                                  
                                  return (
                                    <div key={qt.id} className="rounded-xl border border-blue-200 bg-white overflow-hidden">
                                      <button
                                        onClick={() => toggleQuotationItems(qt.id)}
                                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-blue-50/50 transition-colors text-left"
                                      >
                                        <div className="flex items-center gap-3">
                                          <div className="rounded-lg p-1.5 bg-blue-100">
                                            <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                                          </div>
                                          <div>
                                            <div className="flex items-center gap-2">
                                              <span className="text-xs font-bold">{qt.quotationNumber}</span>
                                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[qt.status] || statusColors.draft}`}>
                                                {statusLabels[qt.status] || qt.status}
                                              </span>
                                              {isExpired && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                                                  หมดอายุแล้ว
                                                </span>
                                              )}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground">
                                              {new Date(qt.createdAt).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" })}
                                              {" • "}ใช้ได้ถึง {validDate.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" })}
                                              {" • "}{emp?.name || "-"}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <span className="text-sm font-bold text-blue-600">{formatCurrency(parseFloat(qt.total))}</span>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); openEditQuotationModal(qt); }}
                                            className="inline-flex h-6 w-6 items-center justify-center rounded-lg hover:bg-blue-100 transition-colors"
                                            title="แก้ไข"
                                          >
                                            <Pencil className="h-3 w-3 text-muted-foreground" />
                                          </button>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handlePrintQuotation(qt); }}
                                            className="inline-flex h-6 w-6 items-center justify-center rounded-lg hover:bg-blue-100 transition-colors"
                                            title="พิมพ์ใบเสนอราคา"
                                          >
                                            <Printer className="h-3 w-3 text-blue-600" />
                                          </button>
                                          {expandedQuotation === qt.id ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                                        </div>
                                      </button>
                                      {expandedQuotation === qt.id && (
                                        <div className="border-t border-blue-100 px-4 py-3 bg-blue-50/30">
                                          <table className="w-full text-xs">
                                            <thead>
                                              <tr className="text-muted-foreground">
                                                <th className="text-left py-1 font-medium">รายการ</th>
                                                <th className="text-center py-1 font-medium w-16">จำนวน</th>
                                                <th className="text-right py-1 font-medium w-20">หน่วยละ</th>
                                                <th className="text-right py-1 font-medium w-20">รวม</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {quotationItems.map((qi: any, idx: number) => (
                                                <tr key={idx} className="border-t border-gray-100">
                                                  <td className="py-1.5">{qi.quotation_items.description || qi.products?.name || "-"}</td>
                                                  <td className="text-center py-1.5">{qi.quotation_items.quantity}</td>
                                                  <td className="text-right py-1.5">{formatCurrency(parseFloat(qi.quotation_items.unitPrice))}</td>
                                                  <td className="text-right py-1.5">{formatCurrency(parseFloat(qi.quotation_items.total))}</td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                          <div className="mt-2 pt-2 border-t border-gray-200 space-y-1 text-xs">
                                            <div className="flex justify-between">
                                              <span className="text-muted-foreground">รวมสินค้า</span>
                                              <span>{formatCurrency(parseFloat(qt.subtotal))}</span>
                                            </div>
                                            {parseFloat(qt.serviceFee) > 0 && (
                                              <div className="flex justify-between text-amber-600">
                                                <span>ค่าบริการ{qt.serviceDescription ? ` (${qt.serviceDescription})` : ""}</span>
                                                <span>+{formatCurrency(parseFloat(qt.serviceFee))}</span>
                                              </div>
                                            )}
                                            {parseFloat(qt.discount) > 0 && (
                                              <div className="flex justify-between text-red-500">
                                                <span>ส่วนลด</span>
                                                <span>-{formatCurrency(parseFloat(qt.discount))}</span>
                                              </div>
                                            )}
                                            {qt.includeVat && parseFloat(qt.taxAmount) > 0 && (
                                              <div className="flex justify-between text-blue-600">
                                                <span>ภาษีมูลค่าเพิ่ม {qt.vatType === "vat_in" ? "(รวมในราคา)" : ""} {qt.taxRate}%</span>
                                                <span>{formatCurrency(parseFloat(qt.taxAmount))}</span>
                                              </div>
                                            )}
                                            <div className="flex justify-between font-bold pt-1 border-t border-gray-200">
                                              <span>ยอดสุทธิ</span>
                                              <span className="text-blue-600">{formatCurrency(parseFloat(qt.total))}</span>
                                            </div>
                                            {qt.note && (
                                              <div className="text-muted-foreground mt-1">หมายเหตุ: {qt.note}</div>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Sales Section - แสดงหลัง */}
                      <TableRow key={`sales-${c.id}`}>
                        <TableCell colSpan={7} className="p-0 bg-gradient-to-r from-blue-50/30 to-blue-50/20">
                          <div className="px-6 py-4">
                            <div className="flex items-center gap-2 mb-3">
                              <Receipt className="h-4 w-4 text-blue-500" />
                              <h3 className="text-sm font-bold text-blue-700">ประวัติใบเสร็จ / ใบกำกับภาษี ของ {c.name}</h3>
                            </div>
                            {loadingSales ? (
                              <div className="text-center py-4 text-sm text-muted-foreground">กำลังโหลด...</div>
                            ) : customerSales.length === 0 ? (
                              <div className="text-center py-4 text-sm text-muted-foreground">ยังไม่มีประวัติการซื้อ</div>
                            ) : (
                              <div className="space-y-2">
                                {customerSales.map((s: any) => {
                                  const sale = s.sales;
                                  return (
                                    <div key={sale.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                                      <button
                                        onClick={() => toggleSaleItems(sale.id)}
                                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                                      >
                                        <div className="flex items-center gap-3">
                                          <div className={`rounded-lg p-1.5 ${sale.isTaxInvoice ? 'bg-blue-100' : 'bg-blue-100'}`}>
                                            <FileText className={`h-4 w-4 ${sale.isTaxInvoice ? 'text-blue-600' : 'text-blue-600'}`} />
                                          </div>
                                          <div>
                                            <div className="flex items-center gap-2">
                                              <span className="text-xs font-bold">
                                                {sale.isTaxInvoice ? sale.taxInvoiceNumber : sale.billNumber}
                                              </span>
                                              {sale.isTaxInvoice && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                                                  ใบกำกับภาษี
                                                </span>
                                              )}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground">
                                              {new Date(sale.createdAt).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" })} {new Date(sale.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                                              {" • "}
                                              <PaymentBadge paymentMethod={sale.paymentMethod} size="md" />
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <span className="text-sm font-bold text-blue-600">{formatCurrency(parseFloat(sale.total))}</span>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); openEditModal(sale); }}
                                            className="inline-flex h-6 w-6 items-center justify-center rounded-lg hover:bg-blue-100 transition-colors"
                                            title="แก้ไข"
                                          >
                                            <Pencil className="h-3 w-3 text-muted-foreground" />
                                          </button>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handlePrintReceipt(sale); }}
                                            className="inline-flex h-6 w-6 items-center justify-center rounded-lg hover:bg-blue-100 transition-colors"
                                            title="พิมพ์ใบเสร็จ"
                                          >
                                            <Printer className="h-3 w-3 text-green-600" />
                                          </button>
                                          {expandedSale === sale.id ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                                        </div>
                                      </button>
                                      {expandedSale === sale.id && (
                                        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/50">
                                          {loadingItems ? (
                                            <div className="text-center py-2 text-xs text-muted-foreground">กำลังโหลด...</div>
                                          ) : (
                                            <>
                                              <table className="w-full text-xs">
                                                <thead>
                                                  <tr className="text-muted-foreground">
                                                    <th className="text-left py-1 font-medium">สินค้า</th>
                                                    <th className="text-center py-1 font-medium w-16">จำนวน</th>
                                                    <th className="text-right py-1 font-medium w-20">หน่วยละ</th>
                                                    <th className="text-right py-1 font-medium w-20">รวม</th>
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  {saleItems.map((si: any, idx: number) => (
                                                    <tr key={idx} className="border-t border-gray-100">
                                                      <td className="py-1.5">{si.products?.name || "-"}</td>
                                                      <td className="text-center py-1.5">{si.sale_items.quantity}</td>
                                                      <td className="text-right py-1.5">{formatCurrency(parseFloat(si.sale_items.unitPrice))}</td>
                                                      <td className="text-right py-1.5">{formatCurrency(parseFloat(si.sale_items.total))}</td>
                                                    </tr>
                                                  ))}
                                                </tbody>
                                              </table>
                                              <div className="mt-2 pt-2 border-t border-gray-200 space-y-1 text-xs">
                                                <div className="flex justify-between">
                                                  <span className="text-muted-foreground">รวมสินค้า</span>
                                                  <span>{formatCurrency(parseFloat(sale.subtotal))}</span>
                                                </div>
                                                {parseFloat(sale.serviceFee) > 0 && (
                                                  <div className="flex justify-between text-amber-600">
                                                    <span>ค่าบริการ{sale.serviceDescription ? ` (${sale.serviceDescription})` : ""}</span>
                                                    <span>+{formatCurrency(parseFloat(sale.serviceFee))}</span>
                                                  </div>
                                                )}
                                                {parseFloat(sale.discount) > 0 && (
                                                  <div className="flex justify-between text-red-500">
                                                    <span>ส่วนลด</span>
                                                    <span>-{formatCurrency(parseFloat(sale.discount))}</span>
                                                  </div>
                                                )}
                                                {sale.isTaxInvoice && parseFloat(sale.taxAmount) > 0 && (
                                                  <div className="flex justify-between text-blue-600">
                                                    <span>ภาษีมูลค่าเพิ่ม {sale.vatType === "vat_in" ? "(รวมในราคา)" : ""} {sale.taxRate}%</span>
                                                    <span>{formatCurrency(parseFloat(sale.taxAmount))}</span>
                                                  </div>
                                                )}
                                                <div className="flex justify-between font-bold pt-1 border-t border-gray-200">
                                                  <span>ยอดสุทธิ</span>
                                                  <span className="text-blue-600">{formatCurrency(parseFloat(sale.total))}</span>
                                                </div>
                                                {sale.note && (
                                                  <div className="text-muted-foreground mt-1">หมายเหตุ: {sale.note}</div>
                                                )}
                                              </div>
                                            </>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    </>
                  )}
                </>
              ))}
              {customers.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12"><Users className="h-8 w-8 mx-auto mb-2 text-blue-200" />ยังไม่มีลูกค้า</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Edit Quotation Modal */}
      {showEditQuotationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-auto py-8">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-50/80 to-white">
              <h2 className="text-lg font-bold">แก้ไขใบเสนอราคา</h2>
              <button onClick={closeEditQuotationModal} className="rounded-lg p-1.5 hover:bg-blue-100 transition-colors">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-auto">
              {/* Quotation Number & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">เลขที่ใบเสนอราคา</Label>
                  <div className="text-sm font-semibold text-blue-600">{editQuotation?.quotationNumber}</div>
                </div>
                <div>
                  <Label className="text-xs">สถานะ</Label>
                  <select
                    className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm"
                    value={editQuotationForm.status}
                    onChange={(e) => setEditQuotationForm({ ...editQuotationForm, status: e.target.value })}
                  >
                    <option value="draft">แบบร่าง</option>
                    <option value="sent">ส่งแล้ว</option>
                    <option value="accepted">ยอมรับ</option>
                    <option value="rejected">ปฏิเสธ</option>
                    <option value="expired">หมดอายุ</option>
                    <option value="converted">แปลงเป็นบิล</option>
                  </select>
                </div>
              </div>

              {/* Valid Days */}
              <div>
                <Label className="text-xs">ใช้ได้ (วัน)</Label>
                <Input
                  type="number"
                  className="max-w-[120px]"
                  value={editQuotationForm.validDays}
                  onChange={(e) => setEditQuotationForm({ ...editQuotationForm, validDays: e.target.value })}
                />
              </div>

              {/* Buyer Info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">ชื่อลูกค้า</Label>
                  <Input
                    value={editQuotationForm.buyerName}
                    onChange={(e) => setEditQuotationForm({ ...editQuotationForm, buyerName: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">โทร</Label>
                  <Input
                    value={editQuotationForm.buyerPhone}
                    onChange={(e) => setEditQuotationForm({ ...editQuotationForm, buyerPhone: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">ที่อยู่</Label>
                  <Input
                    value={editQuotationForm.buyerAddress}
                    onChange={(e) => setEditQuotationForm({ ...editQuotationForm, buyerAddress: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">เลขผู้เสียภาษี</Label>
                  <Input
                    value={editQuotationForm.buyerTaxId}
                    onChange={(e) => setEditQuotationForm({ ...editQuotationForm, buyerTaxId: e.target.value })}
                  />
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-semibold">รายการสินค้า/บริการ</Label>
                  <div className="flex gap-2">
                    <Button type="button" variant="default" size="sm" className="text-xs h-8 gap-1.5 bg-blue-500 text-white hover:bg-blue-600" onClick={openProductBrowser}>
                      <Package className="h-3.5 w-3.5" /> เลือกสินค้า
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs h-8 gap-1" onClick={addCustomItemToEdit}><Plus className="h-3 w-3" /> เพิ่มรายการเอง</Button>
                  </div>
                </div>
                {/* Quick search */}
                <div className="relative mb-3">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input className="h-8 pl-8 text-xs rounded-lg border-gray-200" placeholder="พิมพ์ชื่อสินค้าเพื่อค้นหาเร็ว..." value={productQuery} onChange={(e) => handleSearchProduct(e.target.value)} />
                  {productResults.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-auto">
                      {productResults.map((p: any) => (
                        <div key={p.id} className="px-3 py-2 hover:bg-blue-50 cursor-pointer flex justify-between items-center text-xs border-b last:border-0" onClick={() => addProductToEdit(p)}>
                          <div>
                            <div className="font-medium">{p.name}</div>
                            {p.brand && <div className="text-muted-foreground text-[10px]">{p.brand} {p.model}</div>}
                          </div>
                          <div className="text-right">
                            <div className="text-blue-600 font-semibold">{formatCurrency(parseFloat(p.sellPrice))}</div>
                            <div className="text-[10px] text-muted-foreground">คงเหลือ {p.stock}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Item list */}
                <div className="space-y-2">
                  {editQuotationItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <Input className="h-7 text-xs mb-1" placeholder="รายละเอียด" value={item.description} onChange={(e) => updateEditQuotationItem(idx, "description", e.target.value)} />
                        <div className="flex gap-2">
                          <div className="w-16"><Input className="h-7 text-xs text-center" type="number" min={1} value={item.quantity} onChange={(e) => updateEditQuotationItem(idx, "quantity", parseInt(e.target.value) || 1)} /></div>
                          <div className="w-24"><Input className="h-7 text-xs text-right" placeholder="ราคา" value={item.unitPrice} onChange={(e) => updateEditQuotationItem(idx, "unitPrice", e.target.value)} /></div>
                          <div className="w-20"><Input className="h-7 text-xs text-right" placeholder="ส่วนลด" value={item.discount} onChange={(e) => updateEditQuotationItem(idx, "discount", e.target.value)} /></div>
                          <div className="text-xs font-semibold text-right pt-1.5 w-24 text-blue-600">
                            {formatCurrency(parseFloat(item.unitPrice || "0") * item.quantity - parseFloat(item.discount || "0"))}
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeEditQuotationItem(idx)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                    </div>
                  ))}
                  {editQuotationItems.length === 0 && (
                    <div className="text-center py-4 text-sm text-muted-foreground">ยังไม่มีรายการ</div>
                  )}
                </div>
              </div>

              {/* Service fee & Discount */}
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">ค่าบริการ</Label><Input type="number" value={editQuotationForm.serviceFee} onChange={(e) => setEditQuotationForm({ ...editQuotationForm, serviceFee: e.target.value })} placeholder="0" /></div>
                <div><Label className="text-xs">รายละเอียดบริการ</Label><Input value={editQuotationForm.serviceDescription} onChange={(e) => setEditQuotationForm({ ...editQuotationForm, serviceDescription: e.target.value })} /></div>
                <div><Label className="text-xs">ส่วนลดรวม</Label><Input type="number" value={editQuotationForm.discount} onChange={(e) => setEditQuotationForm({ ...editQuotationForm, discount: e.target.value })} placeholder="0" /></div>
              </div>

              {/* VAT */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={editQuotationForm.includeVat} onChange={(e) => setEditQuotationForm({ ...editQuotationForm, includeVat: e.target.checked })} className="rounded" />
                  คำนวณภาษี
                </label>
                {editQuotationForm.includeVat && (
                  <>
                    <select className="h-8 rounded-lg border px-2 text-xs" value={editQuotationForm.vatType} onChange={(e) => setEditQuotationForm({ ...editQuotationForm, vatType: e.target.value as any })}>
                      <option value="vat_out">แวทนอก</option>
                      <option value="vat_in">แวทใน</option>
                    </select>
                    <Input className="h-8 w-16 text-xs text-center" value={editQuotationForm.taxRate} onChange={(e) => setEditQuotationForm({ ...editQuotationForm, taxRate: e.target.value })} />
                    <span className="text-xs">%</span>
                  </>
                )}
              </div>

              {/* Note */}
              <div><Label className="text-xs">หมายเหตุ</Label><Input value={editQuotationForm.note} onChange={(e) => setEditQuotationForm({ ...editQuotationForm, note: e.target.value })} /></div>

              {/* Summary */}
              {(() => {
                const { subtotal, sfee, disc, tax, total } = getEditQuotationTotals();
                return (
                  <div className="bg-blue-50 rounded-xl p-3 space-y-1 text-sm">
                    <div className="flex justify-between"><span>รวมสินค้า</span><span>{formatCurrency(subtotal)}</span></div>
                    {sfee > 0 && <div className="flex justify-between text-amber-700"><span>ค่าบริการ</span><span>{formatCurrency(sfee)}</span></div>}
                    {disc > 0 && <div className="flex justify-between text-red-600"><span>ส่วนลด</span><span>-{formatCurrency(disc)}</span></div>}
                    {editQuotationForm.includeVat && <div className="flex justify-between text-blue-600"><span>ภาษี {editQuotationForm.taxRate}%</span><span>{formatCurrency(tax)}</span></div>}
                    <div className="flex justify-between font-bold text-lg pt-1 border-t border-blue-200"><span>ยอดรวมสุทธิ</span><span className="text-blue-600">{formatCurrency(total)}</span></div>
                  </div>
                );
              })()}

              <div className="flex gap-2 pt-2">
                <button onClick={closeEditQuotationModal} className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">ยกเลิก</button>
                <button onClick={handleSaveEditQuotation} disabled={savingQuotation || editQuotationItems.length === 0} className="flex-1 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-blue-600 transition-all disabled:opacity-50">
                  {savingQuotation ? "กำลังบันทึก..." : "บันทึก"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Browser Modal */}
      {showProductBrowser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-4xl max-h-[85vh] bg-white rounded-2xl shadow-xl border border-blue-100 flex flex-col mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500">
                  <Package className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">เลือกสินค้า</h2>
                  <p className="text-xs text-muted-foreground">คลิกเพื่อเพิ่มสินค้าลงรายการ</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowProductBrowser(false)}><X className="h-5 w-5" /></Button>
            </div>
            <div className="flex gap-3 p-4 border-b border-gray-100 bg-gray-50/50">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="h-9 pl-9" placeholder="ค้นหาสินค้า..." value={browserFilter} onChange={(e) => setBrowserFilter(e.target.value)} />
              </div>
              <select className="h-9 rounded-lg border border-gray-200 px-3 text-sm min-w-[160px]" value={browserCategory} onChange={(e) => setBrowserCategory(e.target.value)}>
                <option value="">ทุกหมวดหมู่</option>
                {allCategories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {(() => {
                const filtered = allProducts.filter((row: any) => {
                  const p = row.products || row;
                  const matchName = p.name.toLowerCase().includes(browserFilter.toLowerCase());
                  const matchBrand = (p.brand || "").toLowerCase().includes(browserFilter.toLowerCase());
                  const matchModel = (p.model || "").toLowerCase().includes(browserFilter.toLowerCase());
                  const matchCategory = !browserCategory || p.categoryId === parseInt(browserCategory);
                  return (matchName || matchBrand || matchModel) && matchCategory;
                });
                if (filtered.length === 0) {
                  return <div className="text-center text-muted-foreground py-12">ไม่พบสินค้า</div>;
                }
                return (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {filtered.map((row: any) => {
                      const p = row.products || row;
                      const cat = allCategories.find((c: any) => c.id === p.categoryId);
                      const alreadyAdded = editQuotationItems.find(item => item.productId === p.id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => addProductFromBrowser(row)}
                          className={`relative p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md ${
                            alreadyAdded ? "border-blue-400 bg-blue-50 ring-2 ring-blue-200" : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50"
                          }`}
                        >
                          {alreadyAdded && (
                            <div className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold shadow">
                              {editQuotationItems.filter(i => i.productId === p.id).reduce((sum, i) => sum + i.quantity, 0)}
                            </div>
                          )}
                          <div className="h-20 rounded-lg bg-gray-100 mb-2 flex items-center justify-center overflow-hidden">
                            {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" /> : <Package className="h-8 w-8 text-gray-300" />}
                          </div>
                          <div className="text-xs font-semibold line-clamp-2 mb-1">{p.name}</div>
                          {(p.brand || p.model) && <div className="text-[10px] text-muted-foreground mb-1">{p.brand} {p.model}</div>}
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-blue-600">{formatCurrency(parseFloat(p.sellPrice))}</span>
                            <span className="text-[10px] text-muted-foreground">คงเหลือ {p.stock}</span>
                          </div>
                          {cat && <span className="mt-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 text-muted-foreground">{cat.name}</span>}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
            <div className="flex items-center justify-between p-4 border-t border-gray-100 bg-gray-50/50">
              <div className="text-sm text-muted-foreground">
                เลือกแล้ว <span className="font-semibold text-blue-600">{editQuotationItems.length}</span> รายการ
                {editQuotationItems.length > 0 && (
                  <span> • รวม <span className="font-semibold">{formatCurrency(editQuotationItems.reduce((sum, item) => sum + parseFloat(item.unitPrice || "0") * item.quantity - parseFloat(item.discount || "0"), 0))}</span></span>
                )}
              </div>
              <Button className="bg-blue-500 text-white rounded-xl hover:bg-blue-600" onClick={() => setShowProductBrowser(false)}>เสร็จสิ้น</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

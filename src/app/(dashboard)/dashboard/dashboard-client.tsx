"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getDashboardStatsWithDate, getDailySalesChart, getTopProductsChart, getSaleById, sendStockDecreaseLineNotify, getStockDecreaseItemsSinceReset, resetStockFromSales } from "@/app/actions";
import dynamic from "next/dynamic";
import { formatCurrency } from "@/lib/utils";
import { ShoppingCart, Package, Users, TrendingUp, Zap, ExternalLink, Eye, Calendar, ChevronDown, ChevronUp, Printer, Receipt, X, BarChart3, PieChart as PieIcon, Download, FileSpreadsheet, Bell, RotateCcw, AlertTriangle } from "lucide-react";
import { PaymentBadge } from "@/components/payment-badge";
// Dynamic import for export-excel to reduce bundle size
const loadExportExcel = () => import("@/lib/export-excel");

const SalesBarChart = dynamic(() => import("@/components/dashboard-charts").then(mod => mod.SalesBarChart), { ssr: false, loading: () => <div className="h-[300px] flex items-center justify-center text-sm text-gray-400">กำลังโหลดกราฟ...</div> });
const ProductsPieChart = dynamic(() => import("@/components/dashboard-charts").then(mod => mod.ProductsPieChart), { ssr: false, loading: () => <div className="h-[300px] flex items-center justify-center text-sm text-gray-400">กำลังโหลดกราฟ...</div> });

export default function DashboardClient({ initialStats, initialSettings }: { initialStats: any; initialSettings: any }) {
  const [stats, setStats] = useState(initialStats);
  const [storeSettings] = useState(initialSettings);
  const [expandedSale, setExpandedSale] = useState<number | null>(null);
  const [saleDetails, setSaleDetails] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [viewReceiptSale, setViewReceiptSale] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [dateFrom, setDateFrom] = useState(() => new Date().toISOString().split("T")[0]);
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState("today");
  const [sendingStockAlert, setSendingStockAlert] = useState(false);
  const [stockAlertMsg, setStockAlertMsg] = useState("");
  const [stockDecreaseItems, setStockDecreaseItems] = useState<any[]>([]);
  const [showStockDecrease, setShowStockDecrease] = useState(false);
  const [resettingStock, setResettingStock] = useState(false);
  const [resetMsg, setResetMsg] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [lastStockResetAt, setLastStockResetAt] = useState<string | null>(initialSettings?.lastStockResetAt || null);

  const quickFilters = [
    { label: "ทั้งหมด", key: "all", fn: () => { const n = new Date(); setDateFrom("1970-01-01"); setDateTo(n.toISOString().split("T")[0]); setActiveFilter("all"); } },
    { label: "วันนี้", key: "today", fn: () => { const t = new Date().toISOString().split("T")[0]; setDateFrom(t); setDateTo(t); setActiveFilter("today"); } },
    { label: "เมื่อวาน", key: "yesterday", fn: () => { const d = new Date(); d.setDate(d.getDate() - 1); const y = d.toISOString().split("T")[0]; setDateFrom(y); setDateTo(y); setActiveFilter("yesterday"); } },
    { label: "7 วัน", key: "7d", fn: () => { const n = new Date(); const d = new Date(); d.setDate(d.getDate() - 6); setDateFrom(d.toISOString().split("T")[0]); setDateTo(n.toISOString().split("T")[0]); setActiveFilter("7d"); } },
    { label: "14 วัน", key: "14d", fn: () => { const n = new Date(); const d = new Date(); d.setDate(d.getDate() - 13); setDateFrom(d.toISOString().split("T")[0]); setDateTo(n.toISOString().split("T")[0]); setActiveFilter("14d"); } },
    { label: "เดือนนี้", key: "month", fn: () => { const n = new Date(); setDateFrom(new Date(n.getFullYear(), n.getMonth(), 1).toISOString().split("T")[0]); setDateTo(new Date(n.getFullYear(), n.getMonth() + 1, 0).toISOString().split("T")[0]); setActiveFilter("month"); } },
    { label: "เดือนก่อน", key: "lastmonth", fn: () => { const n = new Date(); setDateFrom(new Date(n.getFullYear(), n.getMonth() - 1, 1).toISOString().split("T")[0]); setDateTo(new Date(n.getFullYear(), n.getMonth(), 0).toISOString().split("T")[0]); setActiveFilter("lastmonth"); } },
    { label: "ปีนี้", key: "year", fn: () => { const n = new Date(); setDateFrom(new Date(n.getFullYear(), 0, 1).toISOString().split("T")[0]); setDateTo(new Date(n.getFullYear(), 11, 31).toISOString().split("T")[0]); setActiveFilter("year"); } },
  ];

  async function loadAll() {
    setLoading(true);
    try {
      const [newStats, daily, products, stockItems] = await Promise.all([
        getDashboardStatsWithDate(dateFrom, dateTo),
        getDailySalesChart(dateFrom, dateTo),
        getTopProductsChart(dateFrom, dateTo),
        getStockDecreaseItemsSinceReset(),
      ]);
      setStats(newStats);
      setChartData(daily);
      setTopProducts(products);
      setStockDecreaseItems(stockItems);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
    setLoading(false);
  }

  async function handleResetStock() {
    setResettingStock(true);
    setResetMsg("");
    try {
      const res = await resetStockFromSales();
      setResetMsg(res.message);
      if (res.success) {
        setShowResetConfirm(false);
        if (res.resetAt) setLastStockResetAt(res.resetAt);
        await loadAll();
      }
    } catch {
      setResetMsg("เกิดข้อผิดพลาดในการรีเซ็ทสต๊อก");
    }
    setResettingStock(false);
    setTimeout(() => setResetMsg(""), 5000);
  }

  useEffect(() => { loadAll(); }, [dateFrom, dateTo]);

  async function toggleSaleDetails(saleId: number) {
    if (expandedSale === saleId) { setExpandedSale(null); setSaleDetails([]); return; }
    setExpandedSale(saleId);
    setLoadingItems(true);
    const sale = await getSaleById(saleId);
    setSaleDetails(sale?.items || []);
    setLoadingItems(false);
  }

  async function handleViewReceipt(saleRow: any) {
    const sale = saleRow.sales;
    const detail = await getSaleById(sale.id);
    setViewReceiptSale({ ...sale, items: detail?.items || [], employees: saleRow.employees });
  }

  function printReceipt(sale: any) {
    const store = storeSettings || {};
    const items = sale.items || [];
    const copyLabels = ["สำหรับลูกค้า", "สำหรับบริษัท", "สำหรับบัญชี"];

    let itemsHtml = "";
    items.forEach((si: any) => {
      const p = si.products;
      const item = si.sale_items || si;
      const nameDisplay = [p?.brand, p?.name, p?.model].filter(Boolean).join(" / ") || "สินค้า";
      itemsHtml += `<tr><td style="padding:2px 0;font-size:10px">${nameDisplay}</td><td style="text-align:center;padding:2px 0;font-size:10px">${item.quantity}</td><td style="text-align:right;padding:2px 0;font-size:10px">${formatCurrency(parseFloat(item.unitPrice))}</td><td style="text-align:right;padding:2px 0;font-size:10px">${formatCurrency(parseFloat(item.total))}</td></tr>`;
    });
    if (parseFloat(sale.serviceFee || "0") > 0) {
      itemsHtml += `<tr style="color:#b45309"><td style="padding:2px 0;font-size:10px">${sale.serviceDescription || "ค่าบริการ"}</td><td style="text-align:center;padding:2px 0;font-size:10px">1</td><td style="text-align:right;padding:2px 0;font-size:10px">${formatCurrency(parseFloat(sale.serviceFee))}</td><td style="text-align:right;padding:2px 0;font-size:10px">${formatCurrency(parseFloat(sale.serviceFee))}</td></tr>`;
    }
    const payLabel = sale.paymentMethod === "cash" ? "เงินสด" : sale.paymentMethod === "transfer" ? "โอนเงิน" : "เครดิต";
    const bName = sale.buyerName || "";
    const bPhone = sale.buyerPhone || "";
    const bAddr = sale.buyerAddress || "";
    const bTaxId = sale.buyerTaxId || "";

    function buildReceiptHtml(label: string, idx: number) {
      return `
        <div style="page-break-after:${idx < 2 ? "always" : "auto"};padding:8mm 10mm;font-family:Sarabun,sans-serif;font-size:12px;box-sizing:border-box;">
          <div style="text-align:right;font-size:11px;font-weight:bold;border-bottom:1px solid #999;padding-bottom:4px;margin-bottom:8px;">
            <span style="border:1px solid #666;padding:2px 8px;border-radius:4px;">${label}</span>
            <span style="margin-left:8px;color:#888;font-size:10px;">(${idx + 1}/3)</span>
          </div>
          <div style="text-align:center;border-bottom:2px solid #ea580c;padding-bottom:12px;margin-bottom:12px;">
            <div style="font-size:18px;font-weight:bold;color:#ea580c;">${sale.isTaxInvoice ? "ใบกำกับภาษี" : "ใบเสร็จรับเงิน"}</div>
            <div style="font-size:14px;font-weight:600;margin-top:4px;">${store.storeName || "ร้านแบตเตอรี่"}</div>
            ${store.branchName ? `<div style="font-size:11px;color:#666;">${store.branchName}</div>` : ""}
            ${store.address ? `<div style="font-size:11px;color:#666;">ที่อยู่: ${store.address}</div>` : ""}
            ${store.phone ? `<div style="font-size:11px;color:#666;">โทร. ${store.phone}</div>` : ""}
            ${store.taxId ? `<div style="font-size:11px;color:#666;">เลขประจำตัวผู้เสียภาษี: ${store.taxId}</div>` : ""}
          </div>
          <div style="border-bottom:1px dashed #ccc;padding-bottom:8px;margin-bottom:8px;">
            <div style="display:flex;justify-content:space-between;"><span>เลขที่${sale.isTaxInvoice ? "ใบกำกับภาษี" : "บิล"}:</span><span style="font-weight:600;">${sale.isTaxInvoice ? sale.taxInvoiceNumber : sale.billNumber}</span></div>
            ${sale.isTaxInvoice ? `<div style="display:flex;justify-content:space-between;color:#888;"><span>เลขที่บิล:</span><span>${sale.billNumber}</span></div>` : ""}
            <div style="display:flex;justify-content:space-between;"><span>วันที่:</span><span>${new Date(sale.createdAt).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}</span></div>
            <div style="display:flex;justify-content:space-between;"><span>เวลา:</span><span>${new Date(sale.createdAt).toLocaleTimeString("th-TH")}</span></div>
            ${sale.employees?.name ? `<div style="display:flex;justify-content:space-between;"><span>พนักงาน:</span><span>${sale.employees.name}</span></div>` : ""}
          </div>
          ${bName ? `
          <div style="border-bottom:1px dashed #ccc;padding-bottom:8px;margin-bottom:8px;padding:6px;background:#f9fafb;border-radius:4px;">
            <div style="font-weight:600;margin-bottom:4px;">ผู้ซื้อ:</div>
            <div>ชื่อ: ${bName}</div>
            ${bPhone ? `<div>โทร: ${bPhone}</div>` : ""}
            ${bAddr ? `<div>ที่อยู่: ${bAddr}</div>` : ""}
            ${sale.isTaxInvoice && bTaxId ? `<div>เลขประจำตัวผู้เสียภาษี: ${bTaxId}</div>` : ""}
          </div>` : ""}
          <div style="border-bottom:1px dashed #ccc;padding-bottom:8px;margin-bottom:8px;">
            <table style="width:100%;border-collapse:collapse;">
              <thead><tr style="border-bottom:1px solid #ddd;"><th style="text-align:left;padding:4px 0;font-weight:600;">รายการ</th><th style="text-align:center;padding:4px 0;font-weight:600;width:50px;">จำนวน</th><th style="text-align:right;padding:4px 0;font-weight:600;width:70px;">หน่วยละ</th><th style="text-align:right;padding:4px 0;font-weight:600;width:70px;">จำนวนเงิน</th></tr></thead>
              <tbody>${itemsHtml}</tbody>
            </table>
          </div>
          <div style="margin-bottom:8px;">
            <div style="display:flex;justify-content:space-between;"><span>รวมมูลค่าสินค้า/บริการ</span><span>${formatCurrency(parseFloat(sale.subtotal || "0") + parseFloat(sale.serviceFee || "0"))}</span></div>
            ${parseFloat(sale.discount || "0") > 0 ? `<div style="display:flex;justify-content:space-between;color:#dc2626;"><span>ส่วนลด</span><span>-${formatCurrency(parseFloat(sale.discount))}</span></div>` : ""}
            ${sale.isTaxInvoice ? `
              <div style="display:flex;justify-content:space-between;"><span>มูลค่าก่อนภาษี</span><span>${formatCurrency(parseFloat(sale.total) - parseFloat(sale.taxAmount || "0"))}</span></div>
              <div style="display:flex;justify-content:space-between;color:#2563eb;"><span>ภาษีมูลค่าเพิ่ม ${sale.vatType === "vat_in" ? "(รวมในราคา)" : ""} ${sale.taxRate}%</span><span>${formatCurrency(parseFloat(sale.taxAmount || "0"))}</span></div>
            ` : ""}
            <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:16px;padding-top:8px;border-top:2px solid #999;margin-top:8px;"><span>จำนวนเงินรวมทั้งสิ้น</span><span style="color:#ea580c;">${formatCurrency(parseFloat(sale.total))}</span></div>
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
    printWindow.onload = () => { setTimeout(() => { printWindow.print(); printWindow.close(); }, 300); };
  }

  const statCards = [
    {
      label: "ยอดขาย",
      value: `฿${parseFloat(stats.todaySalesTotal || 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })}`,
      sub: `${stats.todaySalesCount || 0} รายการ`,
      icon: ShoppingCart,
      gradient: "from-orange-500 to-orange-600",
      bg: "bg-orange-50",
      href: `/sales?from=${dateFrom}&to=${dateTo}`,
    },
    {
      label: "จำนวนที่ขาย",
      value: `${(stats.totalItemsSold || 0).toLocaleString("th-TH")}`,
      sub: `ชิ้น • ตามวันที่เลือก`,
      icon: Package,
      gradient: "from-cyan-500 to-teal-600",
      bg: "bg-cyan-50",
      href: `/sales?from=${dateFrom}&to=${dateTo}`,
    },
    {
      label: "ยอดเงินสดที่ขาย",
      value: `฿${parseFloat(stats.totalCashSales || 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })}`,
      sub: `${stats.totalCashSalesCount || 0} รายการเงินสด`,
      icon: ShoppingCart,
      gradient: "from-green-500 to-green-600",
      bg: "bg-green-50",
      href: `/sales?from=${dateFrom}&to=${dateTo}`,
    },
    {
      label: "ต้นทุนสินค้าที่ขาย",
      value: `฿${parseFloat(stats.costOfGoodsSold || 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })}`,
      sub: `กำไร ฿${(parseFloat(stats.todaySalesTotal || 0) - parseFloat(stats.costOfGoodsSold || 0)).toLocaleString("th-TH", { minimumFractionDigits: 2 })}`,
      icon: TrendingUp,
      gradient: "from-red-500 to-rose-600",
      bg: "bg-red-50",
      href: `/sales?from=${dateFrom}&to=${dateTo}`,
    },
    {
      label: "น้ำหนักที่ขายไป",
      value: `${(stats.totalWeightSold || 0).toLocaleString("th-TH", { minimumFractionDigits: 3 })} kg`,
      sub: stats.kgPrice > 0
        ? `฿${(stats.totalWeightValue || 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })} (${stats.kgPrice?.toLocaleString("th-TH")} บ./kg)`
        : `ตามวันที่เลือก`,
      icon: Package,
      gradient: "from-green-500 to-emerald-600",
      bg: "bg-green-50",
      href: `/sales?from=${dateFrom}&to=${dateTo}`,
    },
    {
      label: "ทุนสต๊อกสินค้า",
      value: `฿${parseFloat(stats.totalStockValue || 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })}`,
      sub: `${stats.totalProducts || 0} รายการ`,
      icon: Package,
      gradient: "from-blue-500 to-indigo-600",
      bg: "bg-blue-50",
      href: "/products",
    },
    {
      label: "สินค้าทั้งหมด",
      value: stats.totalProducts,
      sub: "รายการ",
      icon: Package,
      gradient: "from-amber-500 to-orange-500",
      bg: "bg-amber-50",
      href: "/products",
    },
    {
      label: "ลูกค้า",
      value: stats.totalCustomers,
      sub: "ราย",
      icon: Users,
      gradient: "from-orange-400 to-amber-500",
      bg: "bg-orange-50",
      href: "/customers",
    },
  ];

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight">แดชบอร์ด</h1>
          <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">ภาพรวมร้าน</p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl bg-orange-50 border border-orange-200/60 px-2.5 sm:px-4 py-1.5 sm:py-2">
          <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-500" />
          <span className="text-[10px] sm:text-xs md:text-sm font-medium text-orange-700">สรุปยอดขาย</span>
        </div>
      </div>

      {/* Date Filter */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-orange-100/60 p-2.5 sm:p-3 md:p-4 shadow-luxury">
        <div className="space-y-2 sm:space-y-2.5">
          {/* Quick filter row */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 mr-1">
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-500" />
              <span className="text-[11px] sm:text-sm font-semibold text-orange-800">ตัวกรอง:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {quickFilters.map((f) => (
                <Button key={f.key} variant="outline" size="sm" onClick={f.fn}
                  className={`h-7 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-3 rounded-md sm:rounded-lg transition-all ${activeFilter === f.key ? "bg-orange-500 text-white border-orange-500 hover:bg-orange-600 hover:text-white shadow-sm" : "border-orange-200 hover:bg-orange-50 text-orange-700"}`}>
                  {f.label}
                </Button>
              ))}
            </div>
          </div>
          {/* Date inputs + action buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-1 min-w-[280px] sm:min-w-0 sm:flex-none">
              <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setActiveFilter(""); }} className="flex-1 sm:flex-none sm:w-36 h-7 sm:h-8 text-[11px] sm:text-sm border-orange-200 rounded-md sm:rounded-lg" />
              <span className="text-[10px] sm:text-xs text-orange-400">ถึง</span>
              <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setActiveFilter(""); }} className="flex-1 sm:flex-none sm:w-36 h-7 sm:h-8 text-[11px] sm:text-sm border-orange-200 rounded-md sm:rounded-lg" />
            </div>
            <Button variant="outline" size="sm" onClick={async () => { const { exportDashboardExcel } = await loadExportExcel(); exportDashboardExcel(stats, chartData, topProducts, dateFrom, dateTo); }}
              className="h-7 sm:h-8 text-[10px] sm:text-xs border-orange-200 hover:bg-orange-50 text-orange-700 gap-1 rounded-md sm:rounded-lg px-2 sm:px-3 ml-auto">
              <FileSpreadsheet className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Excel
            </Button>
          </div>
        </div>
        {loading && <div className="mt-2 text-center text-[10px] sm:text-xs text-orange-400 animate-pulse">กำลังโหลดข้อมูล...</div>}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-5 md:grid-cols-3 lg:grid-cols-5">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.label} href={card.href} className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-white border border-orange-100/60 p-3 sm:p-4 md:p-5 shadow-luxury hover:shadow-luxury-lg transition-all duration-300 hover:-translate-y-0.5 cursor-pointer active:scale-95">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-orange-50 to-transparent rounded-bl-full opacity-60" />
              <div className="flex items-start justify-between relative">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{card.label}</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold mt-0.5 sm:mt-1 tracking-tight">{card.value}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 truncate">{card.sub}</p>
                </div>
                <div className={`flex h-9 w-9 sm:h-10 sm:w-10 md:h-11 md:w-11 items-center justify-center rounded-lg sm:rounded-xl bg-gradient-to-br ${card.gradient} shadow-sm flex-shrink-0`}>
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
              </div>
              <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <ExternalLink className="h-3 w-3 text-orange-400" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-5">
        {/* Bar Chart - ยอดขายรายวัน */}
        <div className="bg-white rounded-xl sm:rounded-2xl border border-orange-100/60 p-3 sm:p-4 md:p-5 shadow-luxury">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex-shrink-0">
              <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-gray-800">ยอดขายรายวัน</h3>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground">กราฟแท่งแสดงยอดขายแต่ละวัน</p>
            </div>
          </div>
          <div className="-mx-2 sm:mx-0">
            <SalesBarChart data={chartData} />
          </div>
        </div>

        {/* Donut Chart - สินค้าขายดี */}
        <div className="bg-white rounded-xl sm:rounded-2xl border border-orange-100/60 p-3 sm:p-4 md:p-5 shadow-luxury">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex-shrink-0">
              <PieIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-gray-800">สินค้าขายดี Top 6</h3>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground">สัดส่วนจำนวนสินค้าที่ขายได้</p>
            </div>
          </div>
          <div className="-mx-2 sm:mx-0">
            <ProductsPieChart data={topProducts} />
          </div>
        </div>
      </div>

      {/* Stock Decrease Section */}
      <div className="rounded-xl sm:rounded-2xl bg-white border border-red-100/60 shadow-luxury overflow-hidden">
        <div className="px-3 sm:px-5 py-3 sm:py-4 border-b border-red-100/60 bg-gradient-to-r from-red-50/80 to-white space-y-2 sm:space-y-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-rose-600 flex-shrink-0">
                <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="text-sm sm:text-base font-bold tracking-tight text-red-800">สต๊อกลด</h2>
                  {stockDecreaseItems.length > 0 ? (
                    <Badge variant="outline" className="border-red-200 text-red-600 text-[10px] sm:text-xs">{stockDecreaseItems.length} รายการ / {stockDecreaseItems.reduce((s: number, i: any) => s + i.totalQty, 0)} ชิ้น</Badge>
                  ) : (
                    <Badge variant="outline" className="border-green-200 text-green-600 text-[10px] sm:text-xs">ไม่มีรายการ</Badge>
                  )}
                </div>
                <p className="text-[10px] sm:text-xs text-red-500">สินค้าที่ขายไปตั้งแต่รีเซ็ทล่าสุด</p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
              {stockDecreaseItems.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => setShowStockDecrease(!showStockDecrease)}
                  className="h-7 sm:h-8 text-[10px] sm:text-xs border-red-200 hover:bg-red-50 text-red-700 gap-1 rounded-md sm:rounded-lg px-2 sm:px-3">
                  {showStockDecrease ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  <span className="hidden sm:inline">{showStockDecrease ? "ซ่อน" : "ดูรายการ"}</span>
                </Button>
              )}
              <Button variant="outline" size="sm" disabled={sendingStockAlert} onClick={async () => {
                setSendingStockAlert(true); setStockAlertMsg("");
                const res = await sendStockDecreaseLineNotify();
                setStockAlertMsg(res.message);
                setSendingStockAlert(false);
                setTimeout(() => setStockAlertMsg(""), 4000);
              }}
                className="h-7 sm:h-8 text-[10px] sm:text-xs border-green-200 hover:bg-green-50 text-green-700 gap-1 rounded-md sm:rounded-lg px-2 sm:px-3">
                <Bell className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> <span className="hidden sm:inline">{sendingStockAlert ? "กำลังส่ง..." : "แจ้งสต๊อกลด"}</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowResetConfirm(true)}
                disabled={resettingStock}
                className="h-7 sm:h-8 text-[10px] sm:text-xs border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-700 gap-1 rounded-md sm:rounded-lg px-2 sm:px-3 font-semibold">
                <RotateCcw className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${resettingStock ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">{resettingStock ? "กำลังรีเซ็ท..." : "รีเซ็ทสต๊อก"}</span>
              </Button>
            </div>
          </div>
          {lastStockResetAt && (
            <div className="flex items-center sm:ml-9">
              <span className="text-[9px] sm:text-[10px] text-orange-500 bg-orange-50 border border-orange-200 rounded-md px-1.5 py-0.5 whitespace-nowrap">
                🔄 รีเซ็ทล่าสุด: {new Date(lastStockResetAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })} {new Date(lastStockResetAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          )}
        </div>

        {resetMsg && (
          <div className={`mx-3 sm:mx-5 mt-2 p-2 rounded-lg text-xs font-medium ${resetMsg.includes("สำเร็จ") ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {resetMsg}
          </div>
        )}
        {stockAlertMsg && (
          <div className="mx-3 sm:mx-5 mt-2 p-2 rounded-lg text-xs font-medium bg-green-50 text-green-700 border border-green-200">
            {stockAlertMsg}
          </div>
        )}

        {showStockDecrease && (
          <div className="max-h-[400px] overflow-auto">
            {/* Mobile Card View */}
            <div className="sm:hidden divide-y divide-red-50">
              {stockDecreaseItems.map((item: any, idx: number) => {
                const name = [item.brand, item.productName, item.model].filter(Boolean).join(" / ");
                const terminal = item.batteryTerminal ? ` (${item.batteryTerminal})` : "";
                return (
                  <div key={idx} className="p-3 flex justify-between items-center">
                    <div>
                      <span className="text-xs font-medium text-gray-800">{name}{terminal}</span>
                      <div className="text-[10px] text-muted-foreground">คงเหลือ: {item.currentStock} ชิ้น</div>
                    </div>
                    <Badge className="bg-red-100 text-red-700 border-red-200 text-xs font-bold">-{item.totalQty}</Badge>
                  </div>
                );
              })}
            </div>
            {/* Desktop Table View */}
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-red-50/50 hover:bg-red-50/50">
                    <TableHead className="font-semibold text-xs">#</TableHead>
                    <TableHead className="font-semibold text-xs">สินค้า</TableHead>
                    <TableHead className="text-center font-semibold text-xs">จำนวนที่ขาย</TableHead>
                    <TableHead className="text-center font-semibold text-xs">คงเหลือ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockDecreaseItems.map((item: any, idx: number) => {
                    const name = [item.brand, item.productName, item.model].filter(Boolean).join(" / ");
                    const terminal = item.batteryTerminal ? ` (${item.batteryTerminal})` : "";
                    return (
                      <TableRow key={idx} className="hover:bg-red-50/30">
                        <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="text-sm font-medium">{name}{terminal}</TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-red-100 text-red-700 border-red-200 text-xs font-bold">-{item.totalQty}</Badge>
                        </TableCell>
                        <TableCell className="text-center text-sm">{item.currentStock}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {/* Reset Confirm Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500">
                <RotateCcw className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold">ยืนยันรีเซ็ทสต๊อก</h3>
                <p className="text-sm text-muted-foreground">เติมสต๊อกกลับตามจำนวนที่ขายไป</p>
              </div>
            </div>
            <div className="bg-orange-50 rounded-xl p-4 mb-4 space-y-2 text-sm">
              <p className="font-semibold text-orange-800">จะเติมสต๊อกกลับ:</p>
              <ul className="space-y-1 text-orange-700 max-h-[200px] overflow-auto">
                {stockDecreaseItems.map((item: any, idx: number) => {
                  const name = [item.brand, item.productName, item.model].filter(Boolean).join(" / ");
                  return (
                    <li key={idx} className="flex justify-between">
                      <span className="truncate mr-2">{name}</span>
                      <span className="font-bold whitespace-nowrap">+{item.totalQty} ชิ้น</span>
                    </li>
                  );
                })}
              </ul>
              <p className="text-xs text-orange-500 pt-1">รวม {stockDecreaseItems.length} รายการ / {stockDecreaseItems.reduce((s: number, i: any) => s + i.totalQty, 0)} ชิ้น</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleResetStock} disabled={resettingStock}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-xl gap-2">
                <RotateCcw className={`h-4 w-4 ${resettingStock ? "animate-spin" : ""}`} />
                {resettingStock ? "กำลังรีเซ็ท..." : "ยืนยันรีเซ็ท"}
              </Button>
              <Button variant="outline" onClick={() => setShowResetConfirm(false)} disabled={resettingStock}
                className="flex-1 rounded-xl border-gray-200">
                ยกเลิก
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {viewReceiptSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-auto py-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-orange-50/80 to-white">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-orange-500" />
                <div>
                  <h2 className="text-lg font-bold">{viewReceiptSale.isTaxInvoice ? "ใบกำกับภาษี" : "ใบเสร็จรับเงิน"}</h2>
                  <span className="text-xs text-muted-foreground">
                    {viewReceiptSale.isTaxInvoice ? viewReceiptSale.taxInvoiceNumber : viewReceiptSale.billNumber}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => printReceipt(viewReceiptSale)} className="rounded-lg p-1.5 hover:bg-orange-100 transition-colors" title="พิมพ์ใบเสร็จ">
                  <Printer className="h-4 w-4 text-orange-500" />
                </button>
                <button onClick={() => setViewReceiptSale(null)} className="rounded-lg p-1.5 hover:bg-orange-100 transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Sale Info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">วันที่:</span> <span className="font-medium">{new Date(viewReceiptSale.createdAt).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}</span></div>
                <div><span className="text-muted-foreground">เวลา:</span> <span className="font-medium">{new Date(viewReceiptSale.createdAt).toLocaleTimeString("th-TH")}</span></div>
                <div><span className="text-muted-foreground">พนักงาน:</span> <span className="font-medium">{viewReceiptSale.employees?.name || "-"}</span></div>
                <div><span className="text-muted-foreground">ชำระ:</span> <PaymentBadge paymentMethod={viewReceiptSale.paymentMethod} size="md" /></div>
              </div>

              {viewReceiptSale.buyerName && (
                <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1">
                  <div className="font-semibold">ผู้ซื้อ</div>
                  <div>{viewReceiptSale.buyerName}</div>
                  {viewReceiptSale.buyerPhone && <div className="text-muted-foreground">โทร: {viewReceiptSale.buyerPhone}</div>}
                  {viewReceiptSale.buyerAddress && <div className="text-muted-foreground">ที่อยู่: {viewReceiptSale.buyerAddress}</div>}
                </div>
              )}

              {/* Items */}
              <div>
                <div className="text-sm font-semibold mb-2">รายการสินค้า</div>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-orange-50/50">
                      <TableHead className="text-xs">สินค้า</TableHead>
                      <TableHead className="text-xs text-center">จำนวน</TableHead>
                      <TableHead className="text-xs text-right">ราคา</TableHead>
                      <TableHead className="text-xs text-right">รวม</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(viewReceiptSale.items || []).map((si: any, idx: number) => {
                      const p = si.products;
                      const item = si.sale_items || si;
                      return (
                        <TableRow key={idx}>
                          <TableCell className="text-sm">{p?.name || "สินค้า"}</TableCell>
                          <TableCell className="text-sm text-center">{item.quantity}</TableCell>
                          <TableCell className="text-sm text-right">{formatCurrency(parseFloat(item.unitPrice))}</TableCell>
                          <TableCell className="text-sm text-right font-medium">{formatCurrency(parseFloat(item.total))}</TableCell>
                        </TableRow>
                      );
                    })}
                    {parseFloat(viewReceiptSale.serviceFee || "0") > 0 && (
                      <TableRow className="text-amber-600">
                        <TableCell className="text-sm">{viewReceiptSale.serviceDescription || "ค่าบริการ"}</TableCell>
                        <TableCell className="text-sm text-center">1</TableCell>
                        <TableCell className="text-sm text-right">{formatCurrency(parseFloat(viewReceiptSale.serviceFee))}</TableCell>
                        <TableCell className="text-sm text-right font-medium">{formatCurrency(parseFloat(viewReceiptSale.serviceFee))}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className="bg-orange-50 rounded-xl p-4 space-y-1.5 text-sm">
                <div className="flex justify-between"><span>รวมสินค้า</span><span>{formatCurrency(parseFloat(viewReceiptSale.subtotal || "0"))}</span></div>
                {parseFloat(viewReceiptSale.serviceFee || "0") > 0 && <div className="flex justify-between text-amber-600"><span>ค่าบริการ</span><span>+{formatCurrency(parseFloat(viewReceiptSale.serviceFee))}</span></div>}
                {parseFloat(viewReceiptSale.discount || "0") > 0 && <div className="flex justify-between text-red-600"><span>ส่วนลด</span><span>-{formatCurrency(parseFloat(viewReceiptSale.discount))}</span></div>}
                {viewReceiptSale.isTaxInvoice && <div className="flex justify-between text-blue-600"><span>ภาษี {viewReceiptSale.taxRate}%</span><span>{formatCurrency(parseFloat(viewReceiptSale.taxAmount || "0"))}</span></div>}
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-orange-200"><span>รวมทั้งสิ้น</span><span className="text-orange-600">{formatCurrency(parseFloat(viewReceiptSale.total))}</span></div>
              </div>

              {viewReceiptSale.note && (
                <div className="text-sm text-muted-foreground">หมายเหตุ: {viewReceiptSale.note}</div>
              )}

              {/* Print button */}
              <Button onClick={() => printReceipt(viewReceiptSale)} className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl gap-2">
                <Printer className="h-4 w-4" />
                พิมพ์ใบเสร็จ
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sales Table */}
      <div className="rounded-xl sm:rounded-2xl bg-white border border-orange-100/60 shadow-luxury overflow-hidden">
        <div className="px-3 sm:px-5 py-3 sm:py-4 border-b border-orange-100/60 bg-gradient-to-r from-orange-50/80 to-white flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex-shrink-0">
              <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
            </div>
            <h2 className="text-sm sm:text-base md:text-lg font-bold tracking-tight">รายการขาย</h2>
            <Badge variant="outline" className="border-orange-200 text-orange-600 text-[10px] sm:text-xs">{(stats.recentSales || []).length} รายการ</Badge>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button variant="outline" size="sm" onClick={async () => { const { exportSalesExcel } = await loadExportExcel(); exportSalesExcel(stats.recentSales || [], storeSettings?.storeName || "ร้าน"); }}
              className="h-6 sm:h-7 text-[10px] sm:text-[11px] border-orange-200 hover:bg-orange-50 text-orange-700 gap-1 rounded-md sm:rounded-lg px-1.5 sm:px-2">
              <Download className="h-3 w-3" /> <span className="hidden sm:inline">Excel</span>
            </Button>
            <Link href={`/sales?from=${dateFrom}&to=${dateTo}`} className="text-[10px] sm:text-xs text-orange-500 hover:text-orange-600 flex items-center gap-0.5 sm:gap-1 whitespace-nowrap">
              ดูทั้งหมด <ExternalLink className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            </Link>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="sm:hidden max-h-[500px] overflow-auto divide-y divide-orange-50">
          {(stats.recentSales || []).map((row: any) => {
            const sale = row.sales;
            const emp = row.employees;
            return (
              <div key={sale.id} className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-xs text-orange-700">{sale.isTaxInvoice ? sale.taxInvoiceNumber : sale.billNumber}</span>
                    {sale.isTaxInvoice && <Badge variant="outline" className="ml-1.5 text-[9px] px-1 py-0 border-blue-200 text-blue-600">ใบกำกับภาษี</Badge>}
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${sale.status === "completed" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                    <span className={`h-1 w-1 rounded-full ${sale.status === "completed" ? "bg-emerald-500" : "bg-red-500"}`} />
                    {sale.status === "completed" ? "สำเร็จ" : "ยกเลิก"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-[10px] text-muted-foreground space-y-0.5">
                    <div>พนักงาน: {emp?.name || "-"}</div>
                    <div>{new Date(sale.createdAt).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "2-digit" })} {new Date(sale.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</div>
                    <div><PaymentBadge paymentMethod={sale.paymentMethod} /></div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm text-orange-600">{formatCurrency(parseFloat(sale.total))}</div>
                    <div className="flex gap-1 mt-1 justify-end">
                      <button onClick={() => handleViewReceipt(row)} className="inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-orange-100 transition-colors" title="ดูใบเสร็จ">
                        <Eye className="h-3.5 w-3.5 text-orange-500" />
                      </button>
                      <button onClick={() => toggleSaleDetails(sale.id)} className="inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-orange-100 transition-colors">
                        {expandedSale === sale.id ? <ChevronUp className="h-3.5 w-3.5 text-orange-500" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                      </button>
                    </div>
                  </div>
                </div>
                {expandedSale === sale.id && (
                  <div className="bg-orange-50/50 rounded-lg p-2 text-[10px] space-y-1">
                    {loadingItems ? (
                      <div className="text-center text-muted-foreground py-2">กำลังโหลด...</div>
                    ) : (
                      <>
                        {saleDetails.map((si: any, idx: number) => {
                          const p = si.products;
                          const item = si.sale_items || si;
                          return (
                            <div key={idx} className="flex justify-between">
                              <span>{p?.name || "-"} x{item.quantity}</span>
                              <span className="font-medium">{formatCurrency(parseFloat(item.total))}</span>
                            </div>
                          );
                        })}
                        {parseFloat(sale.serviceFee || "0") > 0 && (
                          <div className="flex justify-between text-amber-600">
                            <span>{sale.serviceDescription || "ค่าบริการ"}</span>
                            <span className="font-medium">{formatCurrency(parseFloat(sale.serviceFee))}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold border-t border-orange-200 pt-1 mt-1">
                          <span>รวม</span>
                          <span className="text-orange-600">{formatCurrency(parseFloat(sale.total))}</span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {(!stats.recentSales || stats.recentSales.length === 0) && (
            <div className="text-center text-muted-foreground py-12">
              <Package className="h-8 w-8 mx-auto mb-2 text-orange-300" />
              <span className="text-xs">ไม่มีรายการขายในช่วงเวลานี้</span>
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block max-h-[500px] overflow-auto">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow className="bg-orange-50/50 hover:bg-orange-50/50 sticky top-0">
                <TableHead className="font-semibold w-8"></TableHead>
                <TableHead className="font-semibold">เลขที่บิล</TableHead>
                <TableHead className="font-semibold">พนักงาน</TableHead>
                <TableHead className="text-right font-semibold">ยอดรวม</TableHead>
                <TableHead className="font-semibold">ชำระ</TableHead>
                <TableHead className="font-semibold">สถานะ</TableHead>
                <TableHead className="font-semibold">วันที่/เวลา</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(stats.recentSales || []).map((row: any) => {
                const sale = row.sales;
                const emp = row.employees;
                return (
                  <>
                    <TableRow key={sale.id} className={`hover:bg-orange-50/30 ${expandedSale === sale.id ? "bg-orange-50/40" : ""}`}>
                      <TableCell>
                        <button
                          onClick={() => toggleSaleDetails(sale.id)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg hover:bg-orange-100 transition-colors"
                        >
                          {expandedSale === sale.id ? <ChevronUp className="h-4 w-4 text-orange-500" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm text-orange-700">{sale.isTaxInvoice ? sale.taxInvoiceNumber : sale.billNumber}</span>
                          {sale.isTaxInvoice && <Badge variant="outline" className="w-fit text-[10px] px-1.5 py-0 border-blue-200 text-blue-600 mt-0.5">ใบกำกับภาษี</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{emp?.name || "-"}</TableCell>
                      <TableCell className="text-right font-bold text-orange-600">{formatCurrency(parseFloat(sale.total))}</TableCell>
                      <TableCell>
                        <PaymentBadge paymentMethod={sale.paymentMethod} size="md" />
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${sale.status === "completed" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${sale.status === "completed" ? "bg-emerald-500" : "bg-red-500"}`} />
                          {sale.status === "completed" ? "สำเร็จ" : "ยกเลิก"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex flex-col">
                          <span>{new Date(sale.createdAt).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "2-digit" })}</span>
                          <span className="text-xs text-muted-foreground">{new Date(sale.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <button onClick={() => handleViewReceipt(row)} className="inline-flex h-7 w-7 items-center justify-center rounded-lg hover:bg-orange-100 transition-colors" title="ดูใบเสร็จ">
                            <Eye className="h-4 w-4 text-orange-500" />
                          </button>
                          <button onClick={() => { handleViewReceipt(row).then(() => { }); setTimeout(() => { }, 500); }} className="inline-flex h-7 w-7 items-center justify-center rounded-lg hover:bg-orange-100 transition-colors" title="พิมพ์ใบเสร็จ">
                            <Printer className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedSale === sale.id && (
                      <TableRow key={`detail-${sale.id}`} className="bg-orange-50/20">
                        <TableCell colSpan={8}>
                          {loadingItems ? (
                            <div className="text-center text-sm text-muted-foreground py-4">กำลังโหลด...</div>
                          ) : (
                            <div className="p-3">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-white/60">
                                    <TableHead className="text-xs">สินค้า</TableHead>
                                    <TableHead className="text-xs text-center">จำนวน</TableHead>
                                    <TableHead className="text-xs text-right">ราคา/หน่วย</TableHead>
                                    <TableHead className="text-xs text-right">ส่วนลด</TableHead>
                                    <TableHead className="text-xs text-right">รวม</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {saleDetails.map((si: any, idx: number) => {
                                    const p = si.products;
                                    const item = si.sale_items || si;
                                    return (
                                      <TableRow key={idx} className="hover:bg-white/60">
                                        <TableCell className="text-sm font-medium">{p?.name || "-"}</TableCell>
                                        <TableCell className="text-sm text-center">{item.quantity}</TableCell>
                                        <TableCell className="text-sm text-right">{formatCurrency(parseFloat(item.unitPrice))}</TableCell>
                                        <TableCell className="text-sm text-right text-red-500">{parseFloat(item.discount || "0") > 0 ? `-${formatCurrency(parseFloat(item.discount))}` : "-"}</TableCell>
                                        <TableCell className="text-sm text-right font-semibold">{formatCurrency(parseFloat(item.total))}</TableCell>
                                      </TableRow>
                                    );
                                  })}
                                  {parseFloat(sale.serviceFee || "0") > 0 && (
                                    <TableRow className="text-amber-600">
                                      <TableCell className="text-sm font-medium">{sale.serviceDescription || "ค่าบริการ"}</TableCell>
                                      <TableCell className="text-sm text-center">1</TableCell>
                                      <TableCell className="text-sm text-right">{formatCurrency(parseFloat(sale.serviceFee))}</TableCell>
                                      <TableCell className="text-sm text-right">-</TableCell>
                                      <TableCell className="text-sm text-right font-semibold">{formatCurrency(parseFloat(sale.serviceFee))}</TableCell>
                                    </TableRow>
                                  )}
                                </TableBody>
                              </Table>
                              <div className="flex justify-end mt-3">
                                <div className="bg-white rounded-xl border border-orange-100 p-3 space-y-1 text-sm min-w-[200px]">
                                  {parseFloat(sale.discount || "0") > 0 && <div className="flex justify-between text-red-600"><span>ส่วนลด:</span><span>-{formatCurrency(parseFloat(sale.discount))}</span></div>}
                                  {sale.isTaxInvoice && <div className="flex justify-between text-blue-600"><span>ภาษี {sale.taxRate}%:</span><span>{formatCurrency(parseFloat(sale.taxAmount || "0"))}</span></div>}
                                  <div className="flex justify-between font-bold border-t border-orange-100 pt-1"><span>รวมทั้งสิ้น:</span><span className="text-orange-600">{formatCurrency(parseFloat(sale.total))}</span></div>
                                </div>
                              </div>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
              {(!stats.recentSales || stats.recentSales.length === 0) && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                    <Package className="h-8 w-8 mx-auto mb-2 text-orange-300" />
                    ไม่มีรายการขายในช่วงเวลานี้
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

    </div>
  );
}

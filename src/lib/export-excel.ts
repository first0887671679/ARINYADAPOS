"use client";

import * as XLSX from "xlsx";
import ExcelJS from "exceljs";

export function exportToExcel(data: any[], filename: string, sheetName = "Sheet1") {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportSalesExcel(salesData: any[], storeName: string) {
  const rows = salesData.map((row: any) => {
    const sale = row.sales || row;
    const emp = row.employees;
    return {
      "เลขที่บิล": sale.billNumber,
      "เลขที่ใบกำกับภาษี": sale.isTaxInvoice ? (sale.taxInvoiceNumber || "-") : "-",
      "วันที่": new Date(sale.createdAt).toLocaleDateString("th-TH"),
      "เวลา": new Date(sale.createdAt).toLocaleTimeString("th-TH"),
      "ชื่อลูกค้า": sale.buyerName || "-",
      "เบอร์โทรลูกค้า": sale.buyerPhone || "-",
      "ที่อยู่ลูกค้า": sale.buyerAddress || "-",
      "เลขผู้เสียภาษีลูกค้า": sale.buyerTaxId || "-",
      "พนักงาน": emp?.name || "-",
      "รวมสินค้า": parseFloat(sale.subtotal || "0"),
      "ค่าบริการ": parseFloat(sale.serviceFee || "0"),
      "รายละเอียดบริการ": sale.serviceDescription || "-",
      "ส่วนลด": parseFloat(sale.discount || "0"),
      "ภาษี (%)": sale.isTaxInvoice ? `${sale.taxRate}%` : "-",
      "จำนวนภาษี": parseFloat(sale.taxAmount || "0"),
      "ยอดรวมสุทธิ": parseFloat(sale.total),
      "วิธีชำระ": sale.paymentMethod === "cash" ? "เงินสด" : sale.paymentMethod === "transfer" ? "โอนเงิน" : "เครดิต",
      "สถานะ": sale.status === "completed" ? "สำเร็จ" : "ยกเลิก",
      "ใบกำกับภาษี": sale.isTaxInvoice ? "ใช่" : "ไม่ใช่",
      "หมายเหตุ": sale.note || "",
    };
  });
  exportToExcel(rows, `รายงานขาย_${storeName}_${new Date().toLocaleDateString("th-TH")}`, "รายการขาย");
}

export function exportQuotationsExcel(quotationsData: any[], storeName: string) {
  const rows = quotationsData.map((row: any) => {
    const qt = row.quotations || row;
    const cust = row.customers;
    return {
      "เลขที่ใบเสนอราคา": qt.quotationNumber,
      "วันที่": new Date(qt.createdAt).toLocaleDateString("th-TH"),
      "ชื่อลูกค้า": qt.buyerName || cust?.name || "-",
      "เบอร์โทรลูกค้า": qt.buyerPhone || cust?.phone || "-",
      "ที่อยู่ลูกค้า": qt.buyerAddress || cust?.address || "-",
      "เลขผู้เสียภาษีลูกค้า": qt.buyerTaxId || cust?.taxId || "-",
      "รวมสินค้า": parseFloat(qt.subtotal || "0"),
      "ค่าบริการ": parseFloat(qt.serviceFee || "0"),
      "รายละเอียดบริการ": qt.serviceDescription || "-",
      "ส่วนลด": parseFloat(qt.discount || "0"),
      "ภาษี (%)": qt.includeVat ? `${qt.taxRate}%` : "-",
      "จำนวนภาษี": parseFloat(qt.taxAmount || "0"),
      "ยอดรวมสุทธิ": parseFloat(qt.total),
      "สถานะ": qt.status === "converted" ? "แปลงเป็นบิลแล้ว" : qt.status === "approved" ? "อนุมัติ" : qt.status === "rejected" ? "ปฏิเสธ" : "รออนุมัติ",
      "มี VAT": qt.includeVat ? "ใช่" : "ไม่ใช่",
      "อายุ (วัน)": qt.validDays || 30,
      "หมายเหตุ": qt.note || "",
    };
  });
  exportToExcel(rows, `ใบเสนอราคา_${storeName}_${new Date().toLocaleDateString("th-TH")}`, "ใบเสนอราคา");
}

export function exportDashboardExcel(stats: any, chartData: any[], topProducts: any[], dateFrom: string, dateTo: string) {
  const wb = XLSX.utils.book_new();

  // Summary sheet
  const summary = [{
    "รายการ": "ยอดขายรวม",
    "ค่า": parseFloat(stats.todaySalesTotal || 0),
  }, {
    "รายการ": "จำนวนบิล",
    "ค่า": stats.todaySalesCount || 0,
  }, {
    "รายการ": "สินค้าทั้งหมด",
    "ค่า": stats.totalProducts || 0,
  }, {
    "รายการ": "ลูกค้าทั้งหมด",
    "ค่า": stats.totalCustomers || 0,
  }, {
    "รายการ": "ช่วงวันที่",
    "ค่า": `${dateFrom} ถึง ${dateTo}`,
  }];
  const ws1 = XLSX.utils.json_to_sheet(summary);
  XLSX.utils.book_append_sheet(wb, ws1, "สรุป");

  // Daily sales sheet
  if (chartData.length > 0) {
    const dailyRows = chartData.map(d => ({
      "วันที่": d.date,
      "ยอดขาย (บาท)": d.sales,
      "จำนวนบิล": d.count,
    }));
    const ws2 = XLSX.utils.json_to_sheet(dailyRows);
    XLSX.utils.book_append_sheet(wb, ws2, "ยอดขายรายวัน");
  }

  // Top products sheet
  if (topProducts.length > 0) {
    const prodRows = topProducts.map(p => ({
      "สินค้า": p.name,
      "จำนวนขาย (ชิ้น)": p.value,
      "ยอดขาย (บาท)": p.total,
    }));
    const ws3 = XLSX.utils.json_to_sheet(prodRows);
    XLSX.utils.book_append_sheet(wb, ws3, "สินค้าขายดี");
  }

  XLSX.writeFile(wb, `Dashboard_${dateFrom}_${dateTo}.xlsx`);
}

export async function exportSalesReportExcel(
  salesData: any[],
  storeName: string,
  dateFrom: string,
  dateTo: string,
  customersList?: any[],
) {
  // Helper: return first non-empty value from sale field, joined customer, customers list, or default
  const pick = (saleVal: any, custVal: any, listVal: any, fallback = "-") => {
    if (saleVal !== null && saleVal !== undefined && saleVal !== "") return saleVal;
    if (custVal !== null && custVal !== undefined && custVal !== "") return custVal;
    if (listVal !== null && listVal !== undefined && listVal !== "") return listVal;
    return fallback;
  };

  // Build a lookup map from customersList for tertiary fallback
  const custMap = new Map<number, any>();
  if (customersList && Array.isArray(customersList)) {
    for (const c of customersList) {
      if (c?.id) custMap.set(c.id, c);
    }
  }

  // Map all sales (not just tax invoices) with document type column
  const salesRows = salesData
    .map((row: any) => {
      const sale = row.sales || row;
      const cust = row.customers;
      // Tertiary fallback: look up customer by customerId from the customers list
      const custId = sale.customerId;
      const listCust = custId ? custMap.get(custId) : null;
      const date = new Date(sale.createdAt);
      const subtotal = parseFloat(sale.subtotal || "0");
      const taxAmount = parseFloat(sale.taxAmount || "0");
      const total = parseFloat(sale.total || "0");
      const buyerName = pick(sale.buyerName, cust?.name, listCust?.name, "ลูกค้าทั่วไป");
      const buyerPhone = pick(sale.buyerPhone, cust?.phone, listCust?.phone);
      const buyerAddress = pick(sale.buyerAddress, cust?.address, listCust?.address);
      const buyerTaxId = pick(sale.buyerTaxId, cust?.taxId, listCust?.taxId);
      const docType = sale.isTaxInvoice ? "ใบกำกับภาษี" : "ใบเสร็จรับเงิน";
      return {
        date,
        docType,
        taxInvoiceNumber: sale.taxInvoiceNumber || sale.billNumber || "-",
        buyerName,
        buyerPhone,
        buyerAddress,
        buyerTaxId,
        subtotal,
        taxAmount,
        total,
        status: sale.status === "completed" ? "สำเร็จ" : "ยกเลิก",
      };
    });

  // Create workbook with ExcelJS for styling support
  const wb = new ExcelJS.Workbook();
  wb.creator = storeName;
  wb.created = new Date();

  const ws = wb.addWorksheet("รายงานขาย", {
    properties: { defaultColWidth: 18 },
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  // Define columns - for all sales (receipts + tax invoices)
  ws.columns = [
    { width: 6 },   // A: ลำดับ
    { width: 14 },  // B: วัน/เดือน/ปี
    { width: 18 },  // C: ประเภทเอกสาร
    { width: 16 },  // D: เลขที่ เล่มที่
    { width: 28 },  // E: ชื่อผู้ซื้อสินค้า/ผู้รับบริการ
    { width: 18 },  // F: เลขประจำตัวผู้เสียภาษี
    { width: 16 },  // G: เบอร์โทร
    { width: 32 },  // H: ที่อยู่
    { width: 16 },  // I: มูลค่าสินค้าหรือบริการ
    { width: 18 },  // J: จำนวนเงินภาษีมูลค่าเพิ่ม (7%)
    { width: 18 },  // K: มูลค่าสินค้ารวมภาษีมูลค่าเพิ่ม
    { width: 8 },   // L: SU
  ];

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };

  // ---- Title rows ----
  ws.mergeCells("A1:L1");
  const titleCell = ws.getCell("A1");
  titleCell.value = storeName;
  titleCell.font = { name: "TH Sarabun New", size: 16, bold: true };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 26;

  ws.mergeCells("A2:L2");
  const subtitleCell = ws.getCell("A2");
  subtitleCell.value = "รายงานขาย (ใบเสร็จรับเงินและใบกำกับภาษี)";
  subtitleCell.font = { name: "TH Sarabun New", size: 14, bold: true };
  subtitleCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(2).height = 22;

  ws.mergeCells("A3:L3");
  const dateCell = ws.getCell("A3");
  const fmtDate = (d: string) => {
    if (!d) return "";
    const dt = new Date(d);
    return dt.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
  };
  dateCell.value = `ประจำวันที่ ${fmtDate(dateFrom)} ถึงวันที่ ${fmtDate(dateTo)}`;
  dateCell.font = { name: "TH Sarabun New", size: 12 };
  dateCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(3).height = 20;

  // ---- Header row (row 5) ----
  const headerRowNum = 5;
  const headers = [
    "ลำดับ",
    "วัน/เดือน/ปี",
    "ประเภทเอกสาร",
    "เลขที่ เล่มที่",
    "ชื่อผู้ซื้อสินค้า/ผู้รับบริการ",
    "เลขประจำตัวผู้เสียภาษี",
    "เบอร์โทร",
    "ที่อยู่",
    "มูลค่าสินค้าหรือบริการ",
    "จำนวนเงินภาษีมูลค่าเพิ่ม (7%)",
    "มูลค่าสินค้ารวมภาษีมูลค่าเพิ่ม",
    "SU",
  ];

  const headerRow = ws.getRow(headerRowNum);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { name: "TH Sarabun New", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2F5496" } };
    cell.border = thinBorder;
  });
  ws.getRow(headerRowNum).height = 38;

  // ---- Data rows ----
  let currentRow = headerRowNum + 1;
  let totalSubtotal = 0;
  let totalTax = 0;
  let totalTotal = 0;

  if (salesRows.length === 0) {
    ws.mergeCells(`A${currentRow}:L${currentRow}`);
    const emptyCell = ws.getCell(`A${currentRow}`);
    emptyCell.value = "ไม่มีข้อมูลการขายในช่วงวันที่ที่เลือก";
    emptyCell.font = { name: "TH Sarabun New", size: 11, italic: true };
    emptyCell.alignment = { horizontal: "center", vertical: "middle" };
    emptyCell.border = thinBorder;
    ws.getRow(currentRow).height = 24;
    currentRow++;
  } else {
    salesRows.forEach((sale, idx) => {
      const row = ws.getRow(currentRow);
      const rowNum = idx + 1;

      // A: ลำดับ
      const cellA = row.getCell(1);
      cellA.value = rowNum;
      cellA.alignment = { horizontal: "center", vertical: "middle" };
      cellA.font = { name: "TH Sarabun New", size: 11 };
      cellA.border = thinBorder;

      // B: วัน/เดือน/ปี
      const cellB = row.getCell(2);
      cellB.value = sale.date.toLocaleDateString("th-TH");
      cellB.alignment = { horizontal: "center", vertical: "middle" };
      cellB.font = { name: "TH Sarabun New", size: 11 };
      cellB.border = thinBorder;

      // C: ประเภทเอกสาร
      const cellC = row.getCell(3);
      cellC.value = sale.docType;
      cellC.alignment = { horizontal: "center", vertical: "middle" };
      cellC.font = { name: "TH Sarabun New", size: 11 };
      cellC.border = thinBorder;

      // D: เลขที่ เล่มที่
      const cellD = row.getCell(4);
      cellD.value = sale.taxInvoiceNumber;
      cellD.alignment = { horizontal: "center", vertical: "middle" };
      cellD.font = { name: "TH Sarabun New", size: 11 };
      cellD.border = thinBorder;

      // E: ชื่อผู้ซื้อสินค้า/ผู้รับบริการ
      const cellE = row.getCell(5);
      cellE.value = sale.buyerName;
      cellE.alignment = { horizontal: "left", vertical: "middle" };
      cellE.font = { name: "TH Sarabun New", size: 11 };
      cellE.border = thinBorder;

      // F: เลขประจำตัวผู้เสียภาษี
      const cellF = row.getCell(6);
      cellF.value = sale.buyerTaxId;
      cellF.alignment = { horizontal: "center", vertical: "middle" };
      cellF.font = { name: "TH Sarabun New", size: 11 };
      cellF.border = thinBorder;

      // G: เบอร์โทร
      const cellG = row.getCell(7);
      cellG.value = sale.buyerPhone;
      cellG.alignment = { horizontal: "center", vertical: "middle" };
      cellG.font = { name: "TH Sarabun New", size: 11 };
      cellG.border = thinBorder;

      // H: ที่อยู่
      const cellH = row.getCell(8);
      cellH.value = sale.buyerAddress;
      cellH.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
      cellH.font = { name: "TH Sarabun New", size: 11 };
      cellH.border = thinBorder;

      // I: มูลค่าสินค้าหรือบริการ
      const cellI = row.getCell(9);
      cellI.value = sale.subtotal;
      cellI.numFmt = "#,##0.00";
      cellI.alignment = { horizontal: "right", vertical: "middle" };
      cellI.font = { name: "TH Sarabun New", size: 11 };
      cellI.border = thinBorder;

      // J: จำนวนเงินภาษีมูลค่าเพิ่ม (7%)
      const cellJ = row.getCell(10);
      cellJ.value = sale.taxAmount;
      cellJ.numFmt = "#,##0.00";
      cellJ.alignment = { horizontal: "right", vertical: "middle" };
      cellJ.font = { name: "TH Sarabun New", size: 11 };
      cellJ.border = thinBorder;

      // K: มูลค่าสินค้ารวมภาษีมูลค่าเพิ่ม
      const cellK = row.getCell(11);
      cellK.value = sale.total;
      cellK.numFmt = "#,##0.00";
      cellK.alignment = { horizontal: "right", vertical: "middle" };
      cellK.font = { name: "TH Sarabun New", size: 11 };
      cellK.border = thinBorder;

      // L: SU
      const cellL = row.getCell(12);
      cellL.value = sale.status;
      cellL.alignment = { horizontal: "center", vertical: "middle" };
      cellL.font = { name: "TH Sarabun New", size: 11 };
      cellL.border = thinBorder;

      ws.getRow(currentRow).height = 22;
      totalSubtotal += sale.subtotal;
      totalTax += sale.taxAmount;
      totalTotal += sale.total;
      currentRow++;
    });
  }

  // ---- Summary / Total row ----
  const totalRow = ws.getRow(currentRow);
  ws.mergeCells(`A${currentRow}:I${currentRow}`);
  const totalLabelCell = totalRow.getCell(1);
  totalLabelCell.value = "รวมทั้งหมด (บาท)";
  totalLabelCell.font = { name: "TH Sarabun New", size: 11, bold: true };
  totalLabelCell.alignment = { horizontal: "center", vertical: "middle" };
  totalLabelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDE9D9" } };
  totalLabelCell.border = thinBorder;

  // Apply border to merged cells
  for (let c = 2; c <= 9; c++) {
    totalRow.getCell(c).border = thinBorder;
    totalRow.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDE9D9" } };
  }

  const totalSubtotalCell = totalRow.getCell(9);
  totalSubtotalCell.value = totalSubtotal;
  totalSubtotalCell.numFmt = "#,##0.00";
  totalSubtotalCell.font = { name: "TH Sarabun New", size: 11, bold: true };
  totalSubtotalCell.alignment = { horizontal: "right", vertical: "middle" };
  totalSubtotalCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDE9D9" } };
  totalSubtotalCell.border = thinBorder;

  const totalTaxCell = totalRow.getCell(10);
  totalTaxCell.value = totalTax;
  totalTaxCell.numFmt = "#,##0.00";
  totalTaxCell.font = { name: "TH Sarabun New", size: 11, bold: true };
  totalTaxCell.alignment = { horizontal: "right", vertical: "middle" };
  totalTaxCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDE9D9" } };
  totalTaxCell.border = thinBorder;

  const totalTotalCell = totalRow.getCell(11);
  totalTotalCell.value = totalTotal;
  totalTotalCell.numFmt = "#,##0.00";
  totalTotalCell.font = { name: "TH Sarabun New", size: 11, bold: true };
  totalTotalCell.alignment = { horizontal: "right", vertical: "middle" };
  totalTotalCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDE9D9" } };
  totalTotalCell.border = thinBorder;

  const totalSuCell = totalRow.getCell(13);
  totalSuCell.value = "";
  totalSuCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDE9D9" } };
  totalSuCell.border = thinBorder;

  ws.getRow(currentRow).height = 26;

  // ---- Footer note ----
  currentRow += 2;
  ws.mergeCells(`A${currentRow}:M${currentRow}`);
  const footerCell = ws.getCell(`A${currentRow}`);
  footerCell.value = `รายงานสร้างเมื่อ ${new Date().toLocaleString("th-TH")}`;
  footerCell.font = { name: "TH Sarabun New", size: 10, italic: true, color: { argb: "FF808080" } };
  footerCell.alignment = { horizontal: "right", vertical: "middle" };

  // ---- Write file ----
  const fileName = `รายงานขาย_${storeName}_${dateFrom || "all"}_${dateTo || ""}.xlsx`;
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Maintain backward compatibility with old name
export const exportTaxInvoiceExcel = exportSalesReportExcel;
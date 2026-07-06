import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { SARABUN_REGULAR } from "./sarabun-regular";
import { SARABUN_BOLD } from "./sarabun-bold";

function fmt(n: number) {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: string;
  total: string;
}

export interface ReceiptData {
  billNumber: string;
  taxInvoiceNumber?: string;
  isTaxInvoice: boolean;
  createdAt: Date;
  employeeName?: string;
  buyerName?: string;
  buyerPhone?: string;
  buyerAddress?: string;
  buyerTaxId?: string;
  licensePlate?: string;
  items: ReceiptItem[];
  serviceFee?: string;
  serviceDescription?: string;
  subtotal: string;
  discount?: string;
  vatType?: string;
  taxRate?: string;
  taxAmount?: string;
  total: string;
  paymentMethod: string;
  note?: string;
  storeName: string;
  branchName?: string;
  storeAddress?: string;
  storePhone?: string;
  storeTaxId?: string;
  storeLogo?: string;
}

function initDoc(): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.addFileToVFS("Sarabun-Regular.ttf", SARABUN_REGULAR);
  doc.addFont("Sarabun-Regular.ttf", "Sarabun", "normal");
  doc.addFileToVFS("Sarabun-Bold.ttf", SARABUN_BOLD);
  doc.addFont("Sarabun-Bold.ttf", "Sarabun", "bold");
  return doc;
}

export function generateReceiptPdf(data: ReceiptData): Buffer {
  const doc = initDoc();
  const pageWidth = 210;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 12;

  // ============= HEADER BAR (orange gradient simulated) =============
  doc.setFillColor(234, 88, 12); // #ea580c
  doc.roundedRect(margin, y, contentWidth, 22, 3, 3, "F");

  // Title
  doc.setFont("Sarabun", "bold");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  const docTitle = data.isTaxInvoice ? "ใบกำกับภาษี / TAX INVOICE" : "ใบเสร็จรับเงิน / RECEIPT";
  doc.text(docTitle, margin + 6, y + 9);

  // Store name
  doc.setFont("Sarabun", "normal");
  doc.setFontSize(10);
  const storeLabel = data.storeName + (data.branchName ? ` - ${data.branchName}` : "");
  doc.text(storeLabel, margin + 6, y + 15);

  // Store detail (address, phone, tax)
  doc.setFontSize(7.5);
  let storeDetail = "";
  if (data.storeAddress) storeDetail += data.storeAddress;
  if (data.storePhone) storeDetail += (storeDetail ? " | โทร. " : "โทร. ") + data.storePhone;
  if (storeDetail) doc.text(storeDetail, margin + 6, y + 20);

  y += 26;

  // ============= STORE TAX ID =============
  if (data.storeTaxId) {
    doc.setFont("Sarabun", "normal");
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.text(`เลขประจำตัวผู้เสียภาษี: ${data.storeTaxId}`, margin + 6, y);
    y += 5;
  }

  // ============= INFO SECTION (Bill number + Date) =============
  doc.setDrawColor(230, 230, 230);
  doc.setFillColor(248, 248, 248);

  // Left box
  const leftBoxW = contentWidth / 2 - 2;
  doc.roundedRect(margin, y, leftBoxW, 22, 2, 2, "FD");
  doc.setFont("Sarabun", "normal");
  doc.setTextColor(136, 136, 136);
  doc.setFontSize(8);
  const billLabel = data.isTaxInvoice ? "เลขที่ใบกำกับภาษี" : "เลขที่บิล";
  doc.text(billLabel, margin + 4, y + 5);
  doc.setFont("Sarabun", "bold");
  doc.setTextColor(26, 26, 26);
  doc.setFontSize(9);
  doc.text(data.isTaxInvoice ? (data.taxInvoiceNumber || data.billNumber) : data.billNumber, margin + 4, y + 10);
  if (data.employeeName) {
    doc.setFont("Sarabun", "normal");
    doc.setTextColor(136, 136, 136);
    doc.setFontSize(8);
    doc.text("พนักงานขาย", margin + 4, y + 15);
    doc.setTextColor(26, 26, 26);
    doc.text(data.employeeName, margin + 4, y + 19);
  }

  // Right box
  const rightBoxX = margin + leftBoxW + 4;
  doc.setFillColor(248, 248, 248);
  doc.roundedRect(rightBoxX, y, leftBoxW, 22, 2, 2, "FD");
  doc.setFont("Sarabun", "normal");
  doc.setTextColor(136, 136, 136);
  doc.setFontSize(8);
  doc.text("วันที่", rightBoxX + leftBoxW - 4, y + 5, { align: "right" });
  doc.setFont("Sarabun", "bold");
  doc.setTextColor(26, 26, 26);
  doc.setFontSize(9);
  doc.text(fmtDate(data.createdAt), rightBoxX + leftBoxW - 4, y + 10, { align: "right" });
  doc.setFont("Sarabun", "normal");
  doc.setTextColor(136, 136, 136);
  doc.setFontSize(8);
  doc.text("เวลา", rightBoxX + leftBoxW - 4, y + 15, { align: "right" });
  doc.setTextColor(26, 26, 26);
  doc.text(fmtTime(data.createdAt), rightBoxX + leftBoxW - 4, y + 19, { align: "right" });

  y += 26;

  // ============= BUYER SECTION =============
  if (data.buyerName || data.buyerTaxId || data.buyerAddress) {
    doc.setDrawColor(224, 224, 224);
    doc.setFillColor(254, 254, 254);
    const buyerBoxH = 6 + (data.buyerName ? 4.5 : 0) + (data.buyerPhone ? 4.5 : 0) + (data.buyerAddress ? 4.5 : 0) + (data.buyerTaxId ? 4.5 : 0) + (data.licensePlate ? 4.5 : 0) + 2;
    doc.roundedRect(margin, y, contentWidth, buyerBoxH, 2, 2, "FD");

    doc.setFont("Sarabun", "bold");
    doc.setTextColor(234, 88, 12);
    doc.setFontSize(9);
    doc.text("ข้อมูลผู้ซื้อ / Customer Information", margin + 4, y + 5);
    doc.setDrawColor(240, 240, 240);
    doc.line(margin + 4, y + 7, margin + contentWidth - 4, y + 7);

    let by = y + 11;
    doc.setFont("Sarabun", "normal");
    doc.setFontSize(8.5);
    if (data.buyerName) {
      doc.setTextColor(136, 136, 136);
      doc.text("ชื่อ:", margin + 4, by);
      doc.setTextColor(26, 26, 26);
      doc.text(data.buyerName, margin + 18, by);
      if (data.buyerPhone) {
        doc.setTextColor(136, 136, 136);
        doc.text("โทร:", margin + contentWidth / 2, by);
        doc.setTextColor(26, 26, 26);
        doc.text(data.buyerPhone, margin + contentWidth / 2 + 12, by);
      }
      by += 4.5;
    }
    if (data.buyerAddress) {
      doc.setTextColor(136, 136, 136);
      doc.text("ที่อยู่:", margin + 4, by);
      doc.setTextColor(26, 26, 26);
      const addrLines = doc.splitTextToSize(data.buyerAddress, contentWidth - 24);
      doc.text(addrLines, margin + 18, by);
      by += addrLines.length * 4;
    }
    if (data.buyerTaxId) {
      doc.setTextColor(136, 136, 136);
      doc.text("เลขประจำตัวผู้เสียภาษี:", margin + 4, by);
      doc.setTextColor(26, 26, 26);
      doc.text(data.buyerTaxId, margin + 42, by);
      by += 4.5;
    }
    if (data.licensePlate) {
      doc.setTextColor(136, 136, 136);
      doc.text("ทะเบียนรถ:", margin + 4, by);
      doc.setTextColor(26, 26, 26);
      doc.text(data.licensePlate, margin + 24, by);
      by += 4.5;
    }

    y = y + buyerBoxH + 3;
  }

  // ============= ITEMS TABLE =============
  const tableColumns = [
    { header: "#", dataKey: "idx" },
    { header: "รายการสินค้า / Description", dataKey: "name" },
    { header: "จำนวน", dataKey: "qty" },
    { header: "ราคา/หน่วย", dataKey: "price" },
    { header: "จำนวนเงิน", dataKey: "total" },
  ];

  const tableRows: any[] = [];
  data.items.forEach((item, i) => {
    tableRows.push({
      idx: (i + 1).toString(),
      name: item.name,
      qty: item.quantity.toString(),
      price: fmt(parseFloat(item.unitPrice)),
      total: fmt(parseFloat(item.total)),
    });
  });

  if (data.serviceFee && parseFloat(data.serviceFee) > 0) {
    tableRows.push({
      idx: (data.items.length + 1).toString(),
      name: data.serviceDescription || "ค่าบริการ",
      qty: "1",
      price: fmt(parseFloat(data.serviceFee)),
      total: fmt(parseFloat(data.serviceFee)),
    });
  }

  autoTable(doc, {
    startY: y,
    head: [tableColumns.map(c => c.header)],
    body: tableRows.map(r => tableColumns.map(c => r[c.dataKey])),
    margin: { left: margin, right: margin },
    styles: {
      font: "Sarabun",
      fontStyle: "normal",
      fontSize: 8.5,
      cellPadding: 2.5,
      textColor: [26, 26, 26],
      lineColor: [240, 240, 240],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: [255, 247, 237],
      textColor: [146, 64, 14],
      fontStyle: "bold",
      fontSize: 7.5,
      lineColor: [234, 88, 12],
      lineWidth: { top: 0.6, bottom: 0.6, left: 0, right: 0 },
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      1: { cellWidth: "auto" },
      2: { halign: "center", cellWidth: 18 },
      3: { halign: "right", cellWidth: 28 },
      4: { halign: "right", cellWidth: 30 },
    },
    alternateRowStyles: { fillColor: [250, 250, 250] },
  });

  y = (doc as any).lastAutoTable.finalY + 4;

  // ============= SUMMARY =============
  const summaryX = margin + contentWidth - 80;
  const summaryW = 80;
  doc.setFont("Sarabun", "normal");
  doc.setFontSize(9);
  doc.setTextColor(85, 85, 85);

  // Subtotal
  const subTotal = parseFloat(data.subtotal || "0") + parseFloat(data.serviceFee || "0");
  doc.text("รวมมูลค่าสินค้า/บริการ", summaryX, y);
  doc.text(fmt(subTotal), summaryX + summaryW, y, { align: "right" });
  y += 5;

  // Discount
  const discVal = parseFloat(data.discount || "0");
  if (discVal > 0) {
    doc.setTextColor(220, 38, 38);
    doc.text("ส่วนลด", summaryX, y);
    doc.text(`-${fmt(discVal)}`, summaryX + summaryW, y, { align: "right" });
    y += 5;
  }

  // Tax
  if (data.isTaxInvoice && data.taxAmount) {
    const taxAmt = parseFloat(data.taxAmount);
    const totalBeforeTax = parseFloat(data.total) - taxAmt;
    doc.setTextColor(85, 85, 85);
    doc.text("มูลค่าก่อนภาษี", summaryX, y);
    doc.text(fmt(totalBeforeTax), summaryX + summaryW, y, { align: "right" });
    y += 5;
    doc.setTextColor(37, 99, 235);
    const vatLabel = `ภาษีมูลค่าเพิ่ม ${data.vatType === "vat_in" ? "(รวมในราคา) " : ""}${data.taxRate || "7"}%`;
    doc.text(vatLabel, summaryX, y);
    doc.text(fmt(taxAmt), summaryX + summaryW, y, { align: "right" });
    y += 5;
  }

  // Grand total
  doc.setDrawColor(234, 88, 12);
  doc.setLineWidth(0.8);
  doc.line(summaryX, y, summaryX + summaryW, y);
  y += 5;
  doc.setFont("Sarabun", "bold");
  doc.setFontSize(13);
  doc.setTextColor(26, 26, 26);
  doc.text("ยอดรวมทั้งสิ้น", summaryX, y);
  doc.setTextColor(234, 88, 12);
  doc.text(`${fmt(parseFloat(data.total))} บาท`, summaryX + summaryW, y, { align: "right" });
  y += 8;

  // ============= PAYMENT METHOD =============
  doc.setFillColor(255, 247, 237);
  doc.setDrawColor(254, 215, 170);
  doc.roundedRect(margin, y, contentWidth, 8, 2, 2, "FD");
  doc.setFont("Sarabun", "normal");
  doc.setFontSize(9);
  doc.setTextColor(85, 85, 85);
  doc.text("วิธีชำระเงิน", margin + 4, y + 5.5);
  doc.setFont("Sarabun", "bold");
  doc.setTextColor(234, 88, 12);
  const payLabel = data.paymentMethod === "cash" ? "เงินสด" : data.paymentMethod === "transfer" ? "โอนเงิน" : "เครดิต";
  doc.text(payLabel, margin + contentWidth - 4, y + 5.5, { align: "right" });
  y += 12;

  // ============= NOTE =============
  if (data.note) {
    doc.setDrawColor(229, 231, 235);
    doc.setFillColor(249, 250, 251);
    const noteLines = doc.splitTextToSize(data.note, contentWidth - 16);
    const noteH = 8 + noteLines.length * 4;
    doc.roundedRect(margin, y, contentWidth, noteH, 2, 2, "FD");
    doc.setFont("Sarabun", "bold");
    doc.setFontSize(8);
    doc.setTextColor(51, 51, 51);
    doc.text("หมายเหตุ:", margin + 4, y + 5);
    doc.setFont("Sarabun", "normal");
    doc.setTextColor(85, 85, 85);
    doc.text(noteLines, margin + 22, y + 5);
    y += noteH + 4;
  }

  // ============= SIGNATURE SECTION =============
  y += 6;
  doc.setDrawColor(224, 224, 224);
  doc.setLineWidth(0.3);
  doc.line(margin, y, margin + contentWidth, y);
  y += 12;

  const sigPositions = [
    { x: margin + contentWidth * 0.17, label: "ผู้รับเงิน" },
    { x: margin + contentWidth * 0.5, label: "ผู้จ่ายเงิน / ผู้ซื้อ" },
    { x: margin + contentWidth * 0.83, label: "ผู้อนุมัติ" },
  ];

  sigPositions.forEach(sig => {
    // Dotted line
    doc.setDrawColor(153, 153, 153);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(sig.x - 22, y, sig.x + 22, y);
    doc.setLineDashPattern([], 0);
    // Label
    doc.setFont("Sarabun", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 51, 51);
    doc.text(sig.label, sig.x, y + 5, { align: "center" });
    doc.setFont("Sarabun", "normal");
    doc.setFontSize(7);
    doc.setTextColor(153, 153, 153);
    doc.text("(...............................)", sig.x, y + 9, { align: "center" });
    doc.text("วันที่ ____/____/____", sig.x, y + 13, { align: "center" });
  });

  y += 20;

  // ============= FOOTER =============
  doc.setDrawColor(238, 238, 238);
  doc.setLineWidth(0.3);
  doc.line(margin, y, margin + contentWidth, y);
  y += 5;
  doc.setFont("Sarabun", "bold");
  doc.setFontSize(10);
  doc.setTextColor(234, 88, 12);
  doc.text("ขอบคุณที่ใช้บริการ / Thank you for your business", pageWidth / 2, y, { align: "center" });
  y += 4;
  doc.setFont("Sarabun", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(170, 170, 170);
  doc.text(
    `${data.storeName}${data.storePhone ? ` | โทร. ${data.storePhone}` : ""}`,
    pageWidth / 2, y, { align: "center" }
  );

  return Buffer.from(doc.output("arraybuffer"));
}

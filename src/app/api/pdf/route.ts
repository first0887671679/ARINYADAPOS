import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/db";
import { sales, saleItems, products, employees, storeSettings, quotations, quotationItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateReceiptPdf, type ReceiptData } from "@/lib/generate-pdf";
import { getPublicBaseUrl } from "@/lib/public-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── Mobile / In-App Browser Detection ───────────────────────────────
function isMobileOrInAppBrowser(userAgent: string | null): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  // In-app browsers that cannot render PDF inline
  const inAppPatterns = [
    "line/", "fbav", "fban", "instagram", "tiktok",
    "wechat", "whatsapp", "telegram", "twitter",
    "messenger", "zalo", "viber",
  ];
  if (inAppPatterns.some((p) => ua.includes(p))) return true;
  // Generic mobile check
  const mobilePatterns = [
    "iphone", "ipad", "ipod", "android", "mobile",
    "windows phone", "blackberry",
  ];
  return mobilePatterns.some((p) => ua.includes(p));
}

// Build an HTML wrapper page that embeds a PDF (base64) for mobile browsers
// Includes fallback button to view as image if PDF rendering fails
function buildPdfViewerHtml(pdfBase64: string, filename: string, imageUrl?: string): string {
  const imageFallbackBtn = imageUrl
    ? `<a class="btn-image-fallback" href="${imageUrl}" target="_blank">📤 ดูเป็นรูป (แชร์ง่าย)</a>`
    : ``;

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0">
  <title>${filename}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 100;
      width: 100%;
      background: linear-gradient(135deg, #2563eb, #2563eb);
      color: #fff;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      flex-wrap: wrap;
      gap: 8px;
    }
    .toolbar-title {
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 50%;
    }
    .toolbar-actions {
      display: flex;
      gap: 6px;
      flex-shrink: 0;
    }
    .btn-download {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: #fff;
      color: #2563eb;
      border: none;
      border-radius: 8px;
      padding: 7px 12px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
      white-space: nowrap;
    }
    .btn-download:active { background: #bfdbfe; }
    .btn-image-fallback {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: #22c55e;
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 7px 12px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
      white-space: nowrap;
    }
    .btn-image-fallback:active { background: #16a34a; }
    .pdf-container {
      flex: 1;
      width: 100%;
      max-width: 900px;
      padding: 8px;
    }
    .pdf-embed {
      width: 100%;
      min-height: 80vh;
      border: none;
      border-radius: 8px;
      background: #fff;
      box-shadow: 0 1px 4px rgba(0,0,0,0.1);
    }
    .fallback-msg {
      text-align: center;
      padding: 40px 20px;
      color: #666;
    }
    .fallback-msg h2 { color: #2563eb; margin-bottom: 12px; }
    .fallback-msg p { margin-bottom: 16px; line-height: 1.6; }
    .fallback-msg .btn-big {
      display: inline-block;
      background: #2563eb;
      color: #fff;
      padding: 14px 32px;
      border-radius: 10px;
      font-size: 16px;
      font-weight: 700;
      text-decoration: none;
      margin-top: 8px;
    }
    .fallback-msg .btn-image-big {
      display: inline-block;
      background: #22c55e;
      color: #fff;
      padding: 14px 32px;
      border-radius: 10px;
      font-size: 16px;
      font-weight: 700;
      text-decoration: none;
      margin-top: 12px;
    }
    .fallback-actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
      align-items: center;
      margin-top: 16px;
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <span class="toolbar-title">${filename}</span>
    <div class="toolbar-actions">
      ${imageFallbackBtn}
      <a class="btn-download" id="downloadBtn" href="data:application/pdf;base64,${pdfBase64}" download="${filename}.pdf">
        ⬇ ดาวน์โหลด PDF
      </a>
    </div>
  </div>
  <div class="pdf-container">
    <object class="pdf-embed" data="data:application/pdf;base64,${pdfBase64}" type="application/pdf">
      <embed class="pdf-embed" src="data:application/pdf;base64,${pdfBase64}" type="application/pdf" />
      <div class="fallback-msg">
        <h2>ไม่สามารถแสดง PDF ได้</h2>
        <p>เบราว์เซอร์ของคุณไม่รองรับการแสดง PDF โดยตรง</p>
        <div class="fallback-actions">
          ${imageFallbackBtn ? `<a class="btn-image-big" href="${imageUrl}" target="_blank">📤 ดูเป็นรูปภาพ (แชร์ง่ายกว่า)</a>` : ``}
          <a class="btn-big" href="data:application/pdf;base64,${pdfBase64}" download="${filename}.pdf">
            ⬇ ดาวน์โหลด PDF
          </a>
        </div>
      </div>
    </object>
  </div>
  <script>
    // Auto-trigger download for in-app browsers that can't display PDF at all
    (function() {
      var ua = navigator.userAgent.toLowerCase();
      var inApp = ['line/', 'fbav', 'fban', 'instagram', 'tiktok', 'wechat',
                   'whatsapp', 'telegram', 'twitter', 'messenger'].some(function(p) { return ua.indexOf(p) >= 0; });
      if (inApp) {
        // Show fallback message
        var obj = document.querySelector('object');
        if (obj) {
          var fallback = obj.querySelector('.fallback-msg');
          if (fallback) fallback.style.display = 'block';
        }
        // Try to trigger download
        var a = document.createElement('a');
        a.href = 'data:application/pdf;base64,${pdfBase64}';
        a.download = '${filename}.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    })();
  </script>
</body>
</html>`;
}

function fmt(n: number) {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

// Generate receipt HTML for PDF/Cloudinary (single page, no copy label)
function buildReceiptHtml(sale: any, items: any[], store: any, emp: any) {
  let idx = 0;
  let itemsHtml = "";
  items.forEach((si: any) => {
    idx++;
    const p = si.products || si.product;
    const item = si.sale_items || si.saleItem || si;
    const nameDisplay = [p?.brand, p?.name, p?.model].filter(Boolean).join(" / ") || "สินค้า";
    const bg = idx % 2 === 0 ? ' style="background:#fafafa"' : '';
    itemsHtml += `<tr${bg}><td class="tc">${idx}</td><td>${nameDisplay}</td><td class="tc">${item.quantity}</td><td class="tr">${fmt(parseFloat(item.unitPrice))}</td><td class="tr">${fmt(parseFloat(item.total))}</td></tr>`;
  });
  if (parseFloat(sale.serviceFee || "0") > 0) {
    idx++;
    itemsHtml += `<tr class="svc"><td class="tc">${idx}</td><td>${sale.serviceDescription || "ค่าบริการ"}</td><td class="tc">1</td><td class="tr">${fmt(parseFloat(sale.serviceFee))}</td><td class="tr">${fmt(parseFloat(sale.serviceFee))}</td></tr>`;
  }
  const payLabel = sale.paymentMethod === "cash" ? "เงินสด" : sale.paymentMethod === "transfer" ? "โอนเงิน" : "เครดิต";
  const bName = sale.buyerName || "";
  const bPhone = sale.buyerPhone || "";
  const bAddr = sale.buyerAddress || "";
  const bTaxId = sale.buyerTaxId || "";
  const bLicensePlate = sale.licensePlate || "";
  const createdAt = new Date(sale.createdAt);
  const docTitle = sale.isTaxInvoice ? "ใบกำกับภาษี / TAX INVOICE" : "ใบเสร็จรับเงิน / RECEIPT";
  const logoUrl = store.storeLogo || "";

  return `<!DOCTYPE html><html lang="th"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Sarabun',sans-serif;padding:10mm 12mm;font-size:11px;color:#1a1a1a;line-height:1.4}
/* Header */
.header-bar{background:linear-gradient(135deg,#2563eb 0%,#2563eb 100%);color:#fff;padding:14px 18px;border-radius:8px;margin-bottom:12px;display:flex;align-items:center;gap:14px}
.logo-box{width:72px;height:72px;background:#fff;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;padding:4px;box-shadow:0 1px 3px rgba(0,0,0,0.1)}
.logo-box img{width:100%;height:100%;object-fit:contain}
.logo-placeholder{width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.3)}
.header-text{flex:1}
.doc-title{font-size:17px;font-weight:700;letter-spacing:0.5px;text-shadow:0 1px 2px rgba(0,0,0,0.1)}
.store-name{font-size:13px;font-weight:600;margin-top:2px;opacity:0.95}
.store-detail{font-size:9.5px;opacity:0.85;margin-top:2px;line-height:1.4}
/* Info Section */
.info-section{display:flex;gap:10px;margin-bottom:10px}
.info-left,.info-right{flex:1;background:#f8f8f8;border:1px solid #e8e8e8;border-radius:6px;padding:10px 12px;font-size:10.5px}
.info-right{text-align:right}
.info-label{color:#888;font-size:9.5px;display:block;margin-bottom:1px}
.info-val{font-weight:600;color:#1a1a1a}
.info-row{margin-bottom:4px}
/* Buyer Section */
.buyer-section{border:1px solid #e0e0e0;border-radius:6px;padding:10px 12px;margin-bottom:10px;font-size:10.5px;background:#fefefe}
.buyer-title{font-weight:700;font-size:11px;color:#2563eb;margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid #f0f0f0}
.buyer-grid{display:flex;flex-wrap:wrap;gap:4px 20px}
.buyer-item{min-width:45%}
.buyer-item .bl{color:#888;font-size:9.5px}
/* Items Table */
table.items{width:100%;border-collapse:collapse;margin-bottom:10px}
table.items th{background:#eff6ff;border-top:2px solid #2563eb;border-bottom:2px solid #2563eb;padding:6px 5px;font-weight:700;font-size:9.5px;text-transform:uppercase;color:#92400e;letter-spacing:0.3px}
table.items td{padding:5px;border-bottom:1px solid #f0f0f0;font-size:10.5px}
table.items .tc{text-align:center}
table.items .tr{text-align:right}
table.items tr.svc td{color:#b45309;font-style:italic}
table.items tbody tr:last-child td{border-bottom:2px solid #2563eb}
/* Summary */
.summary-section{display:flex;justify-content:flex-end;margin-bottom:10px}
.summary-box{width:260px}
.s-row{display:flex;justify-content:space-between;padding:3px 0;font-size:11px}
.s-row.disc{color:#dc2626}
.s-row.tax{color:#2563eb}
.s-row.total{font-weight:700;font-size:15px;border-top:3px double #2563eb;padding-top:8px;margin-top:4px}
.s-row.total .amt{color:#2563eb}
/* Payment */
.pay-section{display:flex;justify-content:space-between;align-items:center;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:8px 12px;margin-bottom:10px;font-size:11px}
.pay-method{font-weight:700;color:#2563eb}
/* Note */
.note-section{background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:8px 12px;font-size:10px;color:#555;margin-bottom:10px}
.note-section strong{color:#333}
/* Signature */
.sig-section{display:flex;justify-content:space-around;margin-top:24px;padding-top:12px;border-top:1px solid #e0e0e0}
.sig-block{text-align:center;width:150px}
.sig-line{border-bottom:1px dotted #999;height:40px;margin-bottom:4px}
.sig-label{font-size:10px;font-weight:600;color:#333}
.sig-sub{font-size:8.5px;color:#999;margin-top:1px}
/* Footer */
.footer{text-align:center;margin-top:12px;padding-top:8px;border-top:1px solid #eee}
.footer-thanks{font-size:12px;font-weight:600;color:#2563eb}
.footer-sub{font-size:9px;color:#aaa;margin-top:2px}
</style>
</head><body>

<div class="header-bar">
  <div class="logo-box">
    ${logoUrl ? `<img src="${logoUrl}" alt="logo">` : `<div class="logo-placeholder"></div>`}
  </div>
  <div class="header-text">
    <div class="doc-title">${docTitle}</div>
    <div class="store-name">${store.storeName || "ร้านแบตเตอรี่"}${store.branchName ? ` - ${store.branchName}` : ""}</div>
    <div class="store-detail">
      ${store.address ? `${store.address}` : ""}
      ${store.phone ? ` | โทร. ${store.phone}` : ""}
      ${store.taxId ? `<br>เลขประจำตัวผู้เสียภาษี: ${store.taxId}` : ""}
    </div>
  </div>
</div>

<div class="info-section">
  <div class="info-left">
    <div class="info-row"><span class="info-label">เลขที่${sale.isTaxInvoice ? "ใบกำกับภาษี" : "บิล"}</span><span class="info-val">${sale.isTaxInvoice ? sale.taxInvoiceNumber : sale.billNumber}</span></div>
    ${sale.isTaxInvoice && sale.billNumber !== sale.taxInvoiceNumber ? `<div class="info-row"><span class="info-label">เลขที่บิลอ้างอิง</span><span class="info-val">${sale.billNumber}</span></div>` : ""}
    ${emp?.name ? `<div class="info-row"><span class="info-label">พนักงานขาย</span><span class="info-val">${emp.name}</span></div>` : ""}
  </div>
  <div class="info-right">
    <div class="info-row"><span class="info-label">วันที่</span><span class="info-val">${fmtDate(createdAt)}</span></div>
    <div class="info-row"><span class="info-label">เวลา</span><span class="info-val">${fmtTime(createdAt)}</span></div>
  </div>
</div>

${bName || bTaxId || bAddr ? `<div class="buyer-section">
  <div class="buyer-title">ข้อมูลผู้ซื้อ / Customer Information</div>
  <div class="buyer-grid">
    ${bName ? `<div class="buyer-item"><span class="bl">ชื่อ:</span> ${bName}</div>` : ""}
    ${bPhone ? `<div class="buyer-item"><span class="bl">โทร:</span> ${bPhone}</div>` : ""}
    ${bAddr ? `<div class="buyer-item" style="min-width:100%"><span class="bl">ที่อยู่:</span> ${bAddr}</div>` : ""}
    ${bTaxId ? `<div class="buyer-item"><span class="bl">เลขประจำตัวผู้เสียภาษี:</span> ${bTaxId}</div>` : ""}
    ${bLicensePlate ? `<div class="buyer-item"><span class="bl">ทะเบียนรถ:</span> ${bLicensePlate}</div>` : ""}
  </div>
</div>` : ""}

<table class="items">
  <thead><tr><th class="tc" style="width:30px">#</th><th style="text-align:left">รายการสินค้า / Description</th><th class="tc" style="width:50px">จำนวน</th><th class="tr" style="width:80px">ราคา/หน่วย</th><th class="tr" style="width:90px">จำนวนเงิน</th></tr></thead>
  <tbody>${itemsHtml}</tbody>
</table>

<div class="summary-section"><div class="summary-box">
  <div class="s-row"><span>รวมมูลค่าสินค้า/บริการ</span><span>${fmt(parseFloat(sale.subtotal || "0") + parseFloat(sale.serviceFee || "0"))}</span></div>
  ${parseFloat(sale.discount || "0") > 0 ? `<div class="s-row disc"><span>ส่วนลด</span><span>-${fmt(parseFloat(sale.discount))}</span></div>` : ""}
  ${sale.isTaxInvoice ? `<div class="s-row"><span>มูลค่าก่อนภาษี</span><span>${fmt(parseFloat(sale.total) - parseFloat(sale.taxAmount || "0"))}</span></div><div class="s-row tax"><span>ภาษีมูลค่าเพิ่ม ${sale.vatType === "vat_in" ? "(รวมในราคา) " : ""}${sale.taxRate}%</span><span>${fmt(parseFloat(sale.taxAmount || "0"))}</span></div>` : ""}
  <div class="s-row total"><span>ยอดรวมทั้งสิ้น</span><span class="amt">${fmt(parseFloat(sale.total))} บาท</span></div>
</div></div>

<div class="pay-section">
  <span>วิธีชำระเงิน</span>
  <span class="pay-method">${payLabel}</span>
</div>

${sale.note ? `<div class="note-section"><strong>หมายเหตุ:</strong> ${sale.note}</div>` : ""}

<div class="sig-section">
  <div class="sig-block"><div class="sig-line"></div><div class="sig-label">ผู้รับเงิน</div><div class="sig-sub">(...............................)</div><div class="sig-sub">วันที่ ____/____/____</div></div>
  <div class="sig-block"><div class="sig-line"></div><div class="sig-label">ผู้จ่ายเงิน / ผู้ซื้อ</div><div class="sig-sub">(...............................)</div><div class="sig-sub">วันที่ ____/____/____</div></div>
  <div class="sig-block"><div class="sig-line"></div><div class="sig-label">ผู้อนุมัติ</div><div class="sig-sub">(...............................)</div><div class="sig-sub">วันที่ ____/____/____</div></div>
</div>

<div class="footer">
  <div class="footer-thanks">ขอบคุณที่ใช้บริการ / Thank you for your business</div>
  <div class="footer-sub">${store.storeName || "ร้านแบตเตอรี่"}${store.phone ? ` | โทร. ${store.phone}` : ""}</div>
</div>

</body></html>`;
}

// Generate quotation HTML for PDF conversion
function buildQuotationHtml(quot: any, items: any[], store: any) {
  let idx = 0;
  let itemsHtml = "";
  items.forEach((qi: any) => {
    idx++;
    const p = qi.products || qi.product;
    const item = qi.quotation_items || qi.quotationItem || qi;
    const nameDisplay = item.description || [p?.brand, p?.name, p?.model].filter(Boolean).join(" / ") || "สินค้า";
    const disc = parseFloat(item.discount || "0");
    const lineTotal = parseFloat(item.unitPrice) * item.quantity - disc;
    const bg = idx % 2 === 0 ? ' style="background:#fafafa"' : '';
    itemsHtml += `<tr${bg}><td class="tc">${idx}</td><td>${nameDisplay}</td><td class="tc">${item.quantity}</td><td class="tr">${fmt(parseFloat(item.unitPrice))}</td><td class="tr">${disc > 0 ? fmt(disc) : "-"}</td><td class="tr">${fmt(lineTotal)}</td></tr>`;
  });
  if (parseFloat(quot.serviceFee || "0") > 0) {
    idx++;
    itemsHtml += `<tr class="svc"><td class="tc">${idx}</td><td>${quot.serviceDescription || "ค่าบริการ"}</td><td class="tc">1</td><td class="tr">${fmt(parseFloat(quot.serviceFee))}</td><td class="tr">-</td><td class="tr">${fmt(parseFloat(quot.serviceFee))}</td></tr>`;
  }

  const createdAt = new Date(quot.createdAt);
  const validDate = new Date(createdAt);
  validDate.setDate(validDate.getDate() + (quot.validDays || 30));
  const bName = quot.buyerName || "";
  const bPhone = quot.buyerPhone || "";
  const bAddr = quot.buyerAddress || "";
  const bTaxId = quot.buyerTaxId || "";
  const logoUrl = store.storeLogo || "";

  return `<!DOCTYPE html><html lang="th"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Sarabun',sans-serif;padding:10mm 12mm;font-size:11px;color:#1a1a1a;line-height:1.4}
.header-bar{background:linear-gradient(135deg,#2563eb 0%,#2563eb 100%);color:#fff;padding:14px 18px;border-radius:8px;margin-bottom:12px;display:flex;align-items:center;gap:14px}
.logo-box{width:72px;height:72px;background:#fff;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;padding:4px;box-shadow:0 1px 3px rgba(0,0,0,0.1)}
.logo-box img{width:100%;height:100%;object-fit:contain}
.logo-placeholder{width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.3)}
.header-text{flex:1}
.doc-title{font-size:17px;font-weight:700;letter-spacing:0.5px;text-shadow:0 1px 2px rgba(0,0,0,0.1)}
.store-name{font-size:13px;font-weight:600;margin-top:2px;opacity:0.95}
.store-detail{font-size:9.5px;opacity:0.85;margin-top:2px;line-height:1.4}
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
table.items th{background:#eff6ff;border-top:2px solid #2563eb;border-bottom:2px solid #2563eb;padding:6px 5px;font-weight:700;font-size:9.5px;text-transform:uppercase;color:#92400e;letter-spacing:0.3px}
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
.note-section{background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:8px 12px;font-size:10px;color:#555;margin-bottom:10px}
.note-section strong{color:#333}
.validity-bar{background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:8px 12px;text-align:center;font-size:10.5px;color:#92400e;font-weight:600;margin-bottom:10px}
.sig-section{display:flex;justify-content:space-around;margin-top:24px;padding-top:12px;border-top:1px solid #e0e0e0}
.sig-block{text-align:center;width:150px}
.sig-line{border-bottom:1px dotted #999;height:40px;margin-bottom:4px}
.sig-label{font-size:10px;font-weight:600;color:#333}
.sig-sub{font-size:8.5px;color:#999;margin-top:1px}
.footer{text-align:center;margin-top:12px;padding-top:8px;border-top:1px solid #eee}
.footer-thanks{font-size:12px;font-weight:600;color:#2563eb}
.footer-sub{font-size:9px;color:#aaa;margin-top:2px}
</style>
</head><body>

<div class="header-bar">
  <div class="logo-box">
    ${logoUrl ? `<img src="${logoUrl}" alt="logo">` : `<div class="logo-placeholder"></div>`}
  </div>
  <div class="header-text">
    <div class="doc-title">ใบเสนอราคา / QUOTATION</div>
    <div class="store-name">${store.storeName || "ร้านแบตเตอรี่"}${store.branchName ? ` - ${store.branchName}` : ""}</div>
    <div class="store-detail">
      ${store.address ? `${store.address}` : ""}
      ${store.phone ? ` | โทร. ${store.phone}` : ""}
      ${store.taxId ? `<br>เลขประจำตัวผู้เสียภาษี: ${store.taxId}` : ""}
    </div>
  </div>
</div>

<div class="info-section">
  <div class="info-left">
    <div class="info-row"><span class="info-label">เลขที่ใบเสนอราคา</span><span class="info-val">${quot.quotationNumber}</span></div>
    ${bName ? `<div class="info-row"><span class="info-label">ลูกค้า</span><span class="info-val">${bName}</span></div>` : ""}
    ${bPhone ? `<div class="info-row"><span class="info-label">โทร</span><span class="info-val">${bPhone}</span></div>` : ""}
  </div>
  <div class="info-right">
    <div class="info-row"><span class="info-label">วันที่ออก</span><span class="info-val">${fmtDate(createdAt)}</span></div>
    <div class="info-row"><span class="info-label">ใช้ได้ถึง</span><span class="info-val">${fmtDate(validDate)}</span></div>
  </div>
</div>

${bAddr || bTaxId ? `<div class="buyer-section">
  <div class="buyer-title">ข้อมูลลูกค้า / Customer Information</div>
  <div class="buyer-grid">
    ${bName ? `<div class="buyer-item"><span class="bl">ชื่อ:</span> ${bName}</div>` : ""}
    ${bPhone ? `<div class="buyer-item"><span class="bl">โทร:</span> ${bPhone}</div>` : ""}
    ${bAddr ? `<div class="buyer-item" style="min-width:100%"><span class="bl">ที่อยู่:</span> ${bAddr}</div>` : ""}
    ${bTaxId ? `<div class="buyer-item"><span class="bl">เลขประจำตัวผู้เสียภาษี:</span> ${bTaxId}</div>` : ""}
  </div>
</div>` : ""}

<table class="items">
  <thead><tr><th class="tc" style="width:30px">#</th><th style="text-align:left">รายการสินค้า / Description</th><th class="tc" style="width:50px">จำนวน</th><th class="tr" style="width:80px">ราคา/หน่วย</th><th class="tr" style="width:65px">ส่วนลด</th><th class="tr" style="width:90px">จำนวนเงิน</th></tr></thead>
  <tbody>${itemsHtml}</tbody>
</table>

<div class="summary-section"><div class="summary-box">
  <div class="s-row"><span>รวมมูลค่าสินค้า/บริการ</span><span>${fmt(parseFloat(quot.subtotal || "0") + parseFloat(quot.serviceFee || "0"))}</span></div>
  ${parseFloat(quot.discount || "0") > 0 ? `<div class="s-row disc"><span>ส่วนลด</span><span>-${fmt(parseFloat(quot.discount))}</span></div>` : ""}
  ${quot.includeVat ? `<div class="s-row"><span>มูลค่าก่อนภาษี</span><span>${fmt(parseFloat(quot.total) - parseFloat(quot.taxAmount || "0"))}</span></div><div class="s-row tax"><span>ภาษีมูลค่าเพิ่ม ${quot.vatType === "vat_in" ? "(รวมในราคา) " : ""}${quot.taxRate}%</span><span>${fmt(parseFloat(quot.taxAmount || "0"))}</span></div>` : ""}
  <div class="s-row total"><span>ยอดรวมทั้งสิ้น</span><span class="amt">${fmt(parseFloat(quot.total))} บาท</span></div>
</div></div>

${quot.note ? `<div class="note-section"><strong>หมายเหตุ:</strong> ${quot.note}</div>` : ""}

<div class="validity-bar">ใบเสนอราคามีอายุ ${quot.validDays || 30} วัน นับจากวันที่ออก (ใช้ได้ถึง ${fmtDate(validDate)})</div>

<div class="sig-section">
  <div class="sig-block"><div class="sig-line"></div><div class="sig-label">ผู้เสนอราคา</div><div class="sig-sub">(...............................)</div><div class="sig-sub">วันที่ ____/____/____</div></div>
  <div class="sig-block"><div class="sig-line"></div><div class="sig-label">ผู้อนุมัติ</div><div class="sig-sub">(...............................)</div><div class="sig-sub">วันที่ ____/____/____</div></div>
  <div class="sig-block"><div class="sig-line"></div><div class="sig-label">ลูกค้า / ผู้สั่งซื้อ</div><div class="sig-sub">(...............................)</div><div class="sig-sub">วันที่ ____/____/____</div></div>
</div>

<div class="footer">
  <div class="footer-thanks">ขอบคุณที่ไว้วางใจ / Thank you for your trust</div>
  <div class="footer-sub">${store.storeName || "ร้านแบตเตอรี่"}${store.phone ? ` | โทร. ${store.phone}` : ""}</div>
</div>

</body></html>`;
}

async function uploadPdfToCloudinary(pdfBuffer: Buffer, filename: string, asPdf = false): Promise<string> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) throw new Error("Cloudinary ยังไม่ได้ตั้งค่า");

  const timestamp = Math.round(Date.now() / 1000).toString();
  const folder = "arinyadapos/documents";
  // Signing string: sorted params alphabetically, appended with api_secret
  const paramsToSign = `access_mode=public&folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash("sha1").update(paramsToSign).digest("hex");

  const ext = asPdf ? "pdf" : "html";
  const mimeType = asPdf ? "application/pdf" : "text/html";

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(pdfBuffer)], { type: mimeType }), `${filename}.${ext}`);
  form.append("access_mode", "public");
  form.append("folder", folder);
  form.append("timestamp", timestamp);
  form.append("api_key", apiKey);
  form.append("signature", signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("[PDF API] Cloudinary error:", err);
    throw new Error(err?.error?.message || "Upload PDF ล้มเหลว");
  }
  const data = await res.json();
  return data.secure_url;
}

// GET: Generate PDF URL for a receipt or quotation
// POST: Generate PDF + send via LINE
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("arinyadapos_session");
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try { JSON.parse(sessionCookie.value); } catch {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const body = await request.json();
    const { type, id, action } = body; // type: "receipt" | "quotation", action: "generate" | "send_line"

    // Get store settings
    const settingsArr = await db.select().from(storeSettings).limit(1);
    const store = settingsArr[0] || {};

    let html = "";
    let docNumber = "";
    let title = "";
    // Full document data for LINE
    let lineDocData: any = null;
    // PDF generation data (for receipt only)
    let receiptPdfData: ReceiptData | null = null;

    if (type === "receipt") {
      // Fetch sale with items and employee
      const saleArr = await db.select().from(sales).where(eq(sales.id, id)).limit(1);
      if (!saleArr[0]) return NextResponse.json({ error: "ไม่พบบิลขาย" }, { status: 404 });
      const sale = saleArr[0];

      const itemsRaw = await db.select().from(saleItems)
        .innerJoin(products, eq(saleItems.productId, products.id))
        .where(eq(saleItems.saleId, id));

      const empArr = sale.employeeId ? await db.select().from(employees).where(eq(employees.id, sale.employeeId)).limit(1) : [];
      const emp = empArr[0] || null;

      html = buildReceiptHtml(sale, itemsRaw, store, emp);
      docNumber = sale.isTaxInvoice ? (sale.taxInvoiceNumber || sale.billNumber) : sale.billNumber;
      title = sale.isTaxInvoice ? "ใบกำกับภาษี" : "ใบเสร็จรับเงิน";

      const payLabel = sale.paymentMethod === "cash" ? "เงินสด" : sale.paymentMethod === "transfer" ? "โอนเงิน" : "เครดิต";
      lineDocData = {
        title,
        docNumber,
        storeName: (store as any).storeName || "ร้านแบตเตอรี่",
        storeTaxId: (store as any).taxId || undefined,
        storeLogo: (store as any).storeLogo || undefined,
        date: fmtDate(new Date(sale.createdAt)),
        buyerName: sale.buyerName || undefined,
        buyerPhone: sale.buyerPhone || undefined,
        buyerAddress: sale.buyerAddress || undefined,
        buyerTaxId: sale.buyerTaxId || undefined,
        employeeName: emp?.name || undefined,
        items: itemsRaw.map((si: any) => {
          const p = si.products;
          const item = si.sale_items;
          return {
            name: [p?.brand, p?.name, p?.model].filter(Boolean).join(" / ") || "สินค้า",
            qty: item.quantity,
            unitPrice: fmt(parseFloat(item.unitPrice)),
            total: fmt(parseFloat(item.total)),
          };
        }),
        serviceFee: fmt(parseFloat(sale.serviceFee || "0")),
        serviceDesc: sale.serviceDescription || "ค่าบริการ",
        subtotal: fmt(parseFloat(sale.subtotal || "0") + parseFloat(sale.serviceFee || "0")),
        discount: fmt(parseFloat(sale.discount || "0")),
        taxLabel: sale.isTaxInvoice ? `VAT ${sale.taxRate}%` : undefined,
        taxAmount: sale.isTaxInvoice ? fmt(parseFloat(sale.taxAmount || "0")) : undefined,
        total: fmt(parseFloat(sale.total)),
        paymentMethod: payLabel,
        note: sale.note || undefined,
      };

      // Build data for server-side PDF generation
      receiptPdfData = {
        billNumber: sale.billNumber,
        taxInvoiceNumber: sale.taxInvoiceNumber || undefined,
        isTaxInvoice: !!sale.isTaxInvoice,
        createdAt: new Date(sale.createdAt),
        employeeName: emp?.name || undefined,
        buyerName: sale.buyerName || undefined,
        buyerPhone: sale.buyerPhone || undefined,
        buyerAddress: sale.buyerAddress || undefined,
        buyerTaxId: sale.buyerTaxId || undefined,
        licensePlate: (sale as any).licensePlate || undefined,
        items: itemsRaw.map((si: any) => {
          const p = si.products;
          const item = si.sale_items;
          return {
            name: [p?.brand, p?.name, p?.model].filter(Boolean).join(" / ") || "สินค้า",
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
          };
        }),
        serviceFee: sale.serviceFee || undefined,
        serviceDescription: sale.serviceDescription || undefined,
        subtotal: sale.subtotal || "0",
        discount: sale.discount || undefined,
        vatType: sale.vatType || undefined,
        taxRate: sale.taxRate || undefined,
        taxAmount: sale.taxAmount || undefined,
        total: sale.total,
        paymentMethod: sale.paymentMethod || "cash",
        note: sale.note || undefined,
        storeName: (store as any).storeName || "ร้านแบตเตอรี่",
        branchName: (store as any).branchName || undefined,
        storeAddress: (store as any).address || undefined,
        storePhone: (store as any).phone || undefined,
        storeTaxId: (store as any).taxId || undefined,
        storeLogo: (store as any).storeLogo || undefined,
      };

    } else if (type === "quotation") {
      const quotArr = await db.select().from(quotations).where(eq(quotations.id, id)).limit(1);
      if (!quotArr[0]) return NextResponse.json({ error: "ไม่พบใบเสนอราคา" }, { status: 404 });
      const quot = quotArr[0];

      const itemsRaw = await db.select().from(quotationItems)
        .leftJoin(products, eq(quotationItems.productId, products.id))
        .where(eq(quotationItems.quotationId, id));

      html = buildQuotationHtml(quot, itemsRaw, store);
      docNumber = quot.quotationNumber;
      title = "ใบเสนอราคา";

      const validDate = new Date(quot.createdAt);
      validDate.setDate(validDate.getDate() + (quot.validDays || 30));

      lineDocData = {
        title,
        docNumber,
        storeName: (store as any).storeName || "ร้านแบตเตอรี่",
        storeTaxId: (store as any).taxId || undefined,
        storeLogo: (store as any).storeLogo || undefined,
        date: fmtDate(new Date(quot.createdAt)),
        buyerName: quot.buyerName || undefined,
        buyerPhone: quot.buyerPhone || undefined,
        buyerAddress: quot.buyerAddress || undefined,
        buyerTaxId: quot.buyerTaxId || undefined,
        items: itemsRaw.map((qi: any, idx: number) => {
          const p = qi.products;
          const item = qi.quotation_items;
          return {
            name: item.description || [p?.brand, p?.name, p?.model].filter(Boolean).join(" / ") || "สินค้า",
            qty: item.quantity,
            unitPrice: fmt(parseFloat(item.unitPrice)),
            total: fmt(parseFloat(item.total)),
          };
        }),
        serviceFee: fmt(parseFloat(quot.serviceFee || "0")),
        serviceDesc: quot.serviceDescription || "ค่าบริการ",
        subtotal: fmt(parseFloat(quot.subtotal || "0")),
        discount: fmt(parseFloat(quot.discount || "0")),
        taxLabel: quot.includeVat ? `VAT ${quot.taxRate}%` : undefined,
        taxAmount: quot.includeVat ? fmt(parseFloat(quot.taxAmount || "0")) : undefined,
        total: fmt(parseFloat(quot.total)),
        note: quot.note || undefined,
        validUntil: fmtDate(validDate),
      };
    } else {
      return NextResponse.json({ error: "ประเภทเอกสารไม่ถูกต้อง" }, { status: 400 });
    }

    // Return HTML for client-side PDF generation (using browser print-to-PDF)
    if (action === "generate") {
      return NextResponse.json({ html, docNumber, title });
    }

    // Return real PDF binary for direct download
    if (action === "download_pdf" && type === "receipt" && receiptPdfData) {
      const pdfBuffer = generateReceiptPdf(receiptPdfData);
      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${docNumber}.pdf"`,
        },
      });
    }

    // For LINE send: generate PDF + upload to Cloudinary + send Flex Message via LINE
    if (action === "send_line") {
      const channelToken = (store as any).lineChannelToken || process.env.LINE_CHANNEL_TOKEN;
      const userId = (store as any).lineUserId || process.env.LINE_USER_ID;
      if (!channelToken) return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า LINE Channel Token" }, { status: 400 });
      if (!userId) return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า LINE User ID" }, { status: 400 });

      // Build a signed public URL to our own API for PDF download
      const secret = process.env.CLOUDINARY_API_SECRET || process.env.NEXTAUTH_SECRET || "fallback-secret";
      const token = crypto.createHmac("sha256", secret).update(`${type}:${id}`).digest("hex").slice(0, 32);
      // Use public production URL (never preview/protected URLs)
      const origin = getPublicBaseUrl();
      const pdfUrl = `${origin}/api/pdf?type=${type}&id=${id}&token=${token}`;
      // Also build image fallback URL for mobile users
      const imageUrl = `${origin}/api/receipt-image?type=${type}&id=${id}&token=${token}`;
      console.log("[PDF API] Generated pdfUrl:", pdfUrl);
      console.log("[PDF API] Generated imageUrl (fallback):", imageUrl);

      // Send full document data via LINE Flex Message
      const { sendLinePdfLink } = await import("@/lib/line-notify");
      const result = await sendLinePdfLink(channelToken, userId, {
        ...lineDocData,
        pdfUrl,
        imageUrl,
      });

      if (result.success) {
        return NextResponse.json({ success: true, message: `ส่ง${title}ผ่าน LINE สำเร็จ`, pdfUrl });
      } else {
        return NextResponse.json({ error: result.error || "ส่ง LINE ไม่สำเร็จ" }, { status: 500 });
      }
    }

    return NextResponse.json({ error: "action ไม่ถูกต้อง" }, { status: 400 });
  } catch (err: any) {
    console.error("PDF API error:", err);
    return NextResponse.json({ error: err?.message || "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

// GET /api/pdf?type=receipt&id=123&token=abc — Public PDF download (signed token OR valid session)
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get("type");
    const idStr = url.searchParams.get("id");
    const id = idStr ? parseInt(idStr) : null;
    const token = url.searchParams.get("token");
    const userAgent = request.headers.get("user-agent");
    const isMobile = isMobileOrInAppBrowser(userAgent);

    // Safe logging (no full token)
    const tokenPreview = token ? `${token.slice(0, 6)}...` : "none";
    console.log(`[PDF GET] type=${type} id=${id} token=${tokenPreview} mobile=${isMobile} ua=${(userAgent || "").slice(0, 60)}`);

    if (!type || !id) {
      console.error("[PDF GET] Missing params - type:", type, "id:", id);
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // Auth: accept either a valid signed token OR a valid session cookie
    let authorized = false;

    // 1) Check signed token (for shared/mobile links)
    if (token) {
      const secret = process.env.CLOUDINARY_API_SECRET || process.env.NEXTAUTH_SECRET || "fallback-secret";
      const expected = crypto.createHmac("sha256", secret).update(`${type}:${id}`).digest("hex").slice(0, 32);
      if (token === expected) {
        authorized = true;
        console.log(`[PDF GET] Token valid for ${type}:${id}`);
      } else {
        console.warn(`[PDF GET] Token mismatch for ${type}:${id}`);
      }
    }

    // 2) Check session cookie (for logged-in users)
    if (!authorized) {
      const sessionCookie = request.cookies.get("arinyadapos_session");
      if (sessionCookie?.value) {
        try {
          const session = JSON.parse(sessionCookie.value);
          if (session?.id && session?.role) {
            authorized = true;
            console.log(`[PDF GET] Session valid, user=${session.id}`);
          }
        } catch {
          // invalid session cookie
        }
      }
    }

    if (!authorized) {
      console.warn(`[PDF GET] Unauthorized request for ${type}:${id}`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settingsArr = await db.select().from(storeSettings).limit(1);
    const store = settingsArr[0] || {};

    if (type === "receipt") {
      const saleArr = await db.select().from(sales).where(eq(sales.id, id)).limit(1);
      if (!saleArr[0]) return NextResponse.json({ error: "ไม่พบบิลขาย" }, { status: 404 });
      const sale = saleArr[0];

      const itemsRaw = await db.select().from(saleItems)
        .innerJoin(products, eq(saleItems.productId, products.id))
        .where(eq(saleItems.saleId, id));

      const empArr = sale.employeeId ? await db.select().from(employees).where(eq(employees.id, sale.employeeId)).limit(1) : [];
      const emp = empArr[0] || null;

      const docNumber = sale.isTaxInvoice ? (sale.taxInvoiceNumber || sale.billNumber) : sale.billNumber;

      const receiptPdfData: ReceiptData = {
        billNumber: sale.billNumber,
        taxInvoiceNumber: sale.taxInvoiceNumber || undefined,
        isTaxInvoice: !!sale.isTaxInvoice,
        createdAt: new Date(sale.createdAt),
        employeeName: emp?.name || undefined,
        buyerName: sale.buyerName || undefined,
        buyerPhone: sale.buyerPhone || undefined,
        buyerAddress: sale.buyerAddress || undefined,
        buyerTaxId: sale.buyerTaxId || undefined,
        licensePlate: (sale as any).licensePlate || undefined,
        items: itemsRaw.map((si: any) => {
          const p = si.products;
          const item = si.sale_items;
          return {
            name: [p?.brand, p?.name, p?.model].filter(Boolean).join(" / ") || "สินค้า",
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
          };
        }),
        serviceFee: sale.serviceFee || undefined,
        serviceDescription: sale.serviceDescription || undefined,
        subtotal: sale.subtotal || "0",
        discount: sale.discount || undefined,
        vatType: sale.vatType || undefined,
        taxRate: sale.taxRate || undefined,
        taxAmount: sale.taxAmount || undefined,
        total: sale.total,
        paymentMethod: sale.paymentMethod || "cash",
        note: sale.note || undefined,
        storeName: (store as any).storeName || "ร้านแบตเตอรี่",
        branchName: (store as any).branchName || undefined,
        storeAddress: (store as any).address || undefined,
        storePhone: (store as any).phone || undefined,
        storeTaxId: (store as any).taxId || undefined,
        storeLogo: (store as any).storeLogo || undefined,
      };

      const pdfBuffer = generateReceiptPdf(receiptPdfData);
      const filename = docNumber || "receipt";

      // Build image fallback URL (same token, different route) — use public production URL
      const origin = getPublicBaseUrl();
      const imgSecret = process.env.CLOUDINARY_API_SECRET || process.env.NEXTAUTH_SECRET || "fallback-secret";
      const imgToken = crypto.createHmac("sha256", imgSecret).update(`receipt:${id}`).digest("hex").slice(0, 32);
      const imageUrl = `${origin}/api/receipt-image?type=receipt&id=${id}&token=${imgToken}`;

      // Mobile / In-App browser → serve HTML wrapper with embedded PDF + image fallback
      if (isMobile) {
        const pdfBase64 = pdfBuffer.toString("base64");
        const html = buildPdfViewerHtml(pdfBase64, filename, imageUrl);
        console.log(`[PDF GET] Serving mobile HTML wrapper for receipt ${docNumber} (${pdfBuffer.length} bytes)`);
        return new NextResponse(html, {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "public, max-age=86400",
          },
        });
      }

      // Desktop → serve PDF inline
      console.log(`[PDF GET] Serving inline PDF for receipt ${docNumber} (${pdfBuffer.length} bytes)`);
      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${filename}.pdf"`,
          "Content-Length": pdfBuffer.length.toString(),
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    // Quotation: generate PDF and serve (same mobile/desktop logic)
    if (type === "quotation") {
      const quotArr = await db.select().from(quotations).where(eq(quotations.id, id)).limit(1);
      if (!quotArr[0]) return NextResponse.json({ error: "ไม่พบใบเสนอราคา" }, { status: 404 });
      const quot = quotArr[0];
      const itemsRaw = await db.select().from(quotationItems)
        .leftJoin(products, eq(quotationItems.productId, products.id))
        .where(eq(quotationItems.quotationId, id));

      // Build HTML for quotation (reuse existing builder)
      const html = buildQuotationHtml(quot, itemsRaw, store);
      const docNumber = quot.quotationNumber || "quotation";

      // For mobile: serve a self-contained HTML page (quotation HTML is already styled)
      if (isMobile) {
        console.log(`[PDF GET] Serving mobile HTML for quotation ${docNumber}`);
        return new NextResponse(html, {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "public, max-age=86400",
          },
        });
      }

      // Desktop: also serve HTML (quotation uses HTML rendering, not PDF binary)
      console.log(`[PDF GET] Serving HTML for quotation ${docNumber}`);
      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    return NextResponse.json({ error: "ประเภทเอกสารไม่ถูกต้อง" }, { status: 400 });
  } catch (err: any) {
    console.error("[PDF GET] Error:", err?.message || err);
    return NextResponse.json({ error: err?.message || "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

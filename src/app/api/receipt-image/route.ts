import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/db";
import { sales, saleItems, products, employees, storeSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getPublicBaseUrl } from "@/lib/public-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fmt(n: number) {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

// POST /api/receipt-image — Generate a signed URL for sharing the receipt image
export async function POST(request: NextRequest) {
  try {
    // Require session
    const sessionCookie = request.cookies.get("arinyadapos_session");
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try { JSON.parse(sessionCookie.value); } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { saleId } = await request.json();
    if (!saleId) return NextResponse.json({ error: "Missing saleId" }, { status: 400 });

    const secret = process.env.CLOUDINARY_API_SECRET || process.env.NEXTAUTH_SECRET || "fallback-secret";
    const token = crypto.createHmac("sha256", secret).update(`receipt:${saleId}`).digest("hex").slice(0, 32);

    const origin = getPublicBaseUrl();

    const url = `${origin}/api/receipt-image?type=receipt&id=${saleId}&token=${token}`;
    return NextResponse.json({ success: true, url });
  } catch (err: any) {
    console.error("[RECEIPT-IMG POST] Error:", err?.message || err);
    return NextResponse.json({ error: err?.message || "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

// GET /api/receipt-image?type=receipt&id=123&token=abc — Mobile-friendly receipt image page
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get("type") || "receipt";
    const idStr = url.searchParams.get("id");
    const id = idStr ? parseInt(idStr) : null;
    const token = url.searchParams.get("token");

    const tokenPreview = token ? `${token.slice(0, 6)}...` : "none";
    console.log(`[RECEIPT-IMG] type=${type} id=${id} token=${tokenPreview}`);

    if (!type || !id) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // Auth: token OR session
    let authorized = false;

    if (token) {
      const secret = process.env.CLOUDINARY_API_SECRET || process.env.NEXTAUTH_SECRET || "fallback-secret";
      const expected = crypto.createHmac("sha256", secret).update(`${type}:${id}`).digest("hex").slice(0, 32);
      if (token === expected) {
        authorized = true;
      }
    }

    if (!authorized) {
      const sessionCookie = request.cookies.get("arinyadapos_session");
      if (sessionCookie?.value) {
        try {
          const session = JSON.parse(sessionCookie.value);
          if (session?.id && session?.role) authorized = true;
        } catch {}
      }
    }

    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch store settings
    const settingsArr = await db.select().from(storeSettings).limit(1);
    const store = settingsArr[0] || {};

    if (type === "receipt") {
      // Fetch sale
      const saleArr = await db.select().from(sales).where(eq(sales.id, id)).limit(1);
      if (!saleArr[0]) return NextResponse.json({ error: "ไม่พบบิล" }, { status: 404 });
      const sale = saleArr[0];

      // Fetch items
      const items = await db.select({
        productName: products.name,
        brand: products.brand,
        model: products.model,
        quantity: saleItems.quantity,
        unitPrice: saleItems.unitPrice,
        total: saleItems.total,
      }).from(saleItems)
        .innerJoin(products, eq(saleItems.productId, products.id))
        .where(eq(saleItems.saleId, id));

      // Fetch employee
      let empName = "";
      if (sale.employeeId) {
        const empArr = await db.select({ name: employees.name }).from(employees).where(eq(employees.id, sale.employeeId)).limit(1);
        if (empArr[0]) empName = empArr[0].name;
      }

      const createdAt = new Date(sale.createdAt);
      const docTitle = sale.isTaxInvoice ? "ใบกำกับภาษี / TAX INVOICE" : "ใบเสร็จรับเงิน / RECEIPT";
      const billNum = sale.isTaxInvoice ? (sale.taxInvoiceNumber || sale.billNumber) : sale.billNumber;
      const payLabel = sale.paymentMethod === "cash" ? "เงินสด" : sale.paymentMethod === "transfer" ? "โอนเงิน" : "เครดิต";
      const logoUrl = store.storeLogo || "";

      // Build items HTML
      let idx = 0;
      let itemsHtml = "";
      for (const item of items) {
        idx++;
        const nameDisplay = [item.brand, item.productName, item.model].filter(Boolean).join(" / ") || "สินค้า";
        const bg = idx % 2 === 0 ? ' style="background:#fafafa"' : '';
        itemsHtml += `<tr${bg}><td class="tc">${idx}</td><td>${nameDisplay}</td><td class="tc">${item.quantity}</td><td class="tr">${fmt(parseFloat(item.unitPrice))}</td><td class="tr">${fmt(parseFloat(item.total))}</td></tr>`;
      }
      if (parseFloat(sale.serviceFee || "0") > 0) {
        idx++;
        itemsHtml += `<tr class="svc"><td class="tc">${idx}</td><td>${sale.serviceDescription || "ค่าบริการ"}</td><td class="tc">1</td><td class="tr">${fmt(parseFloat(sale.serviceFee))}</td><td class="tr">${fmt(parseFloat(sale.serviceFee))}</td></tr>`;
      }

      // Buyer info
      const bName = sale.buyerName || "";
      const bPhone = sale.buyerPhone || "";
      const bAddr = sale.buyerAddress || "";
      const bTaxId = sale.buyerTaxId || "";
      const bPlate = (sale as any).licensePlate || "";

      const html = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0, user-scalable=yes">
<title>${billNum} - ${store.storeName || "ร้านแบตเตอรี่"}</title>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Sarabun',sans-serif;background:#e8e8e8;min-height:100vh;display:flex;flex-direction:column;align-items:center}

/* Top toolbar — sticky, outside receipt card */
.toolbar{
  position:sticky;top:0;z-index:100;width:100%;
  background:linear-gradient(135deg,#2563eb,#2563eb);
  color:#fff;padding:10px 14px;
  display:flex;align-items:center;justify-content:space-between;
  box-shadow:0 2px 8px rgba(0,0,0,0.15);
  flex-wrap:wrap;gap:8px;
}
.toolbar-title{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:50%}
.toolbar-actions{display:flex;gap:6px;flex-shrink:0}
.btn-toolbar{
  display:inline-flex;align-items:center;gap:5px;
  background:#fff;color:#2563eb;border:none;border-radius:8px;
  padding:7px 12px;font-size:12px;font-weight:700;cursor:pointer;
  white-space:nowrap;transition:all .15s;
}
.btn-toolbar:active{background:#bfdbfe;transform:scale(0.96)}
.btn-toolbar.share{background:#22c55e;color:#fff}
.btn-toolbar.share:active{background:#16a34a}

/* Receipt card — document-like, fixed width like A4 */
.receipt-card{
  width:100%;max-width:700px;background:#fff;
  margin:16px auto;padding:10mm 12mm;
  box-shadow:0 2px 16px rgba(0,0,0,0.12);
  font-size:11px;color:#1a1a1a;line-height:1.4;
}

/* Header — matches desktop buildReceiptHtml exactly */
.header-bar{
  background:linear-gradient(135deg,#2563eb 0%,#2563eb 100%);
  color:#fff;padding:14px 18px;border-radius:8px;margin-bottom:12px;
  display:flex;align-items:center;gap:14px;
}
.logo-box{
  width:72px;height:72px;background:#fff;border-radius:10px;
  display:flex;align-items:center;justify-content:center;
  flex-shrink:0;overflow:hidden;padding:4px;
  box-shadow:0 1px 3px rgba(0,0,0,0.1);
}
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
.buyer-section{
  border:1px solid #e0e0e0;border-radius:6px;padding:10px 12px;
  margin-bottom:10px;font-size:10.5px;background:#fefefe;
}
.buyer-title{font-weight:700;font-size:11px;color:#2563eb;margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid #f0f0f0}
.buyer-grid{display:flex;flex-wrap:wrap;gap:4px 20px}
.buyer-item{min-width:45%}
.buyer-item .bl{color:#888;font-size:9.5px}

/* Items Table */
table.items{width:100%;border-collapse:collapse;margin-bottom:10px}
table.items th{
  background:#eff6ff;border-top:2px solid #2563eb;border-bottom:2px solid #2563eb;
  padding:6px 5px;font-weight:700;font-size:9.5px;text-transform:uppercase;
  color:#92400e;letter-spacing:0.3px;
}
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
.pay-section{
  display:flex;justify-content:space-between;align-items:center;
  background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;
  padding:8px 12px;margin-bottom:10px;font-size:11px;
}
.pay-method{font-weight:700;color:#2563eb}

/* Note */
.note-section{
  background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;
  padding:8px 12px;font-size:10px;color:#555;margin-bottom:10px;
}
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

/* Watermark */
.watermark{text-align:center;margin-top:8px;font-size:8px;color:#ccc;letter-spacing:0.5px}

/* Loading overlay */
.loading-overlay{
  position:fixed;inset:0;z-index:200;
  background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;
  flex-direction:column;gap:12px;color:#fff;font-size:14px;font-weight:600;
}
.spinner{
  width:36px;height:36px;border:3px solid rgba(255,255,255,0.3);
  border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;
}
@keyframes spin{to{transform:rotate(360deg)}}

/* Toast */
.toast{
  position:fixed;bottom:20px;left:50%;transform:translateX(-50%);
  z-index:300;padding:10px 20px;border-radius:10px;font-size:13px;font-weight:600;
  color:#fff;box-shadow:0 4px 12px rgba(0,0,0,0.2);
  animation:toastIn .3s ease-out;
}
.toast.success{background:#22c55e}
.toast.error{background:#ef4444}
@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}

/* Hide toolbar when capturing */
.capturing .toolbar{display:none}
.capturing body{background:#fff}
.capturing .receipt-card{margin:0;box-shadow:none;max-width:100%}

/* Responsive: on very small screens, scale down gracefully */
@media (max-width:480px) {
  .receipt-card{padding:8mm 8mm;font-size:10px}
  .header-bar{padding:10px 12px;gap:10px}
  .logo-box{width:56px;height:56px}
  .logo-placeholder{width:36px;height:36px}
  .doc-title{font-size:14px}
  .store-name{font-size:11px}
  .store-detail{font-size:8.5px}
  .info-section{flex-direction:column;gap:6px}
  .info-left,.info-right{padding:8px 10px;font-size:9.5px}
  .buyer-section{padding:8px 10px;font-size:9.5px}
  .buyer-title{font-size:10px}
  .buyer-item .bl{font-size:8.5px}
  table.items th{padding:4px 3px;font-size:8.5px}
  table.items td{padding:4px;font-size:9.5px}
  .summary-box{width:100%;max-width:100%}
  .s-row{font-size:10px}
  .s-row.total{font-size:13px}
  .pay-section{padding:6px 10px;font-size:10px}
  .note-section{padding:6px 10px;font-size:9px}
  .sig-section{margin-top:16px;padding-top:8px}
  .sig-block{width:120px}
  .sig-line{height:30px}
  .sig-label{font-size:9px}
  .sig-sub{font-size:7.5px}
  .footer-thanks{font-size:11px}
  .footer-sub{font-size:8px}
}
</style>
</head>
<body>

<div class="toolbar" id="toolbar">
  <span class="toolbar-title">${billNum}</span>
  <div class="toolbar-actions">
    <button class="btn-toolbar share" id="btnShare" onclick="shareAsImage()">
      📤 แชร์เป็นรูป
    </button>
    <button class="btn-toolbar" id="btnDownload" onclick="downloadAsImage()">
      💾 บันทึกรูป
    </button>
  </div>
</div>

<div class="receipt-card" id="receiptCard">
  <div class="header-bar">
    <div class="logo-box">
      ${logoUrl ? `<img src="${logoUrl}" alt="logo" crossorigin="anonymous">` : `<div class="logo-placeholder"></div>`}
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
      <div class="info-row"><span class="info-label">เลขที่${sale.isTaxInvoice ? "ใบกำกับภาษี" : "บิล"}</span><span class="info-val">${billNum}</span></div>
      ${sale.isTaxInvoice && sale.billNumber !== sale.taxInvoiceNumber ? `<div class="info-row"><span class="info-label">เลขที่บิลอ้างอิง</span><span class="info-val">${sale.billNumber}</span></div>` : ""}
      ${empName ? `<div class="info-row"><span class="info-label">พนักงานขาย</span><span class="info-val">${empName}</span></div>` : ""}
    </div>
    <div class="info-right">
      <div class="info-row"><span class="info-label">วันที่</span><span class="info-val">${fmtDate(createdAt)}</span></div>
      <div class="info-row"><span class="info-label">เวลา</span><span class="info-val">${fmtTime(createdAt)}</span></div>
    </div>
  </div>

  ${bName || bTaxId || bAddr || bPlate ? `<div class="buyer-section">
    <div class="buyer-title">ข้อมูลผู้ซื้อ</div>
    <div class="buyer-grid">
      ${bName ? `<div class="buyer-item"><span class="bl">ชื่อ:</span> ${bName}</div>` : ""}
      ${bPhone ? `<div class="buyer-item"><span class="bl">โทร:</span> ${bPhone}</div>` : ""}
      ${bAddr ? `<div class="buyer-item" style="min-width:100%"><span class="bl">ที่อยู่:</span> ${bAddr}</div>` : ""}
      ${bTaxId ? `<div class="buyer-item"><span class="bl">เลขผู้เสียภาษี:</span> ${bTaxId}</div>` : ""}
      ${bPlate ? `<div class="buyer-item"><span class="bl">ทะเบียนรถ:</span> ${bPlate}</div>` : ""}
    </div>
  </div>` : ""}

  <table class="items">
    <thead><tr><th class="tc" style="width:28px">#</th><th style="text-align:left">รายการสินค้า</th><th class="tc" style="width:40px">จำนวน</th><th class="tr" style="width:70px">ราคา/หน่วย</th><th class="tr" style="width:80px">จำนวนเงิน</th></tr></thead>
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

  <div class="watermark">📄 ${billNum} • ${fmtDate(createdAt)}</div>
</div>

<!-- html2canvas from CDN -->
<script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>

<script>
var loadingEl = null;

function showLoading(msg) {
  if (loadingEl) return;
  loadingEl = document.createElement('div');
  loadingEl.className = 'loading-overlay';
  loadingEl.innerHTML = '<div class="spinner"></div><span>' + (msg || 'กำลังสร้างรูป...') + '</span>';
  document.body.appendChild(loadingEl);
}

function hideLoading() {
  if (loadingEl) { loadingEl.remove(); loadingEl = null; }
}

function showToast(msg, type) {
  var t = document.createElement('div');
  t.className = 'toast ' + (type || 'success');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function() { t.remove(); }, 2500);
}

async function captureReceipt() {
  var card = document.getElementById('receiptCard');
  // Temporarily adjust for clean capture
  document.body.classList.add('capturing');
  card.style.margin = '0';
  card.style.borderRadius = '0';
  card.style.boxShadow = 'none';
  card.style.maxWidth = '100%';

  var canvas = await html2canvas(card, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    width: card.scrollWidth,
    height: card.scrollHeight,
  });

  // Restore
  card.style.margin = '';
  card.style.borderRadius = '';
  card.style.boxShadow = '';
  card.style.maxWidth = '';
  document.body.classList.remove('capturing');

  return canvas;
}

async function downloadAsImage() {
  try {
    showLoading('กำลังสร้างรูป...');
    var canvas = await captureReceipt();
    hideLoading();

    var link = document.createElement('a');
    link.download = '${billNum}.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('✅ บันทึกรูปเรียบร้อย!', 'success');
  } catch (e) {
    hideLoading();
    console.error('Download error:', e);
    showToast('❌ ไม่สามารถสร้างรูปได้', 'error');
  }
}

async function shareAsImage() {
  try {
    // Check if Web Share API is available (mobile browsers)
    if (navigator.share && navigator.canShare) {
      showLoading('กำลังเตรียมรูป...');
      var canvas = await captureReceipt();

      var blob = await new Promise(function(resolve) {
        canvas.toBlob(resolve, 'image/png');
      });
      hideLoading();

      var file = new File([blob], '${billNum}.png', { type: 'image/png' });

      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: '${docTitle} - ${billNum}',
          text: '${store.storeName || "ร้านแบตเตอรี่"} - ${billNum} ยอด ${fmt(parseFloat(sale.total))} บาท',
          files: [file],
        });
        showToast('✅ แชร์สำเร็จ!', 'success');
        return;
      }
    }

    // Fallback: download
    await downloadAsImage();
  } catch (e) {
    hideLoading();
    if (e.name === 'AbortError') {
      // User cancelled share — do nothing
      return;
    }
    console.error('Share error:', e);
    // Fallback to download
    await downloadAsImage();
  }
}
</script>

</body>
</html>`;

      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "private, no-cache",
        },
      });
    }

    return NextResponse.json({ error: "ประเภทเอกสารไม่ถูกต้อง" }, { status: 400 });
  } catch (err: any) {
    console.error("[RECEIPT-IMG] Error:", err?.message || err);
    return NextResponse.json({ error: err?.message || "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

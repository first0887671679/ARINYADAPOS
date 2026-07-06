// LINE Messaging API - Push Message
// ใช้แทน LINE Notify ที่ปิดให้บริการแล้ว (31 มี.ค. 2025)
export async function sendLineMessage(
  channelToken: string,
  userId: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${channelToken}`,
      },
      body: JSON.stringify({
        to: userId,
        messages: [{ type: "text", text: message }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      return { success: true };
    }

    const data = await res.json().catch(() => ({}));
    const detailMsg = data.details?.map((d: any) => d.message).join(", ") || "";
    const errorMsg = data.message || `HTTP ${res.status}`;
    const fullError = detailMsg ? `${errorMsg} (${detailMsg})` : errorMsg;
    console.error("LINE Messaging API failed:", { status: res.status, error: errorMsg, details: data.details, userId: userId?.substring(0, 10) + "..." });
    return { success: false, error: fullError };
  } catch (e: any) {
    console.error("LINE Messaging API error:", e);
    if (e.name === "AbortError") {
      return { success: false, error: "หมดเวลาเชื่อมต่อ (timeout)" };
    }
    if (e.cause?.code === "ENOTFOUND" || e.cause?.code === "EAI_AGAIN") {
      return { success: false, error: "ไม่สามารถเชื่อมต่ออินเทอร์เน็ต (DNS error)" };
    }
    if (e.cause?.code === "ECONNREFUSED") {
      return { success: false, error: "การเชื่อมต่อถูกปฏิเสธ" };
    }
    return { success: false, error: `Network error: ${e.message || "ไม่ทราบสาเหตุ"}` };
  }
}

// ส่ง Flex Message เอกสารเต็มรูปแบบผ่าน LINE
export interface LineDocItem {
  name: string;
  qty: number;
  unitPrice: string;
  total: string;
}
export interface LineDocData {
  title: string;
  docNumber: string;
  storeName: string;
  storeTaxId?: string;
  storeLogo?: string;
  date: string;
  buyerName?: string;
  buyerPhone?: string;
  buyerAddress?: string;
  buyerTaxId?: string;
  employeeName?: string;
  items: LineDocItem[];
  serviceFee?: string;
  serviceDesc?: string;
  subtotal: string;
  discount?: string;
  taxLabel?: string;
  taxAmount?: string;
  total: string;
  paymentMethod?: string;
  note?: string;
  validUntil?: string;
  pdfUrl: string;
  imageUrl?: string; // Fallback image-based receipt page for mobile
}

function fmtMoney(v: string) { return v; }

export async function sendLinePdfLink(
  channelToken: string,
  userId: string,
  doc: LineDocData
): Promise<{ success: boolean; error?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    // --- Build body contents ---
    const bodyContents: any[] = [];

    // ข้อมูลเอกสาร
    const infoRows: any[] = [
      { type: "box", layout: "horizontal", contents: [
        { type: "text", text: "เลขที่", size: "xs", color: "#888888", flex: 2 },
        { type: "text", text: doc.docNumber, size: "xs", color: "#333333", flex: 5, align: "end", weight: "bold" },
      ]},
      { type: "box", layout: "horizontal", contents: [
        { type: "text", text: "วันที่", size: "xs", color: "#888888", flex: 2 },
        { type: "text", text: doc.date, size: "xs", color: "#333333", flex: 5, align: "end" },
      ]},
    ];
    if (doc.buyerName) {
      infoRows.push({ type: "box", layout: "horizontal", contents: [
        { type: "text", text: "ลูกค้า", size: "xs", color: "#888888", flex: 2 },
        { type: "text", text: doc.buyerName, size: "xs", color: "#333333", flex: 5, align: "end", wrap: true },
      ]});
    }
    if (doc.buyerPhone) {
      infoRows.push({ type: "box", layout: "horizontal", contents: [
        { type: "text", text: "โทร", size: "xs", color: "#888888", flex: 2 },
        { type: "text", text: doc.buyerPhone, size: "xs", color: "#333333", flex: 5, align: "end" },
      ]});
    }
    if (doc.buyerTaxId) {
      infoRows.push({ type: "box", layout: "horizontal", contents: [
        { type: "text", text: "เลขผู้เสียภาษี", size: "xs", color: "#888888", flex: 3 },
        { type: "text", text: doc.buyerTaxId, size: "xs", color: "#333333", flex: 4, align: "end" },
      ]});
    }
    if (doc.employeeName) {
      infoRows.push({ type: "box", layout: "horizontal", contents: [
        { type: "text", text: "พนักงาน", size: "xs", color: "#888888", flex: 2 },
        { type: "text", text: doc.employeeName, size: "xs", color: "#333333", flex: 5, align: "end" },
      ]});
    }
    if (doc.validUntil) {
      infoRows.push({ type: "box", layout: "horizontal", contents: [
        { type: "text", text: "ใช้ได้ถึง", size: "xs", color: "#888888", flex: 2 },
        { type: "text", text: doc.validUntil, size: "xs", color: "#333333", flex: 5, align: "end" },
      ]});
    }
    bodyContents.push({ type: "box", layout: "vertical", spacing: "sm", contents: infoRows });

    // เส้นคั่น
    bodyContents.push({ type: "separator", margin: "lg" });

    // หัวตาราง
    bodyContents.push({ type: "box", layout: "horizontal", margin: "lg", contents: [
      { type: "text", text: "รายการ", size: "xs", color: "#888888", flex: 5, weight: "bold" },
      { type: "text", text: "จำนวน", size: "xs", color: "#888888", flex: 2, align: "center", weight: "bold" },
      { type: "text", text: "รวม", size: "xs", color: "#888888", flex: 3, align: "end", weight: "bold" },
    ]});

    // รายการสินค้า (จำกัด 10 รายการ เพื่อไม่เกิน limit ของ LINE)
    const displayItems = doc.items.slice(0, 10);
    displayItems.forEach((item) => {
      bodyContents.push({ type: "box", layout: "horizontal", margin: "sm", contents: [
        { type: "text", text: item.name, size: "xs", color: "#333333", flex: 5, wrap: true },
        { type: "text", text: `${item.qty}`, size: "xs", color: "#555555", flex: 2, align: "center" },
        { type: "text", text: `฿${item.total}`, size: "xs", color: "#333333", flex: 3, align: "end" },
      ]});
    });
    if (doc.items.length > 10) {
      bodyContents.push({ type: "text", text: `... และอีก ${doc.items.length - 10} รายการ`, size: "xxs", color: "#999999", margin: "sm" });
    }

    // ค่าบริการ
    if (doc.serviceFee && parseFloat(doc.serviceFee.replace(/,/g, "")) > 0) {
      bodyContents.push({ type: "box", layout: "horizontal", margin: "sm", contents: [
        { type: "text", text: doc.serviceDesc || "ค่าบริการ", size: "xs", color: "#b45309", flex: 7, wrap: true },
        { type: "text", text: `฿${doc.serviceFee}`, size: "xs", color: "#b45309", flex: 3, align: "end" },
      ]});
    }

    // เส้นคั่น
    bodyContents.push({ type: "separator", margin: "lg" });

    // สรุปยอด
    const summaryRows: any[] = [];
    summaryRows.push({ type: "box", layout: "horizontal", margin: "md", contents: [
      { type: "text", text: "รวมสินค้า/บริการ", size: "xs", color: "#555555", flex: 5 },
      { type: "text", text: `฿${doc.subtotal}`, size: "xs", color: "#333333", flex: 5, align: "end" },
    ]});
    if (doc.discount && parseFloat(doc.discount.replace(/,/g, "")) > 0) {
      summaryRows.push({ type: "box", layout: "horizontal", contents: [
        { type: "text", text: "ส่วนลด", size: "xs", color: "#dc2626", flex: 5 },
        { type: "text", text: `-฿${doc.discount}`, size: "xs", color: "#dc2626", flex: 5, align: "end" },
      ]});
    }
    if (doc.taxLabel && doc.taxAmount) {
      summaryRows.push({ type: "box", layout: "horizontal", contents: [
        { type: "text", text: doc.taxLabel, size: "xs", color: "#2563eb", flex: 5 },
        { type: "text", text: `฿${doc.taxAmount}`, size: "xs", color: "#2563eb", flex: 5, align: "end" },
      ]});
    }
    bodyContents.push({ type: "box", layout: "vertical", spacing: "sm", contents: summaryRows });

    // ยอดรวมสุทธิ
    bodyContents.push({ type: "separator", margin: "md" });
    bodyContents.push({ type: "box", layout: "horizontal", margin: "md", contents: [
      { type: "text", text: "ยอดรวมทั้งสิ้น", size: "md", color: "#333333", weight: "bold", flex: 5 },
      { type: "text", text: `฿${doc.total}`, size: "lg", color: "#2563eb", weight: "bold", flex: 5, align: "end" },
    ]});

    // วิธีชำระ
    if (doc.paymentMethod) {
      bodyContents.push({ type: "box", layout: "horizontal", margin: "sm", contents: [
        { type: "text", text: "ชำระโดย", size: "xs", color: "#888888", flex: 5 },
        { type: "text", text: doc.paymentMethod, size: "xs", color: "#333333", flex: 5, align: "end", weight: "bold" },
      ]});
    }

    // หมายเหตุ
    if (doc.note) {
      bodyContents.push({ type: "separator", margin: "md" });
      bodyContents.push({ type: "text", text: `📝 ${doc.note}`, size: "xxs", color: "#888888", margin: "md", wrap: true });
    }

    const flexMessage = {
      type: "flex",
      altText: `${doc.title} ${doc.docNumber} - ยอดรวม ฿${doc.total}`,
      contents: {
        type: "bubble",
        size: "mega",
        header: {
          type: "box",
          layout: "vertical",
          contents: [
            ...(doc.storeLogo ? [{
              type: "box",
              layout: "horizontal",
              contents: [
                { type: "image", url: doc.storeLogo, size: "xxs", aspectMode: "fit", flex: 0 },
                { type: "box", layout: "vertical", flex: 4, contents: [
                  { type: "text", text: doc.title, weight: "bold", size: "lg", color: "#2563eb" },
                  { type: "text", text: doc.storeName, size: "sm", color: "#666666", margin: "xs" },
                ]},
              ],
              spacing: "md",
              alignItems: "center",
            }] : [
              { type: "text", text: doc.title, weight: "bold", size: "xl", color: "#2563eb" },
              { type: "text", text: doc.storeName, size: "sm", color: "#666666", margin: "sm" },
            ]),
            ...(doc.storeTaxId ? [{ type: "text", text: `เลขผู้เสียภาษี: ${doc.storeTaxId}`, size: "xxs", color: "#999999", margin: "xs" }] : []),
          ],
          paddingAll: "16px",
          backgroundColor: "#eff6ff",
        },
        body: {
          type: "box",
          layout: "vertical",
          contents: bodyContents,
          paddingAll: "16px",
          spacing: "none",
        },
        footer: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "button",
              action: { type: "uri", label: "📄 ดาวน์โหลด PDF", uri: doc.pdfUrl },
              style: "primary",
              color: "#2563eb",
              height: "sm",
            },
            ...(doc.imageUrl ? [{
              type: "button",
              action: { type: "uri", label: "📤 ดูเป็นรูปภาพ (แชร์ง่าย)", uri: doc.imageUrl },
              style: "secondary",
              color: "#22c55e",
              height: "sm",
            }] : []),
          ],
          paddingAll: "12px",
        },
      },
    };

    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${channelToken}`,
      },
      body: JSON.stringify({
        to: userId,
        messages: [flexMessage],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) return { success: true };
    const data = await res.json().catch(() => ({}));
    console.error("[LINE] Flex send failed:", data);
    return { success: false, error: data.message || `HTTP ${res.status}` };
  } catch (e: any) {
    if (e.name === "AbortError") return { success: false, error: "หมดเวลาเชื่อมต่อ" };
    return { success: false, error: `Network error: ${e.message}` };
  }
}

// Backward-compatible wrapper (อ่าน token + userId จาก env ถ้าไม่ได้ส่งมา)
export async function sendLineNotify(token: string, message: string): Promise<{ success: boolean; error?: string }> {
  // token ตอนนี้คือ channelToken, ต้องมี userId ด้วย
  const userId = process.env.LINE_USER_ID || "";
  if (!userId) {
    return { success: false, error: "ยังไม่ได้ตั้งค่า LINE User ID" };
  }
  return sendLineMessage(token, userId, message);
}

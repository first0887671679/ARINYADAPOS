// ThaiBulkSMS API Integration
// Docs: https://developer.thaibulksms.com/reference/post_sms
// Auth: Basic Auth with api-key (username) and api-secret (password)

const THAIBULKSMS_API_URL = "https://api-v2.thaibulksms.com/sms";

interface SendSmsResult {
  success: boolean;
  error?: string;
  messageId?: string;
  credit?: number;
}

/**
 * ฟังก์ชันส่ง SMS ผ่าน ThaiBulkSMS API
 * config.apiKey และ config.apiSecret ต้องส่งมาจาก server action (actions.ts)
 */
export async function sendSmsThaiBulk(
  phone: string, 
  message: string, 
  sender?: string,
  config?: { apiKey?: string; apiSecret?: string }
): Promise<SendSmsResult> {
  const apiKey = (config?.apiKey || "").trim();
  const apiSecret = (config?.apiSecret || "").trim();

  if (!apiKey || !apiSecret) {
    const missing = [];
    if (!apiKey) missing.push("SMS_API_KEY");
    if (!apiSecret) missing.push("SMS_API_SECRET");
    return { 
      success: false, 
      error: `ไม่พบ ${missing.join(", ")} ในระบบ กรุณาตรวจสอบไฟล์ .env หรือรีสตาร์ท Server` 
    };
  }

  // แปลงเบอร์ให้เป็นรูปแบบ 66xxxxxxxxx
  const msisdn = formatPhoneNumber(phone);
  if (!msisdn) {
    return { success: false, error: "เบอร์โทรไม่ถูกต้อง" };
  }

  const senderName = sender || "";

  try {
    // Basic Auth: base64(api-key:api-secret)
    const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

    const body = new URLSearchParams({
      msisdn,
      message,
    });
    // sender เป็น optional - ถ้ามีลงทะเบียนแล้วจึงส่ง
    if (senderName) {
      body.set("sender", senderName);
    }

    console.log(`[ThaiBulkSMS] Sending SMS to ${msisdn}, sender=${senderName}, msgLen=${message.length}`);

    const response = await fetch(THAIBULKSMS_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const responseText = await response.text();
    console.log(`[ThaiBulkSMS] Response ${response.status}: ${responseText}`);

    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch {
      return { success: false, error: `ThaiBulkSMS ตอบกลับผิดรูปแบบ (HTTP ${response.status})` };
    }

    // ThaiBulkSMS v2 success: status code 200 + data object
    if (response.ok && (data.status === "success" || data.data)) {
      console.log(`[ThaiBulkSMS] ส่ง SMS สำเร็จ → ${msisdn}`);
      return {
        success: true,
        messageId: data.data?.id || undefined,
        credit: data.data?.credit_used || undefined,
      };
    } else {
      // Error cases - ensure we get a readable string
      console.error(`[ThaiBulkSMS] ส่ง SMS ล้มเหลว (${response.status}): ${responseText}`);
      
      let errorMsg = "";
      if (data.error && typeof data.error === "object") errorMsg = data.error.description || data.error.name || JSON.stringify(data.error);
      else if (typeof data.detail === "string") errorMsg = data.detail;
      else if (typeof data.message === "string") errorMsg = data.message;
      else if (typeof data.error === "string") errorMsg = data.error;
      else if (data.errors && Array.isArray(data.errors)) errorMsg = data.errors.map((e: any) => typeof e === "string" ? e : e.message || e.detail || JSON.stringify(e)).join(", ");
      else errorMsg = responseText.substring(0, 200);
      
      return { success: false, error: errorMsg || `HTTP ${response.status}` };
    }
  } catch (err: any) {
    console.error("[ThaiBulkSMS] Network error:", err.message);
    return { success: false, error: `ไม่สามารถเชื่อมต่อ ThaiBulkSMS: ${err.message}` };
  }
}

/**
 * แปลงเบอร์โทรไทยให้เป็นรูปแบบ 66xxxxxxxxx
 * รับได้: 0812345678, 66812345678, +66812345678
 */
function formatPhoneNumber(phone: string): string | null {
  // ลบช่องว่าง, ขีด, จุด
  let cleaned = phone.replace(/[\s\-\.()]/g, "");

  // +66 → 66
  if (cleaned.startsWith("+66")) {
    cleaned = cleaned.substring(1);
  }

  // 0xx → 66xx
  if (cleaned.startsWith("0") && cleaned.length === 10) {
    cleaned = "66" + cleaned.substring(1);
  }

  // ตรวจสอบว่าเป็น 66 + 9 หลัก
  if (cleaned.startsWith("66") && cleaned.length === 11) {
    return cleaned;
  }

  return null;
}

/**
 * เช็คเครดิตคงเหลือ
 */
export async function checkCreditThaiBulk(config?: { apiKey?: string; apiSecret?: string }): Promise<{ success: boolean; credit?: number; error?: string }> {
  const apiKey = (config?.apiKey || "").trim();
  const apiSecret = (config?.apiSecret || "").trim();

  if (!apiKey || !apiSecret) {
    return { success: false, error: "ยังไม่ได้ตั้งค่า API Key/Secret" };
  }

  try {
    const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

    const response = await fetch("https://api-v2.thaibulksms.com/credit", {
      method: "GET",
      headers: {
        "Authorization": `Basic ${credentials}`,
      },
    });

    const data = await response.json();

    if (response.ok) {
      return { success: true, credit: data.data?.credit || 0 };
    } else {
      return { success: false, error: data.message || "ไม่สามารถเช็คเครดิตได้" };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

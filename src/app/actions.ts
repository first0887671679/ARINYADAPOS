"use server";

import { db } from "@/db";
import { products, categories, customers, sales, saleItems, employees, storeSettings, quotations, quotationItems, smsTemplates, smsReminders, employeeSmsLogs, jobApplications } from "@/db/schema";
import { eq, desc, sql, and, gte, lte, or } from "drizzle-orm";
import { hashPassword, getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import * as fs from "fs";
import * as path from "path";

// อ่าน SMS config จากไฟล์ .env โดยตรง (ใช้ fs top-level import เพื่อไม่ให้ bundler strip ออก)
let _smsEnvCache: Record<string, string> | null = null;

function readEnvFile(): Record<string, string> {
  if (_smsEnvCache) return _smsEnvCache;
  _smsEnvCache = {};
  try {
    const envPath = path.join(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      for (const line of content.split("\n")) {
        const t = line.trim();
        if (!t || t.startsWith("#")) continue;
        const eqIdx = t.indexOf("=");
        if (eqIdx > 0) {
          const k = t.substring(0, eqIdx).trim();
          const v = t.substring(eqIdx + 1).trim().replace(/^["']|["']$/g, "").replace(/\r/g, "");
          _smsEnvCache[k] = v;
        }
      }
    }
  } catch (e) {
    console.error("[readEnvFile] Error:", e);
  }
  return _smsEnvCache;
}

function getSmsConfig(): { apiKey: string; apiSecret: string; sender: string } {
  // 1. ลอง process.env ก่อน
  let apiKey = (process.env.SMS_API_KEY || process.env.THAIBULKSMS_API_KEY || "").replace(/\r/g, "").trim();
  let apiSecret = (process.env.SMS_API_SECRET || process.env.THAIBULKSMS_API_SECRET || "").replace(/\r/g, "").trim();
  let sender = (process.env.SMS_SENDER || process.env.THAIBULKSMS_SENDER || "").replace(/\r/g, "").trim();

  // 2. ถ้า process.env ไม่มี → อ่านจากไฟล์ .env โดยตรง (fs top-level import)
  if (!apiKey || !apiSecret) {
    const env = readEnvFile();
    if (!apiKey) apiKey = env["SMS_API_KEY"] || env["THAIBULKSMS_API_KEY"] || "";
    if (!apiSecret) apiSecret = env["SMS_API_SECRET"] || env["THAIBULKSMS_API_SECRET"] || "";
    if (!sender) sender = env["SMS_SENDER"] || env["THAIBULKSMS_SENDER"] || "";
  }
  return { apiKey, apiSecret, sender };
}

// TEMPORARY: Disable auth to restore access
async function requireAuth() {
  // const session = await getSession();
  // if (!session) throw new Error("UNAUTHORIZED");
  // return session;
  // Return dummy session for temporary access
  return { id: 1, name: "Temp User", username: "temp", role: "admin" };
}

async function requireAdmin() {
  // const session = await requireAuth();
  // if (session.role !== "admin") throw new Error("FORBIDDEN");
  // return session;
  return { id: 1, name: "Temp User", username: "temp", role: "admin" };
}

// ========== Low Stock Alert ==========
export async function checkLowStockAndNotify(productId: number) {
  try {
    const settings = await getStoreSettings();
    if (!settings.lineNotifyEnabled) return;
    if (!settings.lowStockAlertEnabled) return;

    const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    if (!product) return;

    if (product.stock <= settings.lowStockThreshold) {
      const { sendLineMessage } = await import("@/lib/line-notify");
      
      // ดึง Channel Token และ User ID
      const channelToken = settings.lineChannelToken || process.env.LINE_CHANNEL_TOKEN;
      const ownerUserId = settings.lineUserId || process.env.LINE_USER_ID;
      
      if (!channelToken || !ownerUserId) return;

      const message = `⚠️ สินค้าใกล้หมด!\n📦 ${product.name}\nคงเหลือ: ${product.stock} ชิ้น\n(เกณฑ์การเตือน: ${settings.lowStockThreshold} ชิ้น)`;
      
      await sendLineMessage(channelToken, ownerUserId, message);
      console.log(`[LowStock] Notified for product: ${product.name}, stock: ${product.stock}`);
    }
  } catch (err) {
    console.error("[checkLowStockAndNotify] Error:", err);
  }
}

export async function checkOutOfStockAndNotify(productId: number) {
  try {
    const settings = await getStoreSettings();
    if (!settings.lineNotifyEnabled) return;
    if (settings.outOfStockAlertEnabled === false) return;

    const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    if (!product) return;

    if (product.stock === 0) {
      const { sendLineMessage } = await import("@/lib/line-notify");
      
      const channelToken = settings.lineChannelToken || process.env.LINE_CHANNEL_TOKEN;
      const ownerUserId = settings.lineUserId || process.env.LINE_USER_ID;
      
      if (!channelToken || !ownerUserId) return;

      const name = [product.brand, product.name, product.model].filter(Boolean).join(" / ");
      const terminal = product.batteryTerminal ? ` (${product.batteryTerminal})` : "";
      const message = `⚠️ สินค้าหมด!\n📦 ${name}${terminal}\nคงเหลือ: 0 ชิ้น\n📝 กรุณาเติมสต๊อกโดยเร็วที่สุด`;
      
      await sendLineMessage(channelToken, ownerUserId, message);
      console.log(`[OutOfStock] Notified for product: ${product.name}`);
    }
  } catch (err) {
    console.error("[checkOutOfStockAndNotify] Error:", err);
  }
}

// ========== Session ==========
export async function getSessionUser() {
  const { getSession } = await import("@/lib/auth");
  return getSession();
}

// ========== Store Settings ==========
export async function getStoreSettings() {
  const settings = await db.select().from(storeSettings).limit(1);
  if (settings.length === 0) {
    // Create default settings if not exists
    const [newSettings] = await db.insert(storeSettings).values({
      storeName: "ร้านแบตเตอรี่",
    }).returning();
    return newSettings;
  }
  return settings[0];
}

export async function updateStoreSettings(data: {
  storeName: string;
  branchName?: string;
  address?: string;
  phone?: string;
  taxId?: string;
  storeLogo?: string;
  lineNotifyToken?: string;
  lineChannelToken?: string;
  lineUserId?: string;
  lineNotifyEnabled?: boolean;
  lineSaleProducts?: boolean;
  lineSaleQuantity?: boolean;
  lineSalePrice?: boolean;
  lineReportSales?: boolean;
  lineReportQuantity?: boolean;
  lineReportProducts?: boolean;
  lineReportModel?: boolean;
  lineReportTime?: string;
  lineReportEnabled?: boolean;
  lowStockThreshold?: number;
  lowStockAlertEnabled?: boolean;
  outOfStockAlertEnabled?: boolean;
  newSaleAlertEnabled?: boolean;
  kgPrice?: number;
}) {
  await requireAdmin();
  const existing = await db.select().from(storeSettings).limit(1);
  if (existing.length === 0) {
    const [newSettings] = await db.insert(storeSettings).values({
      storeName: data.storeName,
      branchName: data.branchName ?? null,
      address: data.address ?? null,
      phone: data.phone ?? null,
      taxId: data.taxId ?? null,
      storeLogo: data.storeLogo ?? null,
      lineNotifyToken: data.lineNotifyToken ?? null,
      lineChannelToken: data.lineChannelToken ?? null,
      lineUserId: data.lineUserId ?? null,
      lineNotifyEnabled: data.lineNotifyEnabled ?? true,
      lineSaleProducts: data.lineSaleProducts ?? true,
      lineSaleQuantity: data.lineSaleQuantity ?? true,
      lineSalePrice: data.lineSalePrice ?? true,
      lineReportSales: data.lineReportSales ?? true,
      lineReportQuantity: data.lineReportQuantity ?? true,
      lineReportProducts: data.lineReportProducts ?? true,
      lineReportModel: data.lineReportModel ?? true,
      lineReportTime: data.lineReportTime ?? "18:00",
      lineReportEnabled: data.lineReportEnabled ?? false,
      lowStockThreshold: data.lowStockThreshold ?? 1,
      lowStockAlertEnabled: data.lowStockAlertEnabled ?? true,
      outOfStockAlertEnabled: data.outOfStockAlertEnabled ?? true,
      newSaleAlertEnabled: data.newSaleAlertEnabled ?? true,
      kgPrice: data.kgPrice !== undefined ? String(data.kgPrice) : "0",
    }).returning();
    return newSettings;
  }
  // Only update fields that are explicitly provided (not undefined)
  // This prevents POS auto-save from overwriting LINE/inventory settings
  const updatePayload: Record<string, any> = { updatedAt: new Date() };
  if (data.storeName !== undefined) updatePayload.storeName = data.storeName;
  if (data.branchName !== undefined) updatePayload.branchName = data.branchName ?? null;
  if (data.address !== undefined) updatePayload.address = data.address ?? null;
  if (data.phone !== undefined) updatePayload.phone = data.phone ?? null;
  if (data.taxId !== undefined) updatePayload.taxId = data.taxId ?? null;
  if (data.storeLogo !== undefined) updatePayload.storeLogo = data.storeLogo ?? null;
  if (data.lineNotifyToken !== undefined) updatePayload.lineNotifyToken = data.lineNotifyToken ?? null;
  if (data.lineChannelToken !== undefined) updatePayload.lineChannelToken = data.lineChannelToken ?? null;
  if (data.lineUserId !== undefined) updatePayload.lineUserId = data.lineUserId ?? null;
  if (data.lineNotifyEnabled !== undefined) updatePayload.lineNotifyEnabled = data.lineNotifyEnabled;
  if (data.lineSaleProducts !== undefined) updatePayload.lineSaleProducts = data.lineSaleProducts;
  if (data.lineSaleQuantity !== undefined) updatePayload.lineSaleQuantity = data.lineSaleQuantity;
  if (data.lineSalePrice !== undefined) updatePayload.lineSalePrice = data.lineSalePrice;
  if (data.lineReportSales !== undefined) updatePayload.lineReportSales = data.lineReportSales;
  if (data.lineReportQuantity !== undefined) updatePayload.lineReportQuantity = data.lineReportQuantity;
  if (data.lineReportProducts !== undefined) updatePayload.lineReportProducts = data.lineReportProducts;
  if (data.lineReportModel !== undefined) updatePayload.lineReportModel = data.lineReportModel;
  if (data.lineReportTime !== undefined) updatePayload.lineReportTime = data.lineReportTime;
  if (data.lineReportEnabled !== undefined) updatePayload.lineReportEnabled = data.lineReportEnabled;
  if (data.lowStockThreshold !== undefined) updatePayload.lowStockThreshold = data.lowStockThreshold;
  if (data.lowStockAlertEnabled !== undefined) updatePayload.lowStockAlertEnabled = data.lowStockAlertEnabled;
  if (data.outOfStockAlertEnabled !== undefined) updatePayload.outOfStockAlertEnabled = data.outOfStockAlertEnabled;
  if (data.newSaleAlertEnabled !== undefined) updatePayload.newSaleAlertEnabled = data.newSaleAlertEnabled;
  if (data.kgPrice !== undefined) updatePayload.kgPrice = String(data.kgPrice);

  const [updated] = await db.update(storeSettings).set(updatePayload).where(eq(storeSettings.id, existing[0].id)).returning();
  revalidatePath("/pos");
  revalidatePath("/settings");
  return updated;
}

// ========== Products ==========
export async function getProducts() {
  return db.select().from(products).leftJoin(categories, eq(products.categoryId, categories.id)).orderBy(products.sortOrder, products.name);
}

export async function getProductById(id: number) {
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result[0] || null;
}

export async function createProduct(data: {
  name: string; categoryId: number | null;
  brand: string; model: string; size: string; batteryTerminal: string; weight: string | null; sellPrice: string; costPrice: string;
  stock: number; warranty: string;
  imageUrl?: string | null;
  images?: string | null;
}) {
  await requireAuth();
  await db.insert(products).values({
    name: data.name, categoryId: data.categoryId,
    brand: data.brand || null, model: data.model || null, size: data.size || null, batteryTerminal: data.batteryTerminal || null,
    weight: data.weight ? data.weight : null,
    sellPrice: data.sellPrice, costPrice: data.costPrice,
    stock: data.stock, warranty: data.warranty || null,
    imageUrl: data.imageUrl || null,
    images: data.images || null,
  });
  revalidatePath("/products");
}

export async function updateProduct(id: number, data: {
  name: string; categoryId: number | null;
  brand: string; model: string; size: string; batteryTerminal: string; weight: string | null; sellPrice: string; costPrice: string;
  stock: number; warranty: string;
  imageUrl?: string | null;
  images?: string | null;
}) {
  await db.update(products).set({
    name: data.name, categoryId: data.categoryId,
    brand: data.brand || null, model: data.model || null, size: data.size || null, batteryTerminal: data.batteryTerminal || null,
    weight: data.weight ? data.weight : null,
    sellPrice: data.sellPrice, costPrice: data.costPrice,
    stock: data.stock, warranty: data.warranty || null,
    imageUrl: data.imageUrl || null,
    images: data.images || null,
  }).where(eq(products.id, id));
  revalidatePath("/products");
  // Check if product is now out of stock
  await checkOutOfStockAndNotify(id).catch(() => {});
}

export async function deleteProduct(id: number): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  // Check if product is referenced in sale items
  const saleItemRefs = await db.select({ id: saleItems.id }).from(saleItems).where(eq(saleItems.productId, id)).limit(1);
  if (saleItemRefs.length > 0) {
    return { success: false, error: "ไม่สามารถลบสินค้านี้ได้ เนื่องจากมีประวัติการขายอยู่" };
  }
  // Check if product is referenced in quotation items
  const quotationItemRefs = await db.select({ id: quotationItems.id }).from(quotationItems).where(eq(quotationItems.productId, id)).limit(1);
  if (quotationItemRefs.length > 0) {
    return { success: false, error: "ไม่สามารถลบสินค้านี้ได้ เนื่องจากมีใบเสนอราคาอ้างถึง" };
  }
  await db.delete(products).where(eq(products.id, id));
  revalidatePath("/products");
  return { success: true };
}

export async function duplicateProduct(id: number) {
  await requireAuth();
  const original = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (original.length === 0) return;
  const p = original[0];
  await db.insert(products).values({
    name: `${p.name} (สำเนา)`,
    brand: p.brand, model: p.model, size: p.size, batteryTerminal: p.batteryTerminal,
    costPrice: p.costPrice, sellPrice: p.sellPrice,
    stock: 0, categoryId: p.categoryId, warranty: p.warranty,
    imageUrl: p.imageUrl, images: p.images,
    sortOrder: p.sortOrder,
  });
  revalidatePath("/products");
}

export async function swapProductOrder(id1: number, id2: number) {
  await requireAuth();
  const [p1] = await db.select({ id: products.id, sortOrder: products.sortOrder }).from(products).where(eq(products.id, id1));
  const [p2] = await db.select({ id: products.id, sortOrder: products.sortOrder }).from(products).where(eq(products.id, id2));
  if (!p1 || !p2) return;
  await db.update(products).set({ sortOrder: p2.sortOrder }).where(eq(products.id, id1));
  await db.update(products).set({ sortOrder: p1.sortOrder }).where(eq(products.id, id2));
  revalidatePath("/products");
}

export async function sendOutOfStockAlert() {
  const { sendLineMessage } = await import("@/lib/line-notify");

  const settings = await db.select().from(storeSettings).limit(1);
  const s = settings[0];

  const isEnabled = s?.lineNotifyEnabled ?? true;
  if (!isEnabled) return { success: false, message: "LINE แจ้งเตือนถูกปิดอยู่" };

  const channelToken = s?.lineChannelToken || process.env.LINE_CHANNEL_TOKEN;
  if (!channelToken) return { success: false, message: "ไม่พบ LINE Channel Token" };

  const ownerUserId = s?.lineUserId || process.env.LINE_USER_ID;
  if (!ownerUserId) return { success: false, message: "ไม่พบ LINE User ID ของผู้ดูแล" };

  // ดึงสินค้าที่หมดแล้ว (stock = 0)
  const outOfStockItems = await db.select({
    productName: products.name,
    brand: products.brand,
    model: products.model,
    batteryTerminal: products.batteryTerminal,
  }).from(products).where(eq(products.stock, 0)).orderBy(products.sortOrder, products.name);

  if (outOfStockItems.length === 0) return { success: false, message: "ไม่มีสินค้าที่หมดแล้ว" };

  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  const dateStr = now.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });

  let msg = `⚠️ แจ้งเตือนสินค้าหมด\n📅 ${dateStr}\n`;
  msg += `━━━━━━━━━━━━━━━\n`;

  outOfStockItems.forEach((item, idx) => {
    const name = [item.brand, item.productName, item.model].filter(Boolean).join(" / ");
    const terminal = item.batteryTerminal ? ` (${item.batteryTerminal})` : "";
    msg += `${idx + 1}. ${name}${terminal}\n`;
  });

  msg += `━━━━━━━━━━━━━━━\n`;
  msg += `รวม ${outOfStockItems.length} รายการ\n`;
  msg += `📝 กรุณาเติมสต๊อกโดยเร็วที่สุด`;

  try {
    await sendLineMessage(channelToken, ownerUserId, msg);
    return { success: true, message: `ส่งแจ้งเตือนสำเร็จ (${outOfStockItems.length} รายการ)` };
  } catch (error) {
    console.error("LINE out of stock alert error:", error);
    return { success: false, message: "ส่งแจ้งเตือนล้มเหลว" };
  }
}

export async function bulkDeleteProducts(ids: number[]): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  await requireAuth();
  if (ids.length === 0) return { success: false, deletedCount: 0, error: "ไม่มีสินค้าที่เลือก" };
  const { inArray } = await import("drizzle-orm");
  // Check if any product is referenced in sale items
  const saleItemRefs = await db.select({ productId: saleItems.productId }).from(saleItems).where(inArray(saleItems.productId, ids)).limit(1);
  if (saleItemRefs.length > 0) {
    return { success: false, deletedCount: 0, error: "ไม่สามารถลบได้ เนื่องจากบางสินค้ามีประวัติการขายอยู่" };
  }
  // Check if any product is referenced in quotation items
  const quotationItemRefs = await db.select({ productId: quotationItems.productId }).from(quotationItems).where(inArray(quotationItems.productId, ids)).limit(1);
  if (quotationItemRefs.length > 0) {
    return { success: false, deletedCount: 0, error: "ไม่สามารถลบได้ เนื่องจากบางสินค้ามีใบเสนอราคาอ้างถึง" };
  }
  await db.delete(products).where(inArray(products.id, ids));
  revalidatePath("/products");
  return { success: true, deletedCount: ids.length };
}

export async function bulkUpdateProductCategory(ids: number[], categoryId: number | null): Promise<{ success: boolean; updatedCount: number }> {
  if (ids.length === 0) return { success: false, updatedCount: 0 };
  const { inArray } = await import("drizzle-orm");
  await db.update(products).set({ categoryId }).where(inArray(products.id, ids));
  revalidatePath("/products");
  return { success: true, updatedCount: ids.length };
}

export async function searchProducts(query: string) {
  if (!query) return getProducts();
  return db.select().from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(
      sql`${products.name} ILIKE ${`%${query}%`} OR ${products.brand} ILIKE ${`%${query}%`} OR ${products.model} ILIKE ${`%${query}%`}`
    );
}

// ========== Categories ==========
export async function getCategories() {
  return db.select().from(categories).orderBy(categories.name);
}

export async function createCategory(name: string, description?: string) {
  await requireAuth();
  await db.insert(categories).values({ name, description: description || null });
  revalidatePath("/categories");
}

export async function updateCategory(id: number, name: string, description?: string) {
  await requireAuth();
  await db.update(categories).set({ name, description: description || null }).where(eq(categories.id, id));
  revalidatePath("/categories");
}

export async function deleteCategory(id: number): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  // Check if any products are in this category
  const productsInCategory = await db.select({ id: products.id }).from(products).where(eq(products.categoryId, id)).limit(1);
  if (productsInCategory.length > 0) {
    return { success: false, error: "ไม่สามารถลบหมวดหมู่นี้ได้ เนื่องจากมีสินค้าอยู่ในหมวดหมู่นี้" };
  }
  await db.delete(categories).where(eq(categories.id, id));
  revalidatePath("/categories");
  return { success: true };
}

// ========== Customers ==========
export async function getCustomers() {
  return db.select().from(customers).orderBy(customers.name);
}

export async function createCustomer(data: { name: string; phone: string; licensePlate: string; address: string; taxId?: string }) {
  await db.insert(customers).values({
    name: data.name, phone: data.phone || null, licensePlate: data.licensePlate || null, address: data.address || null, taxId: data.taxId || null,
  });
  revalidatePath("/customers");
}

// สำหรับเพิ่มลูกค้าจากหน้า POS โดยไม่ revalidate (ป้องกัน state reset ของ cart)
export async function createCustomerInline(data: { name: string; phone: string; licensePlate: string; address: string; taxId?: string }) {
  const result = await db.insert(customers).values({
    name: data.name, phone: data.phone || null, licensePlate: data.licensePlate || null, address: data.address || null, taxId: data.taxId || null,
  }).returning();
  return result[0];
}

export async function updateCustomer(id: number, data: { name: string; phone: string; licensePlate: string; address: string; taxId?: string }) {
  await db.update(customers).set({
    name: data.name, phone: data.phone || null, licensePlate: data.licensePlate || null, address: data.address || null, taxId: data.taxId || null,
  }).where(eq(customers.id, id));
  revalidatePath("/customers");
}

export async function deleteCustomer(id: number) {
  await requireAuth();
  await db.delete(customers).where(eq(customers.id, id));
  revalidatePath("/customers");
}

// ========== Sales ==========
export async function createSale(data: {
  employeeId: number;
  customerId: number | null;
  items: { productId: number; quantity: number; unitPrice: string; discount: string }[];
  serviceFee: string;
  serviceDescription: string;
  discount: string;
  vatType: "vat_in" | "vat_out";
  taxRate: string;
  isTaxInvoice: boolean;
  // ข้อมูลผู้ซื้อสำหรับใบกำกับภาษี
  buyerName?: string;
  buyerPhone?: string;
  buyerAddress?: string;
  buyerTaxId?: string;
  paymentMethod: string;
  note: string;
}) {
  const billNumber = `BILL-${Date.now()}`;
  
  // Generate sequential tax invoice number
  let taxInvoiceNumber = null;
  if (data.isTaxInvoice) {
    const lastSale = await db.select({ taxInvoiceNumber: sales.taxInvoiceNumber })
      .from(sales)
      .where(sql`${sales.isTaxInvoice} = true AND ${sales.taxInvoiceNumber} IS NOT NULL`)
      .orderBy(desc(sales.id))
      .limit(1);
    
    let nextNum = 1;
    if (lastSale[0]?.taxInvoiceNumber) {
      const match = lastSale[0].taxInvoiceNumber.match(/(\d+)$/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    taxInvoiceNumber = `TAX-${String(nextNum).padStart(6, "0")}`;
  }

  const subtotalVal = data.items.reduce((sum, item) => {
    return sum + (parseFloat(item.unitPrice) * item.quantity - parseFloat(item.discount || "0"));
  }, 0);
  const serviceFeeVal = parseFloat(data.serviceFee || "0");
  const discountVal = parseFloat(data.discount || "0");
  const taxRateVal = parseFloat(data.taxRate || "7");
  
  // Calculate based on VAT type
  let beforeTax: number;
  let taxAmountVal: number;
  let totalVal: number;
  
  if (data.isTaxInvoice) {
    if (data.vatType === "vat_in") {
      // ราคารวมภาษีแล้ว - ต้องแยกภาษีออก
      const grossTotal = subtotalVal + serviceFeeVal - discountVal;
      beforeTax = grossTotal / (1 + taxRateVal / 100);
      taxAmountVal = grossTotal - beforeTax;
      totalVal = grossTotal;
    } else {
      // ราคายังไม่รวมภาษี - ต้องบวกภาษีเพิ่ม
      beforeTax = subtotalVal + serviceFeeVal - discountVal;
      taxAmountVal = beforeTax * taxRateVal / 100;
      totalVal = beforeTax + taxAmountVal;
    }
  } else {
    beforeTax = subtotalVal + serviceFeeVal - discountVal;
    taxAmountVal = 0;
    totalVal = beforeTax;
  }

  const [sale] = await db.insert(sales).values({
    billNumber,
    taxInvoiceNumber,
    employeeId: data.employeeId,
    customerId: data.customerId,
    // ข้อมูลผู้ซื้อสำหรับใบกำกับภาษี
    buyerName: data.buyerName || null,
    buyerPhone: data.buyerPhone || null,
    buyerAddress: data.buyerAddress || null,
    buyerTaxId: data.buyerTaxId || null,
    subtotal: subtotalVal.toFixed(2),
    serviceFee: serviceFeeVal.toFixed(2),
    serviceDescription: data.serviceDescription || null,
    discount: discountVal.toFixed(2),
    vatType: data.vatType || "vat_out",
    taxRate: taxRateVal.toFixed(2),
    taxAmount: taxAmountVal.toFixed(2),
    isTaxInvoice: data.isTaxInvoice,
    total: totalVal.toFixed(2),
    paymentMethod: data.paymentMethod || "cash",
    note: data.note || null,
    status: "completed",
  }).returning();

  for (const item of data.items) {
    const lineTotal = parseFloat(item.unitPrice) * item.quantity - parseFloat(item.discount || "0");
    await db.insert(saleItems).values({
      saleId: sale.id,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount || "0",
      total: lineTotal.toFixed(2),
    });
  }

  // ตัดสต๊อกทันทีพร้อมบันทึกบิล
  for (const item of data.items) {
    const result = await db.update(products).set({
      stock: sql`GREATEST(${products.stock} - ${item.quantity}, 0)`,
    }).where(eq(products.id, item.productId)).returning({ id: products.id, stock: products.stock });
    console.log(`[STOCK DEDUCT] saleId=${sale.id} productId=${item.productId} qty=${item.quantity} newStock=${result[0]?.stock}`);
  }

  revalidatePath("/pos");
  revalidatePath("/sales");
  revalidatePath("/products");
  revalidatePath("/dashboard");

  return sale;
}

export async function getSales() {
  return db.select().from(sales)
    .leftJoin(employees, eq(sales.employeeId, employees.id))
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .where(eq(sales.status, "completed"))
    .orderBy(desc(sales.createdAt));
}

export async function deleteSale(id: number): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  // Delete sale items first (cascade)
  await db.delete(saleItems).where(eq(saleItems.saleId, id));
  // Delete SMS reminders linked to this sale
  await db.delete(smsReminders).where(eq(smsReminders.saleId, id));
  // Delete the sale
  await db.delete(sales).where(eq(sales.id, id));
  revalidatePath("/sales");
  return { success: true };
}

export async function voidSale(id: number): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const [sale] = await db.select().from(sales).where(eq(sales.id, id)).limit(1);
  if (!sale) return { success: false, error: "ไม่พบรายการขาย" };
  if (sale.status === "voided") return { success: false, error: "รายการนี้ถูกยกเลิกแล้ว" };

  // คืนสต๊อกถ้าเป็น completed
  if (sale.status === "completed") {
    const items = await db.select().from(saleItems).where(eq(saleItems.saleId, id));
    for (const item of items) {
      await db.update(products).set({
        stock: sql`${products.stock} + ${item.quantity}`,
      }).where(eq(products.id, item.productId));
    }
  }

  await db.update(sales).set({ status: "voided" }).where(eq(sales.id, id));
  revalidatePath("/sales");
  revalidatePath("/dashboard");
  revalidatePath("/products");
  revalidatePath("/pos");
  return { success: true };
}

export async function markSalePrinted(id: number) {
  await db.update(sales).set({
    printed: true,
    printedAt: new Date(),
  }).where(eq(sales.id, id));
  revalidatePath("/sales");
}

export async function markQuotationPrinted(id: number) {
  await db.update(quotations).set({
    printed: true,
    printedAt: new Date(),
  }).where(eq(quotations.id, id));
  revalidatePath("/quotations");
}

export async function bulkDeleteSales(ids: number[]): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  await requireAuth();
  if (ids.length === 0) return { success: false, deletedCount: 0, error: "ไม่มีรายการที่เลือก" };
  const { inArray } = await import("drizzle-orm");
  // Delete sale items first
  await db.delete(saleItems).where(inArray(saleItems.saleId, ids));
  // Delete SMS reminders linked to these sales
  await db.delete(smsReminders).where(inArray(smsReminders.saleId, ids));
  // Delete the sales
  await db.delete(sales).where(inArray(sales.id, ids));
  revalidatePath("/sales");
  return { success: true, deletedCount: ids.length };
}

export async function getSalesWithDate(dateFrom: string, dateTo: string) {
  const startDate = new Date(dateFrom);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(dateTo);
  endDate.setHours(23, 59, 59, 999);

  return db.select().from(sales)
    .leftJoin(employees, eq(sales.employeeId, employees.id))
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .where(and(gte(sales.createdAt, startDate), lte(sales.createdAt, endDate), or(eq(sales.status, "completed"), eq(sales.status, "voided"))))
    .orderBy(desc(sales.createdAt));
}

export async function getSaleById(id: number) {
  const [sale] = await db.select().from(sales)
    .leftJoin(employees, eq(sales.employeeId, employees.id))
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .where(eq(sales.id, id));

  if (!sale) return null;

  const items = await db.select().from(saleItems)
    .leftJoin(products, eq(saleItems.productId, products.id))
    .where(eq(saleItems.saleId, id));

  return { ...sale, items };
}

export async function updateSale(id: number, data: {
  customerId?: number | null;
  buyerName?: string;
  buyerPhone?: string;
  buyerAddress?: string;
  buyerTaxId?: string;
  items?: { productId: number; quantity: number; unitPrice: string; discount: string }[];
  discount?: string;
  serviceFee?: string;
  serviceDescription?: string;
  paymentMethod?: string;
  vatType?: "vat_in" | "vat_out";
  taxRate?: string;
  isTaxInvoice?: boolean;
  note?: string;
  status?: string;
}) {
  // If items provided, recalculate totals and replace items
  if (data.items && data.items.length > 0) {
    // Restore old stock first
    const oldItems = await db.select().from(saleItems).where(eq(saleItems.saleId, id));
    for (const oi of oldItems) {
      await db.update(products).set({
        stock: sql`${products.stock} + ${oi.quantity}`,
      }).where(eq(products.id, oi.productId));
    }
    // Delete old items
    await db.delete(saleItems).where(eq(saleItems.saleId, id));

    // Insert new items and deduct stock
    const subtotalVal = data.items.reduce((sum, item) => {
      return sum + (parseFloat(item.unitPrice) * item.quantity - parseFloat(item.discount || "0"));
    }, 0);
    const serviceFeeVal = parseFloat(data.serviceFee || "0");
    const discountVal = parseFloat(data.discount || "0");
    const taxRateVal = parseFloat(data.taxRate || "7");
    const isTaxInvoice = data.isTaxInvoice ?? false;

    let taxAmountVal = 0;
    let totalVal: number;

    if (isTaxInvoice) {
      if (data.vatType === "vat_in") {
        const grossTotal = subtotalVal + serviceFeeVal - discountVal;
        const beforeTax = grossTotal / (1 + taxRateVal / 100);
        taxAmountVal = grossTotal - beforeTax;
        totalVal = grossTotal;
      } else {
        const beforeTax = subtotalVal + serviceFeeVal - discountVal;
        taxAmountVal = beforeTax * taxRateVal / 100;
        totalVal = beforeTax + taxAmountVal;
      }
    } else {
      totalVal = subtotalVal + serviceFeeVal - discountVal;
    }

    for (const item of data.items) {
      const lineTotal = parseFloat(item.unitPrice) * item.quantity - parseFloat(item.discount || "0");
      await db.insert(saleItems).values({
        saleId: id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount || "0",
        total: lineTotal.toFixed(2),
      });
      await db.update(products).set({
        stock: sql`${products.stock} - ${item.quantity}`,
      }).where(eq(products.id, item.productId));
    }

    const [updated] = await db.update(sales).set({
      customerId: data.customerId !== undefined ? data.customerId : undefined,
      buyerName: data.buyerName || null,
      buyerPhone: data.buyerPhone || null,
      buyerAddress: data.buyerAddress || null,
      buyerTaxId: data.buyerTaxId || null,
      subtotal: subtotalVal.toFixed(2),
      serviceFee: serviceFeeVal.toFixed(2),
      serviceDescription: data.serviceDescription || null,
      discount: discountVal.toFixed(2),
      vatType: data.vatType || "vat_out",
      taxRate: taxRateVal.toFixed(2),
      taxAmount: taxAmountVal.toFixed(2),
      isTaxInvoice,
      total: totalVal.toFixed(2),
      paymentMethod: data.paymentMethod || "cash",
      note: data.note || null,
      status: data.status || "completed",
    }).where(eq(sales.id, id)).returning();

    revalidatePath("/sales");
    revalidatePath("/customers");
    revalidatePath("/products");
    revalidatePath("/dashboard");
    return updated;
  }

  // Simple update without items change
  const setData: any = {};
  if (data.buyerName !== undefined) setData.buyerName = data.buyerName || null;
  if (data.buyerPhone !== undefined) setData.buyerPhone = data.buyerPhone || null;
  if (data.buyerAddress !== undefined) setData.buyerAddress = data.buyerAddress || null;
  if (data.buyerTaxId !== undefined) setData.buyerTaxId = data.buyerTaxId || null;
  if (data.note !== undefined) setData.note = data.note || null;
  if (data.paymentMethod !== undefined) setData.paymentMethod = data.paymentMethod;
  if (data.serviceDescription !== undefined) setData.serviceDescription = data.serviceDescription || null;
  if (data.status !== undefined) setData.status = data.status;
  if (data.customerId !== undefined) setData.customerId = data.customerId;

  // If serviceFee or discount changed without items, recalculate
  if (data.serviceFee !== undefined || data.discount !== undefined) {
    const [currentSale] = await db.select().from(sales).where(eq(sales.id, id));
    const subtotalVal = parseFloat(currentSale.subtotal);
    const serviceFeeVal = data.serviceFee !== undefined ? parseFloat(data.serviceFee) : parseFloat(currentSale.serviceFee);
    const discountVal = data.discount !== undefined ? parseFloat(data.discount) : parseFloat(currentSale.discount);
    const taxRateVal = data.taxRate !== undefined ? parseFloat(data.taxRate) : parseFloat(currentSale.taxRate);
    const isTaxInvoice = data.isTaxInvoice !== undefined ? data.isTaxInvoice : currentSale.isTaxInvoice;
    const vatType = data.vatType || currentSale.vatType;

    let taxAmountVal = 0;
    let totalVal: number;
    if (isTaxInvoice) {
      if (vatType === "vat_in") {
        const grossTotal = subtotalVal + serviceFeeVal - discountVal;
        const beforeTax = grossTotal / (1 + taxRateVal / 100);
        taxAmountVal = grossTotal - beforeTax;
        totalVal = grossTotal;
      } else {
        const beforeTax = subtotalVal + serviceFeeVal - discountVal;
        taxAmountVal = beforeTax * taxRateVal / 100;
        totalVal = beforeTax + taxAmountVal;
      }
    } else {
      totalVal = subtotalVal + serviceFeeVal - discountVal;
    }

    setData.serviceFee = serviceFeeVal.toFixed(2);
    setData.discount = discountVal.toFixed(2);
    setData.taxRate = taxRateVal.toFixed(2);
    setData.taxAmount = taxAmountVal.toFixed(2);
    setData.isTaxInvoice = isTaxInvoice;
    setData.vatType = vatType;
    setData.total = totalVal.toFixed(2);
  }

  const [updated] = await db.update(sales).set(setData).where(eq(sales.id, id)).returning();
  revalidatePath("/sales");
  revalidatePath("/customers");
  return updated;
}

export async function getSalesByCustomerId(customerId: number) {
  const result = await db.select().from(sales)
    .leftJoin(employees, eq(sales.employeeId, employees.id))
    .where(eq(sales.customerId, customerId))
    .orderBy(desc(sales.createdAt));
  return result;
}

export async function getSaleItemsBySaleId(saleId: number) {
  return db.select().from(saleItems)
    .leftJoin(products, eq(saleItems.productId, products.id))
    .where(eq(saleItems.saleId, saleId));
}

// ========== Employees ==========
export async function getEmployees() {
  return db.select({
    id: employees.id,
    username: employees.username,
    name: employees.name,
    role: employees.role,
    phone: employees.phone,
    address: employees.address,
    profileImage: employees.profileImage,
    idCardImage: employees.idCardImage,
    lineUserId: employees.lineUserId,
    active: employees.active,
    createdAt: employees.createdAt,
  }).from(employees).orderBy(employees.name);
}

export async function createEmployee(data: {
  username: string; password: string; name: string; role: string;
  phone?: string; address?: string; profileImage?: string; idCardImage?: string; lineUserId?: string;
}) {
  await requireAdmin();
  const hashedPassword = await hashPassword(data.password);
  await db.insert(employees).values({
    username: data.username,
    passwordHash: hashedPassword,
    name: data.name,
    role: data.role as "admin" | "cashier" | "service",
    phone: data.phone || null,
    address: data.address || null,
    profileImage: data.profileImage || null,
    idCardImage: data.idCardImage || null,
    lineUserId: data.lineUserId || null,
  });
  revalidatePath("/employees");
}

export async function updateEmployee(id: number, data: {
  username?: string; name?: string; role?: string; password?: string;
  phone?: string; address?: string; profileImage?: string; idCardImage?: string; lineUserId?: string;
}) {
  const updateData: Record<string, unknown> = {};
  if (data.username) updateData.username = data.username;
  if (data.name) updateData.name = data.name;
  if (data.role) updateData.role = data.role;
  if (data.password) {
    updateData.passwordHash = await hashPassword(data.password);
  }
  if (data.phone !== undefined) updateData.phone = data.phone || null;
  if (data.address !== undefined) updateData.address = data.address || null;
  if (data.profileImage !== undefined) updateData.profileImage = data.profileImage || null;
  if (data.idCardImage !== undefined) updateData.idCardImage = data.idCardImage || null;
  if (data.lineUserId !== undefined) updateData.lineUserId = data.lineUserId || null;
  await db.update(employees).set(updateData).where(eq(employees.id, id));
  revalidatePath("/employees");
}

export async function deleteEmployee(id: number) {
  await requireAdmin();
  await db.update(employees).set({ active: false }).where(eq(employees.id, id));
  revalidatePath("/employees");
}

export async function toggleEmployeeActive(id: number, active: boolean) {
  await db.update(employees).set({ active }).where(eq(employees.id, id));
  revalidatePath("/employees");
}

// ========== Quotations ==========
export async function getQuotations() {
  return db.select().from(quotations)
    .leftJoin(employees, eq(quotations.employeeId, employees.id))
    .leftJoin(customers, eq(quotations.customerId, customers.id))
    .orderBy(desc(quotations.createdAt));
}

export async function getQuotationItems(quotationId: number) {
  return db.select().from(quotationItems)
    .leftJoin(products, eq(quotationItems.productId, products.id))
    .where(eq(quotationItems.quotationId, quotationId));
}

export async function createQuotation(data: {
  employeeId: number;
  customerId?: number | null;
  buyerName?: string;
  buyerPhone?: string;
  buyerAddress?: string;
  buyerTaxId?: string;
  items: { productId?: number; description?: string; quantity: number; unitPrice: string; discount: string }[];
  serviceFee?: string;
  serviceDescription?: string;
  discount?: string;
  vatType?: "vat_in" | "vat_out";
  taxRate?: string;
  includeVat?: boolean;
  validDays?: number;
  note?: string;
}) {
  const sfee = parseFloat(data.serviceFee || "0");
  const disc = parseFloat(data.discount || "0");
  const rate = parseFloat(data.taxRate || "7");
  const includeVat = data.includeVat ?? false;

  let itemsSubtotal = 0;
  for (const item of data.items) {
    const lineTotal = parseFloat(item.unitPrice) * item.quantity - parseFloat(item.discount || "0");
    itemsSubtotal += lineTotal;
  }

  const subtotal = itemsSubtotal;
  const baseAmount = subtotal + sfee - disc;
  let taxAmount = 0;
  let total = baseAmount;

  if (includeVat) {
    if (data.vatType === "vat_in") {
      taxAmount = baseAmount - (baseAmount / (1 + rate / 100));
    } else {
      taxAmount = baseAmount * (rate / 100);
      total = baseAmount + taxAmount;
    }
  }

  // Generate quotation number: QT-YYYYMMDD-XXXX
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(quotations);
  const seq = (countResult?.count || 0) + 1;
  const quotationNumber = `QT-${dateStr}-${String(seq).padStart(4, "0")}`;

  const [created] = await db.insert(quotations).values({
    quotationNumber,
    employeeId: data.employeeId,
    customerId: data.customerId || null,
    buyerName: data.buyerName || null,
    buyerPhone: data.buyerPhone || null,
    buyerAddress: data.buyerAddress || null,
    buyerTaxId: data.buyerTaxId || null,
    subtotal: subtotal.toFixed(2),
    serviceFee: sfee.toFixed(2),
    serviceDescription: data.serviceDescription || null,
    discount: disc.toFixed(2),
    vatType: data.vatType || "vat_out",
    taxRate: rate.toFixed(2),
    taxAmount: taxAmount.toFixed(2),
    includeVat,
    total: total.toFixed(2),
    validDays: data.validDays || 30,
    note: data.note || null,
  }).returning();

  if (data.items.length > 0) {
    await db.insert(quotationItems).values(
      data.items.map((item) => {
        const lineTotal = parseFloat(item.unitPrice) * item.quantity - parseFloat(item.discount || "0");
        return {
          quotationId: created.id,
          productId: item.productId || null,
          description: item.description || null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount || "0",
          total: lineTotal.toFixed(2),
        };
      })
    );
  }

  revalidatePath("/quotations");
  return created;
}

export async function updateQuotation(id: number, data: {
  customerId?: number | null;
  buyerName?: string;
  buyerPhone?: string;
  buyerAddress?: string;
  buyerTaxId?: string;
  items?: { productId?: number; description?: string; quantity: number; unitPrice: string; discount: string }[];
  serviceFee?: string;
  serviceDescription?: string;
  discount?: string;
  vatType?: "vat_in" | "vat_out";
  taxRate?: string;
  includeVat?: boolean;
  validDays?: number;
  note?: string;
  status?: string;
}) {
  const updateFields: any = {};

  if (data.status !== undefined) updateFields.status = data.status;
  if (data.buyerName !== undefined) updateFields.buyerName = data.buyerName || null;
  if (data.buyerPhone !== undefined) updateFields.buyerPhone = data.buyerPhone || null;
  if (data.buyerAddress !== undefined) updateFields.buyerAddress = data.buyerAddress || null;
  if (data.buyerTaxId !== undefined) updateFields.buyerTaxId = data.buyerTaxId || null;
  if (data.customerId !== undefined) updateFields.customerId = data.customerId || null;
  if (data.note !== undefined) updateFields.note = data.note || null;
  if (data.validDays !== undefined) updateFields.validDays = data.validDays;
  if (data.serviceDescription !== undefined) updateFields.serviceDescription = data.serviceDescription || null;

  if (data.items) {
    await db.delete(quotationItems).where(eq(quotationItems.quotationId, id));

    const sfee = parseFloat(data.serviceFee || "0");
    const disc = parseFloat(data.discount || "0");
    const rate = parseFloat(data.taxRate || "7");
    const includeVat = data.includeVat ?? false;

    let itemsSubtotal = 0;
    for (const item of data.items) {
      const lineTotal = parseFloat(item.unitPrice) * item.quantity - parseFloat(item.discount || "0");
      itemsSubtotal += lineTotal;
    }

    const subtotal = itemsSubtotal;
    const baseAmount = subtotal + sfee - disc;
    let taxAmount = 0;
    let total = baseAmount;

    if (includeVat) {
      if (data.vatType === "vat_in") {
        taxAmount = baseAmount - (baseAmount / (1 + rate / 100));
      } else {
        taxAmount = baseAmount * (rate / 100);
        total = baseAmount + taxAmount;
      }
    }

    updateFields.subtotal = subtotal.toFixed(2);
    updateFields.serviceFee = sfee.toFixed(2);
    updateFields.discount = disc.toFixed(2);
    updateFields.vatType = data.vatType || "vat_out";
    updateFields.taxRate = rate.toFixed(2);
    updateFields.taxAmount = taxAmount.toFixed(2);
    updateFields.includeVat = includeVat;
    updateFields.total = total.toFixed(2);

    if (data.items.length > 0) {
      await db.insert(quotationItems).values(
        data.items.map((item) => {
          const lineTotal = parseFloat(item.unitPrice) * item.quantity - parseFloat(item.discount || "0");
          return {
            quotationId: id,
            productId: item.productId || null,
            description: item.description || null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount || "0",
            total: lineTotal.toFixed(2),
          };
        })
      );
    }
  }

  updateFields.updatedAt = new Date();

  const [updated] = await db.update(quotations).set(updateFields).where(eq(quotations.id, id)).returning();
  revalidatePath("/quotations");
  return updated;
}

export async function deleteQuotation(id: number): Promise<{ success: boolean; error?: string }> {
  // Delete quotation items first
  await db.delete(quotationItems).where(eq(quotationItems.quotationId, id));
  // Delete the quotation
  await db.delete(quotations).where(eq(quotations.id, id));
  revalidatePath("/quotations");
  return { success: true };
}

export async function bulkDeleteQuotations(ids: number[]): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  await requireAuth();
  if (ids.length === 0) return { success: false, deletedCount: 0, error: "ไม่มีรายการที่เลือก" };
  const { inArray } = await import("drizzle-orm");
  // Delete quotation items first
  await db.delete(quotationItems).where(inArray(quotationItems.quotationId, ids));
  // Delete the quotations
  await db.delete(quotations).where(inArray(quotations.id, ids));
  revalidatePath("/quotations");
  return { success: true, deletedCount: ids.length };
}

export async function getQuotationsByCustomerId(customerId: number) {
  return db.select().from(quotations)
    .leftJoin(employees, eq(quotations.employeeId, employees.id))
    .where(eq(quotations.customerId, customerId))
    .orderBy(desc(quotations.createdAt));
}

// ========== LINE Messaging API ==========
export async function sendDailySalesLineNotify() {
  const { sendLineMessage } = await import("@/lib/line-notify");

  const settings = await db.select().from(storeSettings).limit(1);
  const s = settings[0];
  // อ่านจาก DB ก่อน ถ้าไม่มีให้อ่านจาก .env
  const channelToken = s?.lineChannelToken || process.env.LINE_CHANNEL_TOKEN;
  const userId = s?.lineUserId || process.env.LINE_USER_ID;
  if (!channelToken) return { success: false, error: "ยังไม่ได้ตั้งค่า LINE Channel Access Token" };
  if (!userId) return { success: false, error: "ยังไม่ได้ตั้งค่า LINE User ID" };

  // Get preferences (default all true if not set)
  const showSales = s?.lineReportSales ?? true;
  const showQuantity = s?.lineReportQuantity ?? true;
  const showProducts = s?.lineReportProducts ?? true;
  const showModel = s?.lineReportModel ?? true;

  const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  today.setHours(0, 0, 0, 0);

  // Get today's completed sales with items
  const todaySalesData = await db.select().from(sales)
    .where(and(gte(sales.createdAt, today), eq(sales.status, "completed")))
    .orderBy(desc(sales.createdAt));

  const storeName = s?.storeName || "ร้านแบตเตอรี่";

  if (todaySalesData.length === 0) {
    const msg = `📊 สรุปยอดขายวันนี้\n🏪 ${storeName}\n📅 ${today.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}\n\n❌ ไม่มีรายการขายวันนี้`;
    const ok = await sendLineMessage(channelToken, userId, msg);
    return { success: ok.success, error: ok.error, message: "ไม่มียอดขาย" };
  }

  const totalRevenue = todaySalesData.reduce((sum, sale) => sum + parseFloat(sale.total), 0);

  let msg = `📊 สรุปยอดขายวันนี้`;
  msg += `\n🏪 ${storeName}`;
  msg += `\n📅 ${today.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}`;

  // Show products if enabled
  if ((showProducts || showModel) && todaySalesData.length > 0) {
    const saleIds = todaySalesData.map(sale => sale.id);
    const allItems = await db.select({
      productName: products.name,
      brand: products.brand,
      model: products.model,
      quantity: saleItems.quantity,
      total: saleItems.total,
    }).from(saleItems)
      .innerJoin(products, eq(saleItems.productId, products.id))
      .where(sql`${saleItems.saleId} = ANY(${sql.raw(`ARRAY[${saleIds.join(",")}]`)})`);

    // Aggregate by product (use name + model as key for uniqueness)
    const productMap = new Map<string, { name: string; brand: string | null; model: string | null; qty: number; total: number }>();
    for (const item of allItems) {
      const key = `${item.productName}||${item.brand || ""}||${item.model || ""}`;
      const existing = productMap.get(key) || { name: item.productName, brand: item.brand, model: item.model, qty: 0, total: 0 };
      existing.qty += item.quantity;
      existing.total += parseFloat(item.total);
      productMap.set(key, existing);
    }

    if (productMap.size > 0) {
      msg += `\n${'─'.repeat(20)}`;

      let idx = 1;
      Array.from(productMap.values()).forEach((data) => {
        let line = `\n${idx}.`;
        if (showProducts) line += ` ${data.name}`;
        if (showModel && (data.brand || data.model)) {
          const modelParts = [data.brand, data.model].filter(Boolean).join(" ");
          if (modelParts) line += showProducts ? ` (${modelParts})` : ` ${modelParts}`;
        }
        if (showQuantity) line += ` x${data.qty}`;
        msg += line;
        idx++;
      });
    }
  }

  msg += `\n${'─'.repeat(20)}`;
  msg += `\n🧾 ${todaySalesData.length} บิล`;

  if (showSales) {
    msg += `  💰 ${totalRevenue.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`;
  }

  const result = await sendLineMessage(channelToken, userId, msg);
  return { success: result.success, error: result.error, salesCount: todaySalesData.length, total: totalRevenue };
}

export async function finalizeSale(saleId: number, saleItems?: { productId: number; quantity: number }[]) {
  console.log(`🎯 Finalize Sale: Starting with saleId=${saleId}, items=${saleItems?.length || 0}`);

  // สต๊อกถูกตัดไปแล้วตอนสร้างบิล (createSale / POST /api/pos/sale)
  // ที่นี่เหลือแค่ส่ง LINE แจ้งเตือน + เช็คสต๊อกต่ำ

  // 1. Send LINE notify
  try {
    await sendSaleLineNotify(saleId);
    console.log(`✅ Finalize Sale: LINE notify sent for saleId=${saleId}`);
  } catch (err) {
    console.error(`❌ Finalize Sale: LINE notify failed for saleId=${saleId}:`, err);
  }

  // 2. Check low stock and notify for each item
  if (saleItems) {
    for (const item of saleItems) {
      await checkLowStockAndNotify(item.productId).catch(() => {});
      await checkOutOfStockAndNotify(item.productId).catch(() => {});
    }
  }

  revalidatePath("/pos");
  revalidatePath("/sales");
  revalidatePath("/products");
  revalidatePath("/dashboard");
  
  console.log(`✅ Finalize Sale: Completed for saleId=${saleId}`);
}

export async function cancelPendingSale(saleId: number) {
  // เปลี่ยนสถานะเป็น voided แทนการลบ (เก็บประวัติไว้)
  const [sale] = await db.select({ status: sales.status }).from(sales).where(eq(sales.id, saleId)).limit(1);
  if (!sale || sale.status === "voided") return;

  // คืนสต๊อกสินค้าทุกรายการในบิล
  if (sale.status === "completed") {
    const items = await db.select({
      productId: saleItems.productId,
      quantity: saleItems.quantity,
    }).from(saleItems).where(eq(saleItems.saleId, saleId));
    for (const item of items) {
      await db.update(products).set({
        stock: sql`${products.stock} + ${item.quantity}`,
      }).where(eq(products.id, item.productId));
    }
  }

  await db.update(sales).set({ status: "voided" }).where(eq(sales.id, saleId));
  revalidatePath("/pos");
  revalidatePath("/sales");
  revalidatePath("/products");
  revalidatePath("/dashboard");
}

export async function sendSaleLineNotify(saleId: number) {
  console.log(`🔍 LINE Notify: Starting for saleId=${saleId}`);
  
  const { sendLineMessage } = await import("@/lib/line-notify");

  const settings = await db.select().from(storeSettings).limit(1);
  const s = settings[0];

  // Check if LINE is enabled (default true if not set)
  const isEnabled = s?.lineNotifyEnabled ?? true;
  if (!isEnabled) {
    console.log("🔕 LINE Notify: Disabled in settings");
    return;
  }

  // Check if new sale alert is enabled
  if (s?.newSaleAlertEnabled === false) {
    console.log("🔕 LINE Notify: New sale alert disabled in settings");
    return;
  }

  // อ่านจาก DB ก่อน ถ้าไม่มีให้อ่านจาก .env
  const channelToken = s?.lineChannelToken || process.env.LINE_CHANNEL_TOKEN;
  if (!channelToken) {
    console.log("❌ LINE Notify: No channel token found");
    return;
  }

  // ส่งแจ้งเตือนคำสั่งซื้อใหม่เฉพาะผู้ดูแลร้าน (ไม่ส่งพนักงาน)
  const recipientIds = new Set<string>();

  // User ID ของเจ้าของร้าน/ผู้ดูแล (จาก storeSettings หรือ .env)
  const ownerUserId = s?.lineUserId || process.env.LINE_USER_ID;
  if (ownerUserId) recipientIds.add(ownerUserId);

  if (recipientIds.size === 0) {
    console.log("❌ LINE Notify: No owner/admin LINE User ID found");
    return;
  }

  console.log(`🔍 LINE Notify: Looking for sale data with saleId=${saleId}`);
  const saleData = await db.select().from(sales).where(eq(sales.id, saleId)).limit(1);
  console.log(`🔍 LINE Notify: Found ${saleData.length} sale records`);
  
  if (!saleData[0]) {
    console.log(`❌ LINE Notify: Sale not found for saleId=${saleId}`);
    return;
  }
  const sale = saleData[0];

  const items = await db.select({
    productName: products.name,
    brand: products.brand,
    model: products.model,
    quantity: saleItems.quantity,
    unitPrice: saleItems.unitPrice,
    total: saleItems.total,
  }).from(saleItems)
    .innerJoin(products, eq(saleItems.productId, products.id))
    .where(eq(saleItems.saleId, saleId));

  // ดึงข้อมูลลูกค้า
  let customerName = "-";
  let customerPhone = "";
  let customerPlate = "";
  if (sale.customerId) {
    const custData = await db.select().from(customers).where(eq(customers.id, sale.customerId)).limit(1);
    if (custData[0]) {
      customerName = custData[0].name;
      customerPhone = custData[0].phone || "";
      customerPlate = custData[0].licensePlate || "";
    }
  }

  // ดึงข้อมูลพนักงานที่ขาย
  let employeeName = "-";
  if (sale.employeeId) {
    const empData = await db.select({ name: employees.name }).from(employees).where(eq(employees.id, sale.employeeId)).limit(1);
    if (empData[0]) employeeName = empData[0].name;
  }

  const storeName = s?.storeName || "ร้านแบตเตอรี่";
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));

  // อ่านค่า preferences สำหรับแจ้งเตือนแต่ละบิล
  const showProducts = s?.lineSaleProducts ?? true;
  const showQuantity = s?.lineSaleQuantity ?? true;
  const showPrice = s?.lineSalePrice ?? true;

  let msg = `� คำสั่งซื้อใหม่!`;
  msg += `\n🏪 ${storeName}`;
  msg += `\n📋 ${sale.isTaxInvoice ? sale.taxInvoiceNumber : sale.billNumber}`;
  msg += `\n🕐 ${now.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })} ${now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}`;
  msg += `\n� พนักงาน: ${employeeName}`;

  // ข้อมูลลูกค้า
  if (customerName !== "-") {
    msg += `\n\n🧑‍💼 ลูกค้า: ${customerName}`;
    if (customerPhone) msg += `\n📱 ${customerPhone}`;
    if (customerPlate) msg += `\n🚗 ${customerPlate}`;
  }

  // รายการสินค้า
  msg += `\n\n📝 รายการสินค้า:`;
  msg += `\n${"─".repeat(20)}`;
  for (const item of items) {
    if (showProducts) {
      let productLine = `${item.productName}`;
      if (item.brand) productLine += ` (${item.brand}`;
      if (item.model) productLine += ` ${item.model}`;
      if (item.brand) productLine += `)`;
      msg += `\n• ${productLine}`;
    }
    if (showQuantity || showPrice) {
      let detailLine = "  ";
      if (showQuantity) detailLine += `จำนวน: ${item.quantity}`;
      if (showQuantity && showPrice) detailLine += ` | `;
      if (showPrice) detailLine += `${parseFloat(item.total).toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿`;
      msg += `\n${detailLine}`;
    }
  }

  // ค่าบริการ
  if (parseFloat(sale.serviceFee || "0") > 0) {
    msg += `\n• ค่าบริการ: ${parseFloat(sale.serviceFee).toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿`;
    if (sale.serviceDescription) msg += `\n  (${sale.serviceDescription})`;
  }

  msg += `\n${"─".repeat(20)}`;

  // สรุป
  if (showPrice) {
    if (parseFloat(sale.discount || "0") > 0) {
      msg += `\n🏷️ ส่วนลด: -${parseFloat(sale.discount).toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿`;
    }
    if (sale.isTaxInvoice && parseFloat(sale.taxAmount || "0") > 0) {
      msg += `\n� ภาษี: ${parseFloat(sale.taxAmount).toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿`;
    }
    msg += `\n💰 รวมทั้งสิ้น: ${parseFloat(sale.total).toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท`;
  }

  const paymentLabels: Record<string, string> = { cash: "💵 เงินสด", transfer: "📲 โอนเงิน", credit: "💳 เครดิต" };
  msg += `\n${paymentLabels[sale.paymentMethod] || `💳 ${sale.paymentMethod}`}`;

  if (sale.note) {
    msg += `\n📌 หมายเหตุ: ${sale.note}`;
  }

  // ส่งให้ทุกคนที่มี LINE User ID (ส่งแบบ parallel)
  const sendPromises = Array.from(recipientIds).map(uid =>
    sendLineMessage(channelToken, uid, msg).catch(err => {
      console.error(`Failed to send LINE to ${uid}:`, err);
    })
  );
  await Promise.allSettled(sendPromises);
}

  
// Send sale info to specific employee via LINE
export async function sendSaleToEmployeeLine(data: {
  employeeId: number;
  saleId: number;
  extraMessage?: string;
  buyerName?: string;
  buyerPhone?: string;
  buyerAddress?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { sendLineMessage } = await import("@/lib/line-notify");

  const settings = await db.select().from(storeSettings).limit(1);
  const s = settings[0];
  const channelToken = s?.lineChannelToken || process.env.LINE_CHANNEL_TOKEN;
  if (!channelToken) return { success: false, error: "ยังไม่ได้ตั้งค่า LINE Channel Access Token" };

  // Get employee LINE User ID
  const empData = await db.select().from(employees).where(eq(employees.id, data.employeeId)).limit(1);
  if (!empData[0]) return { success: false, error: "ไม่พบพนักงาน" };
  const emp = empData[0];
  if (!emp.lineUserId) return { success: false, error: `พนักงาน ${emp.name} ยังไม่ได้ตั้งค่า LINE User ID` };

  // Get sale data
  const saleData = await db.select().from(sales).where(eq(sales.id, data.saleId)).limit(1);
  if (!saleData[0]) return { success: false, error: "ไม่พบข้อมูลการขาย" };
  const sale = saleData[0];

  // Get sale items
  const items = await db.select({
    productName: products.name,
    brand: products.brand,
    model: products.model,
    quantity: saleItems.quantity,
    unitPrice: saleItems.unitPrice,
    total: saleItems.total,
  }).from(saleItems)
    .innerJoin(products, eq(saleItems.productId, products.id))
    .where(eq(saleItems.saleId, data.saleId));

  const storeName = s?.storeName || "ร้านแบตเตอรี่";
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));

  let msg = `📋 งานมอบหมาย - รายละเอียดการขาย`;
  msg += `\n🏪 ${storeName}`;
  msg += `\n🕐 ${now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}`;
  msg += `\n📅 ${now.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}`;
  msg += `\n${'─'.repeat(20)}`;
  msg += `\n🧾 บิลเลขที่: ${sale.billNumber}`;

  // Buyer info
  const bName = data.buyerName || sale.buyerName;
  const bPhone = data.buyerPhone || sale.buyerPhone;
  const bAddress = data.buyerAddress || sale.buyerAddress;
  if (bName) msg += `\n👤 ชื่อลูกค้า: ${bName}`;
  if (bPhone) msg += `\n📞 โทร: ${bPhone}`;
  if (bAddress) msg += `\n📍 ที่อยู่: ${bAddress}`;

  // Items
  if (items.length > 0) {
    msg += `\n${'─'.repeat(20)}`;
    msg += `\n📦 รายการสินค้า:`;
    items.forEach((item, idx) => {
      const itemLabel = [item.brand, item.productName, item.model].filter(Boolean).join(" / ");
      msg += `\n${idx + 1}. ${itemLabel} x${item.quantity} = ${parseFloat(item.total).toLocaleString("th-TH", { minimumFractionDigits: 2 })} บ.`;
    });
  }

  // รายละเอียดการชำระ
  msg += `\n${'─'.repeat(20)}`;
  const subtotalVal = parseFloat(sale.subtotal || "0");
  const serviceFeeVal = parseFloat(sale.serviceFee || "0");
  const discountVal = parseFloat(sale.discount || "0");
  const taxAmountVal = parseFloat(sale.taxAmount || "0");
  const totalVal = parseFloat(sale.total);

  msg += `\n🧮 ยอดสินค้า: ${subtotalVal.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บ.`;
  if (serviceFeeVal > 0) {
    msg += `\n🔧 ค่าบริการ: ${serviceFeeVal.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บ.`;
    if (sale.serviceDescription) msg += ` (${sale.serviceDescription})`;
  }
  if (discountVal > 0) {
    msg += `\n🏷️ ส่วนลด: -${discountVal.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บ.`;
  }
  if (sale.isTaxInvoice && taxAmountVal > 0) {
    msg += `\n📄 ภาษี (${parseFloat(sale.taxRate || "7")}%): ${taxAmountVal.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บ.`;
    msg += `\n   (${sale.vatType === "vat_in" ? "ราคารวม VAT แล้ว" : "ราคายังไม่รวม VAT"})`;
  }
  msg += `\n${'─'.repeat(20)}`;
  msg += `\n💰 ยอดชำระจริง: ${totalVal.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท`;
  msg += `\n💳 ช่องทาง: ${sale.paymentMethod === "cash" ? "เงินสด" : sale.paymentMethod === "transfer" ? "โอนเงิน" : "เครดิต"}`;

  if (data.extraMessage) {
    msg += `\n${'─'.repeat(20)}`;
    msg += `\n💬 ข้อความเพิ่มเติม:\n${data.extraMessage}`;
  }

  msg += `\n\n👷 พนักงานรับผิดชอบ: ${emp.name}`;

  console.log(`[LINE Employee] Sending to emp=${emp.name}, lineUserId=${emp.lineUserId}, msgLength=${msg.length}, tokenLength=${channelToken?.length}`);
  const result = await sendLineMessage(channelToken, emp.lineUserId, msg);
  if (!result.success) {
    console.error(`[LINE Employee] Failed to send to employee: ${result.error}`);
    // Fallback: ส่งให้เจ้าของร้านแทน
    const ownerUserId = s?.lineUserId || process.env.LINE_USER_ID;
    if (ownerUserId && ownerUserId !== emp.lineUserId) {
      console.log(`[LINE Employee] Fallback: sending to owner lineUserId=${ownerUserId?.substring(0, 10)}...`);
      const fallbackMsg = `⚠️ ส่งให้พนักงาน ${emp.name} ไม่สำเร็จ (${result.error})\n\n${msg}`;
      const fallbackResult = await sendLineMessage(channelToken, ownerUserId, fallbackMsg);
      if (fallbackResult.success) {
        return { success: true, error: undefined };
      }
      // ถ้า fallback ก็ส่งไม่ได้ — น่าจะเป็นปัญหา Token
      return { success: false, error: `ส่งไม่สำเร็จ: ${fallbackResult.error} — กรุณาตรวจสอบ LINE Channel Access Token ในหน้าตั้งค่า` };
    }
    // ถ้าไม่มี owner fallback
    const hint = result.error?.includes("Failed to send messages")
      ? ` — พนักงาน ${emp.name} อาจยังไม่ได้ add LINE Bot เป็นเพื่อน หรือ LINE User ID ไม่ถูกต้อง`
      : "";
    return { success: false, error: `${result.error}${hint}` };
  }
  return { success: true };
}

export async function testLineNotify() {
  const { sendLineMessage } = await import("@/lib/line-notify");

  const settings = await db.select().from(storeSettings).limit(1);
  const s = settings[0];
  // อ่านจาก DB ก่อน ถ้าไม่มีให้อ่านจาก .env
  const channelToken = s?.lineChannelToken || process.env.LINE_CHANNEL_TOKEN;
  const userId = s?.lineUserId || process.env.LINE_USER_ID;
  if (!channelToken) return { success: false, error: "ยังไม่ได้ตั้งค่า LINE Channel Access Token" };
  if (!userId) return { success: false, error: "ยังไม่ได้ตั้งค่า LINE User ID" };

  const storeName = s?.storeName || "ร้านแบตเตอรี่";
  const thaiNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  const msg = `✅ ทดสอบการเชื่อมต่อ LINE Messaging API\n🏪 ${storeName}\n📅 ${thaiNow.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}\n🕐 ${thaiNow.toLocaleTimeString("th-TH")}\n\nระบบแจ้งเตือนพร้อมใช้งาน!`;
  const result = await sendLineMessage(channelToken, userId, msg);
  return { success: result.success, error: result.error };
}

// ========== Dashboard ==========
// ========== Chart Data ==========
export async function getDailySalesChart(dateFrom: string, dateTo: string) {
  const startDate = new Date(dateFrom);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(dateTo);
  endDate.setHours(23, 59, 59, 999);

  const rows = await db.select({
    date: sql<string>`to_char(${sales.createdAt}, 'YYYY-MM-DD')`,
    total: sql<string>`COALESCE(sum(${sales.total}::numeric), 0)::text`,
    count: sql<number>`count(*)::int`,
  }).from(sales)
    .where(and(gte(sales.createdAt, startDate), lte(sales.createdAt, endDate), eq(sales.status, "completed")))
    .groupBy(sql`to_char(${sales.createdAt}, 'YYYY-MM-DD')`)
    .orderBy(sql`to_char(${sales.createdAt}, 'YYYY-MM-DD')`);

  return rows.map(r => ({
    date: new Date(r.date).toLocaleDateString("th-TH", { day: "2-digit", month: "short" }),
    sales: parseFloat(r.total),
    count: r.count,
  }));
}

export async function getTopProductsChart(dateFrom: string, dateTo: string) {
  const startDate = new Date(dateFrom);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(dateTo);
  endDate.setHours(23, 59, 59, 999);

  const rows = await db.select({
    name: products.name,
    qty: sql<number>`sum(${saleItems.quantity})::int`,
    total: sql<string>`COALESCE(sum(${saleItems.total}::numeric), 0)::text`,
  }).from(saleItems)
    .innerJoin(products, eq(saleItems.productId, products.id))
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .where(and(gte(sales.createdAt, startDate), lte(sales.createdAt, endDate), eq(sales.status, "completed")))
    .groupBy(products.name)
    .orderBy(sql`sum(${saleItems.quantity}) desc`)
    .limit(6);

  return rows.map(r => ({
    name: r.name.length > 20 ? r.name.substring(0, 20) + "..." : r.name,
    value: r.qty,
    total: parseFloat(r.total),
  }));
}

export async function getDashboardStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return getDashboardStatsWithDate(today.toISOString().split("T")[0], today.toISOString().split("T")[0]);
}

export async function getDashboardStatsWithDate(dateFrom: string, dateTo: string) {
  const startDate = new Date(dateFrom);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(dateTo);
  endDate.setHours(23, 59, 59, 999);

  const [periodSales] = await db.select({
    count: sql<number>`count(*)::int`,
    total: sql<string>`COALESCE(sum(${sales.total}::numeric), 0)::text`,
  }).from(sales).where(
    and(gte(sales.createdAt, startDate), lte(sales.createdAt, endDate), eq(sales.status, "completed"))
  );

  const [productStats] = await db.select({
    count: sql<number>`count(*)::int`,
  }).from(products);

  const [totalCustomers] = await db.select({
    count: sql<number>`count(*)::int`,
  }).from(customers);

  // ต้นทุนสินค้าที่ขาย (COGS) ในช่วงเวลา
  const [cogsResult] = await db.select({
    total: sql<string>`COALESCE(sum(${products.costPrice}::numeric * ${saleItems.quantity}), 0)::text`,
  }).from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .innerJoin(products, eq(saleItems.productId, products.id))
    .where(and(gte(sales.createdAt, startDate), lte(sales.createdAt, endDate), eq(sales.status, "completed")));

  // ทุนสต๊อกสินค้าทั้งหมดตอนนี้
  const [stockValueResult] = await db.select({
    total: sql<string>`COALESCE(sum(${products.costPrice}::numeric * ${products.stock}), 0)::text`,
  }).from(products);

  const recentSales = await db.select().from(sales)
    .leftJoin(employees, eq(sales.employeeId, employees.id))
    .where(and(gte(sales.createdAt, startDate), lte(sales.createdAt, endDate)))
    .orderBy(desc(sales.createdAt)).limit(50);

  // น้ำหนักรวมที่ขายไปในช่วงเวลา
  const [weightResult] = await db.select({
    totalWeight: sql<number>`COALESCE(sum(${products.weight}::numeric * ${saleItems.quantity}), 0)::float`,
  }).from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .innerJoin(products, eq(saleItems.productId, products.id))
    .where(and(gte(sales.createdAt, startDate), lte(sales.createdAt, endDate), eq(sales.status, "completed")));

  // จำนวนสินค้าที่ขายไปในช่วงเวลา (รวมทุก payment method)
  const [itemsSoldResult] = await db.select({
    totalQty: sql<number>`COALESCE(sum(${saleItems.quantity}), 0)::int`,
  }).from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .where(and(gte(sales.createdAt, startDate), lte(sales.createdAt, endDate), eq(sales.status, "completed")));

  // ยอดเงินสดที่ขายในช่วงเวลา (เฉพาะ paymentMethod = 'cash')
  const [cashSalesResult] = await db.select({
    total: sql<string>`COALESCE(sum(${sales.total}::numeric), 0)::text`,
    count: sql<number>`count(*)::int`,
  }).from(sales).where(
    and(gte(sales.createdAt, startDate), lte(sales.createdAt, endDate), eq(sales.status, "completed"), eq(sales.paymentMethod, "cash"))
  );

  // ดึงราคา kg จากการตั้งค่า
  const settingsData = await db.select().from(storeSettings).limit(1);
  const kgPrice = parseFloat(settingsData[0]?.kgPrice || "0");

  return {
    todaySalesCount: periodSales?.count || 0,
    todaySalesTotal: periodSales?.total || "0",
    totalProducts: productStats?.count || 0,
    totalCustomers: totalCustomers?.count || 0,
    costOfGoodsSold: cogsResult?.total || "0",
    totalStockValue: stockValueResult?.total || "0",
    totalWeightSold: weightResult?.totalWeight || 0,
    kgPrice,
    totalWeightValue: (weightResult?.totalWeight || 0) * kgPrice,
    totalItemsSold: itemsSoldResult?.totalQty || 0,
    totalCashSales: cashSalesResult?.total || "0",
    totalCashSalesCount: cashSalesResult?.count || 0,
    recentSales,
  };
}

// ========== Stock Decrease LINE Notify (ใช้ข้อมูลตั้งแต่รีเซ็ทล่าสุด) ==========
export async function sendStockDecreaseLineNotify() {
  const { sendLineMessage } = await import("@/lib/line-notify");

  const settings = await db.select().from(storeSettings).limit(1);
  const s = settings[0];

  const isEnabled = s?.lineNotifyEnabled ?? true;
  if (!isEnabled) return { success: false, message: "LINE แจ้งเตือนถูกปิดอยู่" };

  const channelToken = s?.lineChannelToken || process.env.LINE_CHANNEL_TOKEN;
  if (!channelToken) return { success: false, message: "ไม่พบ LINE Channel Token" };

  const ownerUserId = s?.lineUserId || process.env.LINE_USER_ID;
  if (!ownerUserId) return { success: false, message: "ไม่พบ LINE User ID ของผู้ดูแล" };

  // ใช้ข้อมูลตั้งแต่รีเซ็ทล่าสุดถึงปัจจุบัน
  const soldItems = await getStockDecreaseItemsSinceReset();

  if (soldItems.length === 0) return { success: false, message: "ไม่มีรายการสินค้าที่สต๊อกลดตั้งแต่รีเซ็ทล่าสุด" };

  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  const dateStr = now.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
  const lastReset = s?.lastStockResetAt;
  const resetStr = lastReset ? new Date(lastReset).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" }) : "ไม่เคยรีเซ็ท";

  let msg = `📦 แจ้งเตือนสต๊อกลด\n📅 ${dateStr}\n🔄 ตั้งแต่รีเซ็ท: ${resetStr}\n`;
  msg += `━━━━━━━━━━━━━━━\n`;

  soldItems.forEach((item, idx) => {
    const name = [item.brand, item.productName, item.model].filter(Boolean).join(" / ");
    const terminal = item.batteryTerminal ? ` (${item.batteryTerminal})` : "";
    msg += `${idx + 1}. ${name}${terminal}\n   จำนวนที่ต้องสั่ง: ${item.totalQty}\n`;
  });

  msg += `━━━━━━━━━━━━━━━\n`;
  msg += `รวม ${soldItems.length} รายการ`;

  try {
    await sendLineMessage(channelToken, ownerUserId, msg);
    return { success: true, message: `ส่งแจ้งเตือนสำเร็จ (${soldItems.length} รายการ)` };
  } catch (error) {
    console.error("LINE stock alert error:", error);
    return { success: false, message: "ส่งแจ้งเตือนล้มเหลว" };
  }
}

// ========== Stock Decrease Since Reset (ไม่ต้องกำหนดวันที่) ==========
export async function getStockDecreaseItemsSinceReset() {
  const settingsArr = await db.select().from(storeSettings).limit(1);
  const lastReset = settingsArr[0]?.lastStockResetAt;

  // เริ่มนับจาก lastStockResetAt ถึงปัจจุบัน ถ้าไม่เคยรีเซ็ทให้เริ่มจาก 1 ปีก่อน
  const startDate = lastReset ? new Date(lastReset) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  const soldItems = await db.select({
    productId: products.id,
    productName: products.name,
    brand: products.brand,
    model: products.model,
    batteryTerminal: products.batteryTerminal,
    currentStock: products.stock,
    totalQty: sql<number>`sum(${saleItems.quantity})::int`,
  }).from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .innerJoin(products, eq(saleItems.productId, products.id))
    .where(and(gte(sales.createdAt, startDate), lte(sales.createdAt, endDate), eq(sales.status, "completed")))
    .groupBy(products.id, products.name, products.brand, products.model, products.batteryTerminal, products.stock);

  return soldItems;
}

// ========== Stock Reset ==========
export async function getStockDecreaseItems(dateFrom: string, dateTo: string) {
  const startDate = new Date(dateFrom);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(dateTo);
  endDate.setHours(23, 59, 59, 999);

  // ดึง lastStockResetAt เพื่อกรองเฉพาะ sales ที่เกิดหลังรีเซ็ทล่าสุด
  const settingsArr = await db.select().from(storeSettings).limit(1);
  const lastReset = settingsArr[0]?.lastStockResetAt;

  // ถ้ารีเซ็ทแล้ว ให้เริ่มนับจาก lastReset หรือ startDate แล้วแต่อันไหนทีหลัง
  const effectiveStart = lastReset && new Date(lastReset) > startDate ? new Date(lastReset) : startDate;

  const soldItems = await db.select({
    productId: products.id,
    productName: products.name,
    brand: products.brand,
    model: products.model,
    batteryTerminal: products.batteryTerminal,
    currentStock: products.stock,
    totalQty: sql<number>`sum(${saleItems.quantity})::int`,
  }).from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .innerJoin(products, eq(saleItems.productId, products.id))
    .where(and(gte(sales.createdAt, effectiveStart), lte(sales.createdAt, endDate), eq(sales.status, "completed")))
    .groupBy(products.id, products.name, products.brand, products.model, products.batteryTerminal, products.stock);

  return soldItems;
}

export async function resetStockFromSales() {
  await requireAuth();
  const items = await getStockDecreaseItemsSinceReset();
  if (items.length === 0) return { success: false, message: "ไม่มีรายการสินค้าที่ต้องรีเซ็ท" };

  let resetCount = 0;
  for (const item of items) {
    await db.update(products).set({
      stock: sql`${products.stock} + ${item.totalQty}`,
    }).where(eq(products.id, item.productId));
    resetCount++;
  }

  // บันทึกวันเวลารีเซ็ทล่าสุด
  const now = new Date();
  await db.update(storeSettings).set({ lastStockResetAt: now }).where(eq(storeSettings.id, 1));

  revalidatePath("/products");
  revalidatePath("/dashboard");
  revalidatePath("/pos");

  return { success: true, message: `รีเซ็ทสต๊อกสำเร็จ ${resetCount} รายการ (เติมสต๊อกกลับแล้ว)`, resetAt: now.toISOString() };
}

// ========== SMS Templates ==========
export async function getSmsTemplates() {
  return db.select().from(smsTemplates).orderBy(smsTemplates.durationMonths);
}

export async function createSmsTemplate(data: {
  name: string; message: string; durationMonths: number;
}) {
  await db.insert(smsTemplates).values({
    name: data.name,
    message: data.message,
    durationMonths: data.durationMonths,
  });
  revalidatePath("/sms-reminders");
}

export async function updateSmsTemplate(id: number, data: {
  name?: string; message?: string; durationMonths?: number; active?: boolean;
}) {
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.message !== undefined) updateData.message = data.message;
  if (data.durationMonths !== undefined) updateData.durationMonths = data.durationMonths;
  if (data.active !== undefined) updateData.active = data.active;
  await db.update(smsTemplates).set(updateData).where(eq(smsTemplates.id, id));
  revalidatePath("/sms-reminders");
}

export async function deleteSmsTemplate(id: number) {
  await db.delete(smsTemplates).where(eq(smsTemplates.id, id));
  revalidatePath("/sms-reminders");
}

// ========== SMS Reminders ==========
export async function getSmsReminders(filter?: "pending" | "sent" | "all") {
  if (filter === "sent") {
    return db.select().from(smsReminders).where(eq(smsReminders.status, "sent")).orderBy(desc(smsReminders.scheduledDate));
  } else if (filter === "pending") {
    return db.select().from(smsReminders).where(eq(smsReminders.status, "pending")).orderBy(smsReminders.scheduledDate);
  }
  return db.select().from(smsReminders).orderBy(desc(smsReminders.scheduledDate));
}

export async function createSmsReminder(data: {
  customerId?: number; saleId?: number; templateId?: number;
  customerName?: string; phone: string; message: string;
  productInfo?: string; scheduledDate: string;
}) {
  await db.insert(smsReminders).values({
    customerId: data.customerId || undefined,
    saleId: data.saleId || undefined,
    templateId: data.templateId || undefined,
    customerName: data.customerName || undefined,
    phone: data.phone,
    message: data.message,
    productInfo: data.productInfo || undefined,
    scheduledDate: new Date(data.scheduledDate),
  });
  revalidatePath("/sms-reminders");
  return { success: true };
}

export async function updateSmsReminder(id: number, data: {
  phone?: string; message?: string; productInfo?: string;
  scheduledDate?: string; status?: string;
}) {
  const updateData: Record<string, unknown> = {};
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.message !== undefined) updateData.message = data.message;
  if (data.productInfo !== undefined) updateData.productInfo = data.productInfo;
  if (data.scheduledDate !== undefined) updateData.scheduledDate = new Date(data.scheduledDate);
  if (data.status !== undefined) updateData.status = data.status;
  await db.update(smsReminders).set(updateData).where(eq(smsReminders.id, id));
  revalidatePath("/sms-reminders");
}

export async function deleteSmsReminder(id: number) {
  await db.delete(smsReminders).where(eq(smsReminders.id, id));
  revalidatePath("/sms-reminders");
}

// สร้าง SMS Reminder อัตโนมัติจากการขาย
export async function createAutoSmsReminder(saleId: number, customerId: number, productInfo: string) {
  // ดึงข้อมูลลูกค้า
  const customerData = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
  if (!customerData[0] || !customerData[0].phone) return;
  const customer = customerData[0];

  // ดึง template ที่ active
  const templates = await db.select().from(smsTemplates).where(eq(smsTemplates.active, true));

  // ดึงข้อมูลร้าน
  const settings = await db.select().from(storeSettings).limit(1);
  const shopPhone = settings[0]?.phone || "";

  for (const template of templates) {
    // คำนวณวันที่ส่ง
    const scheduledDate = new Date();
    scheduledDate.setMonth(scheduledDate.getMonth() + template.durationMonths);

    // แทนที่ตัวแปรในเทมเพลต
    let msg = template.message;
    msg = msg.replace(/\{\{name\}\}/g, customer.name || "ลูกค้า");
    msg = msg.replace(/\{\{phone\}\}/g, customer.phone || "");
    msg = msg.replace(/\{\{product\}\}/g, productInfo || "แบตเตอรี่");
    msg = msg.replace(/\{\{shopPhone\}\}/g, shopPhone);
    msg = msg.replace(/\{\{date\}\}/g, scheduledDate.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" }));

    await db.insert(smsReminders).values({
      customerId: customer.id,
      saleId,
      templateId: template.id,
      customerName: customer.name,
      phone: customer.phone!, // checked above: !customerData[0].phone returns early
      message: msg,
      productInfo: productInfo || undefined,
      scheduledDate,
    });
  }
  revalidatePath("/sms-reminders");
}

// ========== SMS ส่งให้พนักงาน (POS - ทุก role ใช้ได้) ==========
export async function sendSmsToEmployee(data: {
  employeeId: number;
  phone: string;
  message: string;
  saleId?: number;
  billNumber?: string;
}) {
  try {
    await requireAuth();

    const empData = await db.select({
      id: employees.id,
      name: employees.name,
      phone: employees.phone,
    }).from(employees).where(eq(employees.id, data.employeeId)).limit(1);

    if (!empData[0]) {
      return { success: false, error: "ไม่พบพนักงาน" };
    }

    const emp = empData[0];
    const phone = data.phone || emp.phone;
    if (!phone) {
      return { success: false, error: "ไม่มีเบอร์โทรพนักงาน" };
    }

    // ส่ง SMS ผ่าน ThaiBulkSMS (อ่าน config จากไฟล์ .env โดยตรง)
    const smsConf = getSmsConfig();
    const { sendSmsThaiBulk } = await import("@/lib/thaibulksms");
    const smsResult = await sendSmsThaiBulk(phone, data.message, smsConf.sender || undefined, {
      apiKey: smsConf.apiKey,
      apiSecret: smsConf.apiSecret,
    });

    // บันทึก log
    await db.insert(employeeSmsLogs).values({
      employeeId: emp.id,
      employeeName: emp.name,
      phone: phone,
      message: data.message,
      status: smsResult.success ? "sent" : "failed",
      sentAt: new Date(),
    });

    revalidatePath("/sms-reminders");

    if (!smsResult.success) {
      return { success: false, error: smsResult.error || "ส่ง SMS ไม่สำเร็จ" };
    }

    return { success: true, employeeName: emp.name, phone };
  } catch (err: any) {
    console.error("[sendSmsToEmployee] Error:", err?.message || err);
    return { success: false, error: err?.message || "เกิดข้อผิดพลาดในระบบ" };
  }
}

// ========== SMS ส่งให้พนักงาน (Admin - batch) ==========
export async function sendSmsToEmployees(data: {
  employeeIds: number[];
  message: string;
}) {
  await requireAdmin();
  const results: { employeeId: number; name: string; phone: string; success: boolean; error?: string }[] = [];

  for (const empId of data.employeeIds) {
    const empData = await db.select({
      id: employees.id,
      name: employees.name,
      phone: employees.phone,
    }).from(employees).where(eq(employees.id, empId)).limit(1);

    if (!empData[0] || !empData[0].phone) {
      results.push({ employeeId: empId, name: empData[0]?.name || "ไม่พบ", phone: "", success: false, error: "ไม่มีเบอร์โทร" });
      continue;
    }

    const emp = empData[0];

    // บันทึก log
    await db.insert(employeeSmsLogs).values({
      employeeId: emp.id,
      employeeName: emp.name,
      phone: emp.phone!,
      message: data.message,
      status: "sent",
      sentAt: new Date(),
    });

    results.push({ employeeId: emp.id, name: emp.name, phone: emp.phone!, success: true });
  }

  revalidatePath("/sms-reminders");
  return { success: true, results };
}

export async function getEmployeeSmsLogs() {
  return db.select().from(employeeSmsLogs).orderBy(desc(employeeSmsLogs.createdAt));
}

export async function deleteEmployeeSmsLog(id: number) {
  await db.delete(employeeSmsLogs).where(eq(employeeSmsLogs.id, id));
  revalidatePath("/sms-reminders");
}

// ========== SMS Credit Check ==========
export async function getSmsCredit() {
  await requireAuth();
  const smsConf = getSmsConfig();
  const { checkCreditThaiBulk } = await import("@/lib/thaibulksms");
  return checkCreditThaiBulk({ apiKey: smsConf.apiKey, apiSecret: smsConf.apiSecret });
}

// ========== Job Applications (ผู้สมัครงาน) ==========
export async function getJobApplications() {
  await requireAuth();
  return db.select().from(jobApplications).orderBy(desc(jobApplications.appliedAt));
}

export async function createJobApplication(data: { name: string; phone?: string; position?: string; note?: string; appliedAt?: string }) {
  await requireAdmin();
  await db.insert(jobApplications).values({
    name: data.name,
    phone: data.phone || null,
    position: data.position || null,
    note: data.note || null,
    appliedAt: data.appliedAt ? new Date(data.appliedAt) : new Date(),
  });
  revalidatePath("/employees");
}

export async function updateJobApplication(id: number, data: { name?: string; phone?: string; position?: string; status?: string; note?: string }) {
  await requireAdmin();
  await db.update(jobApplications).set({
    ...(data.name !== undefined && { name: data.name }),
    ...(data.phone !== undefined && { phone: data.phone || null }),
    ...(data.position !== undefined && { position: data.position || null }),
    ...(data.status !== undefined && { status: data.status }),
    ...(data.note !== undefined && { note: data.note || null }),
  }).where(eq(jobApplications.id, id));
  revalidatePath("/employees");
}

export async function deleteJobApplication(id: number) {
  await requireAdmin();
  await db.delete(jobApplications).where(eq(jobApplications.id, id));
  revalidatePath("/employees");
}

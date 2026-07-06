import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  numeric,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ==================== ตั้งค่าร้าน ====================
export const storeSettings = pgTable("store_settings", {
  id: serial("id").primaryKey(),
  storeName: varchar("store_name", { length: 255 }).notNull().default("ร้านแบตเตอรี่"),
  branchName: varchar("branch_name", { length: 255 }),
  address: text("address"),
  phone: varchar("phone", { length: 50 }),
  taxId: varchar("tax_id", { length: 20 }),
  storeLogo: text("store_logo"), // URL โลโก้ร้าน (Cloudinary)
  lineNotifyToken: varchar("line_notify_token", { length: 255 }), // (เดิม LINE Notify - deprecated)
  lineChannelToken: varchar("line_channel_token", { length: 500 }), // LINE Messaging API Channel Access Token
  lineUserId: varchar("line_user_id", { length: 255 }), // LINE User ID หรือ Group ID สำหรับส่งข้อความ
  lineNotifyEnabled: boolean("line_notify_enabled").notNull().default(true), // เปิดใช้งานการแจ้งเตือน LINE
  // LINE per-sale notification preferences (แจ้งเตือนทุกครั้งที่ขาย)
  lineSaleProducts: boolean("line_sale_products").notNull().default(true), // แสดงชื่อสินค้า/รุ่น
  lineSaleQuantity: boolean("line_sale_quantity").notNull().default(true), // แสดงจำนวนชิ้น
  lineSalePrice: boolean("line_sale_price").notNull().default(true), // แสดงราคา
  // LINE daily report preferences (สรุปรายวัน)
  lineReportSales: boolean("line_report_sales").notNull().default(true), // แสดงยอดขายรวม
  lineReportQuantity: boolean("line_report_quantity").notNull().default(true), // แสดงจำนวนชิ้น
  lineReportProducts: boolean("line_report_products").notNull().default(true), // แสดงชื่อสินค้า
  lineReportModel: boolean("line_report_model").notNull().default(true), // แสดงชื่อรุ่น (brand/model)
  lineReportTime: varchar("line_report_time", { length: 255 }).default("18:00"), // เวลาส่งอัตโนมัติ เช่น "08:00,12:00,18:00" (เวลาไทย)
  lineReportEnabled: boolean("line_report_enabled").notNull().default(false), // เปิดใช้งานส่งอัตโนมัติ
  // Inventory settings
  lowStockThreshold: integer("low_stock_threshold").notNull().default(1), // จำนวนสินค้าที่ถือว่าใกล้หมด
  lowStockAlertEnabled: boolean("low_stock_alert_enabled").notNull().default(true), // เปิดใช้งานการแจ้งเตือนสินค้าใกล้หมด
  outOfStockAlertEnabled: boolean("out_of_stock_alert_enabled").notNull().default(true), // เปิดใช้งานการแจ้งเตือนสินค้าหมดสต๊อก
  newSaleAlertEnabled: boolean("new_sale_alert_enabled").notNull().default(true), // เปิดใช้งานการแจ้งเตือนคำสั่งซื้อใหม่
  kgPrice: numeric("kg_price", { precision: 10, scale: 2 }).default("0"), // ราคาต่อ kg (บาท/kg)
  lastStockResetAt: timestamp("last_stock_reset_at"), // วันเวลาที่รีเซ็ทสต๊อกล่าสุด
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==================== พนักงาน ====================
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 20 }).notNull().default("cashier"), // admin | cashier | service
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  profileImage: text("profile_image"), // URL รูปโปรไฟล์
  idCardImage: text("id_card_image"), // URL รูปบัตรประชาชน
  lineUserId: varchar("line_user_id", { length: 255 }), // LINE User ID สำหรับรับข้อความส่วนตัว
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==================== หมวดหมู่ ====================
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==================== สินค้า ====================
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  brand: varchar("brand", { length: 100 }),
  model: varchar("model", { length: 100 }),
  size: varchar("size", { length: 50 }), // e.g. "60Ah", "80Ah"
  batteryTerminal: varchar("battery_terminal", { length: 50 }), // e.g. "JIS", "DIN", "L-Type"
  weight: numeric("weight", { precision: 8, scale: 3 }), // น้ำหนักสินค้า (kg) - 3 ตำแหน่งทศนิยม
  costPrice: numeric("cost_price", { precision: 10, scale: 2 }).notNull(),
  sellPrice: numeric("sell_price", { precision: 10, scale: 2 }).notNull(),
  stock: integer("stock").notNull().default(0),
  categoryId: integer("category_id").references(() => categories.id),
  warranty: varchar("warranty", { length: 100 }), // e.g. "12 เดือน"
  imageUrl: text("image_url"), // ภาพหลัก
  images: text("images"), // JSON array ของภาพทั้งหมด [{publicId, url}]
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==================== ลูกค้า ====================
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  licensePlate: varchar("license_plate", { length: 20 }),
  address: text("address"),
  taxId: varchar("tax_id", { length: 20 }), // เลขประจำตัวผู้เสียภาษี
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==================== บิลขาย ====================
export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  billNumber: varchar("bill_number", { length: 50 }).notNull().unique(),
  taxInvoiceNumber: varchar("tax_invoice_number", { length: 20 }), // เลขที่ใบกำกับภาษี (เรียงต่อเนื่อง)
  employeeId: integer("employee_id")
    .references(() => employees.id)
    .notNull(),
  customerId: integer("customer_id").references(() => customers.id),
  // ข้อมูลผู้ซื้อสำหรับใบกำกับภาษี
  buyerName: varchar("buyer_name", { length: 255 }),
  buyerPhone: varchar("buyer_phone", { length: 50 }),
  buyerAddress: text("buyer_address"),
  buyerTaxId: varchar("buyer_tax_id", { length: 20 }),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  serviceFee: numeric("service_fee", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  serviceDescription: text("service_description"),
  discount: numeric("discount", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  vatType: varchar("vat_type", { length: 10 }).notNull().default("vat_out"), // vat_in = ราคานี้รวมภาษีแล้ว, vat_out = ราคานี้ยังไม่รวมภาษี
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).notNull().default("7"), // อัตราภาษี % (เช่น 7)
  taxAmount: numeric("tax_amount", { precision: 10, scale: 2 }).notNull().default("0"), // จำนวนเงินภาษี
  isTaxInvoice: boolean("is_tax_invoice").notNull().default(false), // เป็นใบกำกับภาษีหรือไม่
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 20 }).notNull(), // cash | transfer | credit
  status: varchar("status", { length: 20 }).notNull().default("completed"), // completed | cancelled
  printed: boolean("printed").notNull().default(false), // พิมพ์แล้วหรือยัง
  printedAt: timestamp("printed_at"), // วันเวลาที่พิมพ์
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==================== รายการสินค้าในบิล ====================
export const saleItems = pgTable("sale_items", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id")
    .references(() => sales.id, { onDelete: "cascade" })
    .notNull(),
  productId: integer("product_id")
    .references(() => products.id)
    .notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  discount: numeric("discount", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
});

// ==================== ใบเสนอราคา ====================
export const quotations = pgTable("quotations", {
  id: serial("id").primaryKey(),
  quotationNumber: varchar("quotation_number", { length: 50 }).notNull().unique(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  customerId: integer("customer_id").references(() => customers.id),
  buyerName: varchar("buyer_name", { length: 255 }),
  buyerPhone: varchar("buyer_phone", { length: 50 }),
  buyerAddress: text("buyer_address"),
  buyerTaxId: varchar("buyer_tax_id", { length: 20 }),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  serviceFee: numeric("service_fee", { precision: 10, scale: 2 }).notNull().default("0"),
  serviceDescription: text("service_description"),
  discount: numeric("discount", { precision: 10, scale: 2 }).notNull().default("0"),
  vatType: varchar("vat_type", { length: 10 }).notNull().default("vat_out"),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).notNull().default("7"),
  taxAmount: numeric("tax_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  includeVat: boolean("include_vat").notNull().default(false),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  validDays: integer("valid_days").notNull().default(30),
  status: varchar("status", { length: 20 }).notNull().default("draft"), // draft | sent | accepted | rejected | expired | converted
  printed: boolean("printed").notNull().default(false), // พิมพ์แล้วหรือยัง
  printedAt: timestamp("printed_at"), // วันเวลาที่พิมพ์
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const quotationItems = pgTable("quotation_items", {
  id: serial("id").primaryKey(),
  quotationId: integer("quotation_id").references(() => quotations.id, { onDelete: "cascade" }).notNull(),
  productId: integer("product_id").references(() => products.id),
  description: varchar("description", { length: 500 }),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  discount: numeric("discount", { precision: 10, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
});

// ==================== SMS แจ้งเตือนลูกค้า ====================
export const smsTemplates = pgTable("sms_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(), // ชื่อเทมเพลต เช่น "แจ้งเตือนเปลี่ยนแบต 18 เดือน"
  message: text("message").notNull(), // ข้อความ SMS (รองรับ {{name}}, {{phone}}, {{product}}, {{date}})
  durationMonths: integer("duration_months").notNull().default(18), // ระยะเวลาล่วงหน้า (เดือน)
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const smsReminders = pgTable("sms_reminders", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id),
  saleId: integer("sale_id").references(() => sales.id),
  templateId: integer("template_id").references(() => smsTemplates.id),
  customerName: varchar("customer_name", { length: 255 }),
  phone: varchar("phone", { length: 20 }).notNull(), // เบอร์โทรลูกค้า
  message: text("message").notNull(), // ข้อความที่จะส่ง (แก้ไขได้)
  productInfo: varchar("product_info", { length: 500 }), // ข้อมูลสินค้า
  scheduledDate: timestamp("scheduled_date").notNull(), // วันที่จะส่ง
  sentAt: timestamp("sent_at"), // วันที่ส่งจริง (null = ยังไม่ส่ง)
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | sent | failed | cancelled
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==================== SMS ส่งให้พนักงาน ====================
export const employeeSmsLogs = pgTable("employee_sms_logs", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id),
  employeeName: varchar("employee_name", { length: 255 }),
  phone: varchar("phone", { length: 20 }).notNull(),
  message: text("message").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | sent | failed
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==================== ผู้สมัครงาน ====================
export const jobApplications = pgTable("job_applications", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(), // ชื่อผู้สมัคร
  phone: varchar("phone", { length: 20 }), // เบอร์โทร
  position: varchar("position", { length: 100 }), // ตำแหน่งที่สมัคร
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | interviewed | accepted | rejected
  note: text("note"), // หมายเหตุ
  appliedAt: timestamp("applied_at").defaultNow().notNull(), // วันที่สมัคร
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==================== LINE Channels (หลาย OA) ====================
export const lineChannels = pgTable("line_channels", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(), // ชื่อแสดง เช่น "FIRSTBATTERY Official"
  channelId: varchar("channel_id", { length: 255 }).notNull().unique(), // LINE Channel ID
  channelSecret: text("channel_secret").notNull(), // LINE Channel Secret
  channelAccessToken: text("channel_access_token").notNull(), // LINE Channel Access Token (Long-lived)
  webhookPath: varchar("webhook_path", { length: 255 }).notNull().unique(), // เช่น "/api/line-webhook/firstbattery"
  pictureUrl: text("picture_url"), // รูปโปรไฟล์ OA
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==================== Relations ====================
export const employeesRelations = relations(employees, ({ many }) => ({
  sales: many(sales),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  saleItems: many(saleItems),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  sales: many(sales),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  employee: one(employees, {
    fields: [sales.employeeId],
    references: [employees.id],
  }),
  customer: one(customers, {
    fields: [sales.customerId],
    references: [customers.id],
  }),
  items: many(saleItems),
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, {
    fields: [saleItems.saleId],
    references: [sales.id],
  }),
  product: one(products, {
    fields: [saleItems.productId],
    references: [products.id],
  }),
}));

export const quotationsRelations = relations(quotations, ({ one, many }) => ({
  employee: one(employees, {
    fields: [quotations.employeeId],
    references: [employees.id],
  }),
  customer: one(customers, {
    fields: [quotations.customerId],
    references: [customers.id],
  }),
  items: many(quotationItems),
}));

export const quotationItemsRelations = relations(quotationItems, ({ one }) => ({
  quotation: one(quotations, {
    fields: [quotationItems.quotationId],
    references: [quotations.id],
  }),
  product: one(products, {
    fields: [quotationItems.productId],
    references: [products.id],
  }),
}));

// ==================== Types ====================
export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type Sale = typeof sales.$inferSelect;
export type NewSale = typeof sales.$inferInsert;
export type SaleItem = typeof saleItems.$inferSelect;
export type NewSaleItem = typeof saleItems.$inferInsert;
export type Quotation = typeof quotations.$inferSelect;
export type NewQuotation = typeof quotations.$inferInsert;
export type QuotationItem = typeof quotationItems.$inferSelect;
export type NewQuotationItem = typeof quotationItems.$inferInsert;
export type SmsTemplate = typeof smsTemplates.$inferSelect;
export type NewSmsTemplate = typeof smsTemplates.$inferInsert;
export type SmsReminder = typeof smsReminders.$inferSelect;
export type NewSmsReminder = typeof smsReminders.$inferInsert;
export type EmployeeSmsLog = typeof employeeSmsLogs.$inferSelect;
export type NewEmployeeSmsLog = typeof employeeSmsLogs.$inferInsert;
export type JobApplication = typeof jobApplications.$inferSelect;
export type NewJobApplication = typeof jobApplications.$inferInsert;

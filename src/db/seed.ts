import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { employees, categories, products, customers } from "./schema";
import bcrypt from "bcryptjs";

const DATABASE_URL = process.env.DATABASE_URL!;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set");
  process.exit(1);
}

const sql = neon(DATABASE_URL);
const db = drizzle(sql);

async function seed() {
  console.log("🌱 Seeding database...");

  // 1. Seed employees
  const adminPassword = await bcrypt.hash("admin123", 10);
  const cashierPassword = await bcrypt.hash("cashier123", 10);

  await db.insert(employees).values([
    { name: "ผู้ดูแลระบบ", username: "admin", passwordHash: adminPassword, role: "admin" },
    { name: "พนักงาน 1", username: "cashier1", passwordHash: cashierPassword, role: "cashier" },
  ]).onConflictDoNothing();
  console.log("✅ Employees seeded");

  // 2. Seed categories
  await db.insert(categories).values([
    { name: "แบตเตอรี่รถยนต์", description: "แบตเตอรี่สำหรับรถยนต์ทั่วไป" },
    { name: "แบตเตอรี่รถกระบะ", description: "แบตเตอรี่สำหรับรถกระบะ" },
    { name: "แบตเตอรี่รถบรรทุก", description: "แบตเตอรี่สำหรับรถบรรทุก" },
    { name: "แบตเตอรี่มอเตอร์ไซค์", description: "แบตเตอรี่สำหรับมอเตอร์ไซค์" },
    { name: "อุปกรณ์เสริม", description: "อุปกรณ์เสริมสำหรับแบตเตอรี่" },
  ]).onConflictDoNothing();
  console.log("✅ Categories seeded");

  // 3. Seed products
  await db.insert(products).values([
    { name: "FB Gold 60Ah", brand: "FB", model: "Gold", size: "60Ah", costPrice: "2200.00", sellPrice: "2800.00", stock: 15, categoryId: 1, warranty: "18 เดือน" },
    { name: "FB Gold 75Ah", brand: "FB", model: "Gold", size: "75Ah", costPrice: "2800.00", sellPrice: "3500.00", stock: 10, categoryId: 1, warranty: "18 เดือน" },
    { name: "FB Premium Gold 80Ah", brand: "FB", model: "Premium Gold", size: "80Ah", costPrice: "3500.00", sellPrice: "4200.00", stock: 8, categoryId: 2, warranty: "24 เดือน" },
    { name: "3K Silver 60Ah", brand: "3K", model: "Silver", size: "60Ah", costPrice: "1800.00", sellPrice: "2400.00", stock: 20, categoryId: 1, warranty: "12 เดือน" },
    { name: "3K Silver 75Ah", brand: "3K", model: "Silver", size: "75Ah", costPrice: "2300.00", sellPrice: "2900.00", stock: 12, categoryId: 1, warranty: "12 เดือน" },
    { name: "GS Maintenance Free 80Ah", brand: "GS", model: "MF", size: "80Ah", costPrice: "2600.00", sellPrice: "3200.00", stock: 5, categoryId: 2, warranty: "15 เดือน" },
    { name: "Panasonic Caos 100D26L", brand: "Panasonic", model: "Caos", size: "100D26L", costPrice: "3800.00", sellPrice: "4800.00", stock: 3, categoryId: 2, warranty: "24 เดือน" },
    { name: "Yuasa YTX5L-BS", brand: "Yuasa", model: "YTX5L-BS", size: "5Ah", costPrice: "450.00", sellPrice: "650.00", stock: 25, categoryId: 4, warranty: "6 เดือน" },
    { name: "FB N150", brand: "FB", model: "N150", size: "150Ah", costPrice: "4500.00", sellPrice: "5500.00", stock: 4, categoryId: 3, warranty: "12 เดือน" },
    { name: "สายพ่วงแบตเตอรี่ 500A", brand: "No Brand", model: "500A", size: null, costPrice: "250.00", sellPrice: "450.00", stock: 30, categoryId: 5, warranty: null },
  ]).onConflictDoNothing();
  console.log("✅ Products seeded");

  // 4. Seed customers
  await db.insert(customers).values([
    { name: "ลูกค้าทั่วไป", phone: null, address: null },
    { name: "อู่ช่างมิตร", phone: "081-234-5678", address: "123 ถ.สุขุมวิท" },
    { name: "บริษัท ขนส่ง ABC จำกัด", phone: "02-123-4567", address: "456 ถ.พระราม 9" },
  ]).onConflictDoNothing();
  console.log("✅ Customers seeded");

  console.log("\n🎉 Seeding complete!");
  console.log("📝 Login credentials:");
  console.log("   Admin:   admin / admin123");
  console.log("   Cashier: cashier1 / cashier123");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});

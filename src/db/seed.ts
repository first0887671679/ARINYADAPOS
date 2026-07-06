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

  // 2. Seed categories (หมวดบริการทำการตลาด)
  await db.insert(categories).values([
    { name: "Social Media Marketing", description: "การตลาดผ่านโซเชียลมีเดีย" },
    { name: "SEO", description: "การปรับแต่งเว็บไซต์ให้ติดอันดับ Google" },
    { name: "Content Creation", description: "การสร้างคอนเทนต์" },
    { name: "Graphic Design", description: "ออกแบบกราฟิก" },
    { name: "Ads Management", description: "จัดการโฆษณาออนไลน์" },
  ]).onConflictDoNothing();
  console.log("✅ Categories seeded");

  // 3. Seed products (แพ็กเกจบริการ)
  await db.insert(products).values([
    { name: "Facebook Ads Management", costPrice: "5000.00", sellPrice: "15000.00", categoryId: 5, serviceDuration: "30 วัน" },
    { name: "SEO 3 เดือน", costPrice: "8000.00", sellPrice: "25000.00", categoryId: 2, serviceDuration: "90 วัน" },
    { name: "Content Writing 10 บทความ", costPrice: "3000.00", sellPrice: "8000.00", categoryId: 3, serviceDuration: "30 วัน" },
    { name: "Logo Design", costPrice: "500.00", sellPrice: "3500.00", categoryId: 4, serviceDuration: "7 วัน" },
    { name: "Social Media Management รายเดือน", costPrice: "4000.00", sellPrice: "12000.00", categoryId: 1, serviceDuration: "30 วัน" },
    { name: "Google Ads Management", costPrice: "5000.00", sellPrice: "14000.00", categoryId: 5, serviceDuration: "30 วัน" },
    { name: "Line OA Marketing", costPrice: "3000.00", sellPrice: "9000.00", categoryId: 1, serviceDuration: "30 วัน" },
    { name: "Landing Page Design", costPrice: "2000.00", sellPrice: "6500.00", categoryId: 4, serviceDuration: "14 วัน" },
    { name: "Video Editing คลิปสั้น 10 คลิป", costPrice: "2500.00", sellPrice: "7000.00", categoryId: 3, serviceDuration: "30 วัน" },
    { name: "Influencer Marketing จัดการ 1 ครั้ง", costPrice: "5000.00", sellPrice: "18000.00", categoryId: 1, serviceDuration: "14 วัน" },
  ]).onConflictDoNothing();
  console.log("✅ Products seeded");

  // 4. Seed customers (บริษัท)
  await db.insert(customers).values([
    { name: "ลูกค้าทั่วไป", phone: null, address: null },
    { name: "บริษัท ABC จำกัด", phone: "02-123-4567", companyName: "บริษัท ABC จำกัด", industry: "ร้านอาหาร", contactPerson: "คุณสมชาย", address: "123 ถ.สุขุมวิท" },
    { name: "ร้านกาแฟ XYZ", phone: "081-234-5678", companyName: "ร้านกาแฟ XYZ", industry: "ร้านกาแฟ", contactPerson: "คุณสมหญิง", address: "456 ถ.พระราม 9" },
    { name: "บริษัท ขนส่ง มิตร จำกัด", phone: "02-987-6543", companyName: "บริษัท ขนส่ง มิตร จำกัด", industry: "ขนส่ง", contactPerson: "คุณวิชัย", address: "789 ถ.ลาดพร้าว" },
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

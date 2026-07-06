import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

// โหลด DATABASE_URL จาก .env แบบ manual
const envContent = readFileSync(".env", "utf-8");
const match = envContent.match(/^DATABASE_URL=(.+)$/m);
if (!match) {
  console.error("❌ DATABASE_URL not found in .env");
  process.exit(1);
}
const originalUrl = match[1].replace(/^['"]|['"]$/g, "");

// แก้เฉพาะ pathname โดยไม่กระทบส่วนอื่น (user, password, host)
const urlObj = new URL(originalUrl);
const dbName = urlObj.pathname.replace(/^\//, "");
urlObj.pathname = "/postgres";
const adminUrl = urlObj.toString();

console.log(`📦 Original database: ${dbName}`);
console.log(`🔧 Connecting to 'postgres' database to create new database...`);

const sql = neon(adminUrl);

const NEW_DB_NAME = "arinyadapos";

try {
  // ตรวจสอบว่า database ใหม่มีอยู่แล้วหรือไม่ (ใช้ tagged template ได้)
  const existing = await sql`SELECT datname FROM pg_database WHERE datname = ${NEW_DB_NAME}`;
  if (existing.length > 0) {
    console.log(`⚠️  Database '${NEW_DB_NAME}' already exists.`);
  } else {
    // CREATE DATABASE ไม่รองรับ parameterization ใน PostgreSQL
    // ใช้ pg (CommonJS) ผ่าน createRequire เพื่อรัน raw query
    let pgClient;
    try {
      const pg = require("pg");
      pgClient = new pg.Client({ connectionString: adminUrl });
    } catch {
      console.log("📦 Installing pg temporarily...");
      const { execSync } = require("child_process");
      execSync("npm install pg --no-save", { stdio: "inherit" });
      const pg = require("pg");
      pgClient = new pg.Client({ connectionString: adminUrl });
    }
    await pgClient.connect();
    try {
      await pgClient.query(`CREATE DATABASE "${NEW_DB_NAME}"`);
      console.log(`✅ Database '${NEW_DB_NAME}' created successfully!`);
    } catch (e) {
      if (e.code === "42P04") {
        console.log(`⚠️  Database '${NEW_DB_NAME}' already exists.`);
      } else {
        throw e;
      }
    } finally {
      await pgClient.end();
    }
  }

  // สร้าง connection string ใหม่
  const newUrlObj = new URL(originalUrl);
  newUrlObj.pathname = `/${NEW_DB_NAME}`;
  const newUrl = newUrlObj.toString();
  console.log(`\n📋 New DATABASE_URL:`);
  console.log(newUrl);
  console.log(`\n💡 อัพเดต .env ของคุณด้วย DATABASE_URL นี้`);
} catch (e) {
  console.error("❌ Error:", e.message);
  process.exit(1);
}
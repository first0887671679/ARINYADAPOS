// Script to add per-sale notification preference columns
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

// Add per-sale notification columns (ignore if already exists)
const cols = [
  { name: "line_sale_products", type: "boolean NOT NULL DEFAULT true" },
  { name: "line_sale_quantity", type: "boolean NOT NULL DEFAULT true" },
  { name: "line_sale_price", type: "boolean NOT NULL DEFAULT true" },
];

for (const col of cols) {
  try {
    await sql(`ALTER TABLE store_settings ADD COLUMN ${col.name} ${col.type}`);
    console.log(`✅ Added column ${col.name}`);
  } catch (e) {
    if (e.message?.includes("already exists")) {
      console.log(`⏭️  Column ${col.name} already exists, skipping`);
    } else {
      throw e;
    }
  }
}
console.log("✅ Migration complete");

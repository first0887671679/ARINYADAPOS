import { neon } from "@neondatabase/serverless";

// Strip quotes if present (--env-file doesn't strip them)
const dbUrl = (process.env.DATABASE_URL || "").replace(/^['"]|['"]$/g, "");
const sql = neon(dbUrl);

const queries = [
  `CREATE EXTENSION IF NOT EXISTS pg_trgm`,
  `CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops)`,
  `CREATE INDEX IF NOT EXISTS idx_products_brand_trgm ON products USING gin (brand gin_trgm_ops)`,
  `CREATE INDEX IF NOT EXISTS idx_products_model_trgm ON products USING gin (model gin_trgm_ops)`,
  `CREATE INDEX IF NOT EXISTS idx_products_active_category ON products(active, category_id)`,
  `CREATE INDEX IF NOT EXISTS idx_products_sort_name ON products(sort_order, name)`,
];

for (const q of queries) {
  try {
    await sql(q);
    console.log("✅", q);
  } catch (e) {
    console.error("❌", q, "-", e.message);
  }
}

console.log("Done! Product search indexes created.");

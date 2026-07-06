import { neon } from "@neondatabase/serverless";

const url = (process.env.DATABASE_URL || "")
  .replace(/^['"]|['"]$/g, "")
  .replace(/[&?]channel_binding=[^&]*/g, "");
const sql = neon(url);

const prods = await sql`SELECT id, name, stock FROM products WHERE name ILIKE '%test%' OR stock > 0 ORDER BY id`;
console.log("=== Products with stock > 0 or name like test ===");
prods.forEach(p => console.log(`  id=${p.id} name=${p.name} stock=${p.stock}`));

const sales = await sql`SELECT id, bill_number, status, total, created_at FROM sales ORDER BY id DESC LIMIT 10`;
console.log("\n=== Last 10 sales ===");
sales.forEach(s => console.log(`  id=${s.id} bill=${s.bill_number} status=${s.status} total=${s.total} at=${s.created_at}`));

if (sales.length > 0) {
  const items = await sql`SELECT si.sale_id, si.product_id, si.quantity, p.name, p.stock FROM sale_items si JOIN products p ON p.id = si.product_id WHERE si.sale_id = ${sales[0].id}`;
  console.log(`\n=== Items in latest sale (id=${sales[0].id}) ===`);
  items.forEach(i => console.log(`  product=${i.name} qty=${i.quantity} currentStock=${i.stock}`));
}

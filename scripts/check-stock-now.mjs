import { neon } from "@neondatabase/serverless";

const dbUrl = (process.env.DATABASE_URL || "")
  .replace(/^['"]|['"]$/g, "")
  .replace(/[&?]channel_binding=[^&]*/g, "");
const sql = neon(dbUrl);

async function main() {
  // Check Test Battery stock right now
  const [prod] = await sql("SELECT id, name, stock FROM products WHERE id = 12");
  console.log(`Test Battery (id=12): stock = ${prod.stock}`);

  // Check last 5 sales mentioning product 12
  const sales = await sql(`
    SELECT s.id, s.bill_number, s.status, si.quantity, s.created_at
    FROM sales s JOIN sale_items si ON si.sale_id = s.id
    WHERE si.product_id = 12
    ORDER BY s.id DESC LIMIT 5
  `);
  console.log("\nLast 5 sales for Test Battery:");
  for (const s of sales) {
    console.log(`  saleId=${s.id} bill=${s.bill_number} status=${s.status} qty=${s.quantity} at=${s.created_at}`);
  }

  // Count completed vs voided
  const [counts] = await sql(`
    SELECT 
      SUM(CASE WHEN s.status='completed' THEN si.quantity ELSE 0 END) as sold,
      SUM(CASE WHEN s.status='voided' THEN si.quantity ELSE 0 END) as voided
    FROM sales s JOIN sale_items si ON si.sale_id = s.id
    WHERE si.product_id = 12
  `);
  console.log(`\nTotal sold=${counts.sold} voided=${counts.voided}`);
  console.log(`Expected stock if started at 10: 10 - ${counts.sold} = ${10 - parseInt(counts.sold)}`);
  console.log(`Actual stock: ${prod.stock}`);
  
  const diff = parseInt(prod.stock) - (10 - parseInt(counts.sold));
  if (diff !== 0) {
    console.log(`\n⚠️ MISMATCH: stock is ${diff > 0 ? 'higher' : 'lower'} than expected by ${Math.abs(diff)}`);
  } else {
    console.log(`\n✅ Stock matches expected value`);
  }
}

main().catch(e => { console.error("Error:", e.message); process.exit(1); });

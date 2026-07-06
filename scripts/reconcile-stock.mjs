import { neon } from "@neondatabase/serverless";

const dbUrl = (process.env.DATABASE_URL || "")
  .replace(/^['"]|['"]$/g, "")
  .replace(/[&?]channel_binding=[^&]*/g, "");
const sql = neon(dbUrl);

async function main() {
  console.log("=== Stock Reconciliation ===\n");

  // Get all products with any sales
  const products = await sql(`
    SELECT p.id, p.name, p.stock as current_stock
    FROM products p WHERE p.active = true
    ORDER BY p.id
  `);

  // For each product, calculate expected stock from sale history
  // We need to find the "initial stock" — we can infer it from: 
  // current_stock + total_sold_completed - total_voided_restored
  // But since voided sales HAD their stock restored (by our cancel fix), 
  // the formula is: initial_stock = current_stock + completed_sold
  // HOWEVER, the problem is the fix-pending-sales script deducted stock for sales that were already completed before.
  
  // Better approach: Check each sale to see if stock was deducted properly
  // For now, let's just check which products have inconsistent stock
  
  const allSaleItems = await sql(`
    SELECT si.product_id, si.quantity, s.status, s.id as sale_id, s.bill_number
    FROM sale_items si
    JOIN sales s ON s.id = si.sale_id
    ORDER BY si.product_id, s.id
  `);

  // Group by product
  const productSales = {};
  for (const item of allSaleItems) {
    if (!productSales[item.product_id]) {
      productSales[item.product_id] = { completed: 0, voided: 0, details: [] };
    }
    if (item.status === "completed") {
      productSales[item.product_id].completed += item.quantity;
    } else if (item.status === "voided") {
      productSales[item.product_id].voided += item.quantity;
    }
    productSales[item.product_id].details.push(item);
  }

  // Show what each product should have, assuming stock was set correctly at some point
  // Let's look at what the user entered as initial stock
  // We need the ORIGINAL stock values - let's check the product creation dates
  console.log("Product ID | Name | Current Stock | Completed Sales | Voided Sales");
  console.log("-".repeat(80));

  for (const p of products) {
    const sales = productSales[p.id] || { completed: 0, voided: 0 };
    console.log(`  ${p.id} | ${p.name} | stock=${p.current_stock} | sold=${sales.completed} | voided=${sales.voided}`);
  }

  // For Test Battery specifically — we know it was set to 10 initially
  console.log("\n=== Test Battery (id=12) detailed analysis ===");
  const tbSales = productSales[12]?.details || [];
  for (const s of tbSales) {
    console.log(`  sale=${s.sale_id} bill=${s.bill_number} status=${s.status} qty=${s.quantity}`);
  }
  const tbCompleted = productSales[12]?.completed || 0;
  const tbCurrent = products.find(p => p.id === 12)?.current_stock || 0;
  console.log(`\n  Current stock: ${tbCurrent}`);
  console.log(`  Total completed sales: ${tbCompleted}`);
  console.log(`  If original was 10: expected stock = 10 - ${tbCompleted} = ${10 - tbCompleted}`);
  console.log(`  Difference: ${parseInt(tbCurrent) - (10 - tbCompleted)}`);
}

main().catch(e => { console.error("Error:", e.message); process.exit(1); });

import { neon } from "@neondatabase/serverless";

const dbUrl = (process.env.DATABASE_URL || "")
  .replace(/^['"]|['"]$/g, "")
  .replace(/[&?]channel_binding=[^&]*/g, "");
const sql = neon(dbUrl);

async function main() {
  // Reset Test Battery stock to exactly 10 for clean test
  await sql("UPDATE products SET stock = 10 WHERE id = 12");
  const [before] = await sql("SELECT stock FROM products WHERE id = 12");
  console.log(`BEFORE: Test Battery stock = ${before.stock}`);

  // Simulate EXACTLY what POST /api/pos/sale does
  console.log("\nSimulating sale of 1x Test Battery...");
  
  // 1. Insert sale
  const [emp] = await sql("SELECT id FROM employees LIMIT 1");
  const [sale] = await sql(
    "INSERT INTO sales (bill_number, employee_id, subtotal, total, payment_method, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
    [`TEST-FINAL-${Date.now()}`, emp.id, "2000.00", "2000.00", "cash", "completed"]
  );
  console.log(`Created sale id=${sale.id}`);

  // 2. Insert sale item (quantity as number, just like frontend sends)
  await sql(
    "INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total) VALUES ($1, $2, $3, $4, $5)",
    [sale.id, 12, 1, "2000.00", "2000.00"]
  );

  // 3. Deduct stock — SAME SQL as route.ts
  const [result] = await sql(
    "UPDATE products SET stock = GREATEST(stock - $1, 0) WHERE id = $2 RETURNING id, stock",
    [1, 12]
  );
  console.log(`Stock deducted: newStock = ${result.stock}`);

  // 4. Now fetch products SAME as GET /api/pos/products
  const products = await sql(
    "SELECT p.id, p.name, p.stock FROM products p WHERE p.active = true AND p.id = 12"
  );
  console.log(`\nAPI would return: stock = ${products[0].stock}`);

  // 5. Check — is the stock 9?
  const [after] = await sql("SELECT stock FROM products WHERE id = 12");
  console.log(`AFTER: Test Battery stock = ${after.stock}`);
  
  const passed = parseInt(after.stock) === 9;
  console.log(`\nTest: ${passed ? "PASS ✅ stock went from 10 to 9" : "FAIL ❌ stock did NOT change!"}`);

  // Cleanup
  await sql("DELETE FROM sale_items WHERE sale_id = $1", [sale.id]);
  await sql("DELETE FROM sales WHERE id = $1", [sale.id]);
  // Restore original stock
  await sql("UPDATE products SET stock = 10 WHERE id = 12");
  console.log("\nCleanup done, stock reset to 10");
}

main().catch(e => { console.error("Error:", e.message); process.exit(1); });

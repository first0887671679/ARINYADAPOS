import { neon } from "@neondatabase/serverless";

const url = (process.env.DATABASE_URL || "")
  .replace(/^['"]|['"]$/g, "")
  .replace(/[&?]channel_binding=[^&]*/g, "");
const sql = neon(url);

// Set Test Battery stock to 7 (distinctive number to verify fix)
const result = await sql`UPDATE products SET stock = 7 WHERE name = 'Test Battery' RETURNING id, name, stock`;
console.log("Updated:", result);

// Also show all products stock
const all = await sql`SELECT id, name, stock FROM products WHERE active = true ORDER BY id`;
console.log("\nAll active products:");
all.forEach(p => console.log(`  id=${p.id} ${p.name}: stock=${p.stock}`));

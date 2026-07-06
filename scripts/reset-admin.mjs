import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

// Check if admin user exists
const res = await sql("SELECT id, username, name, role, active FROM employees WHERE username = 'admin'");

if (res.length === 0) {
  console.log("❌ User 'admin' not found. Creating...");
  const hash = await bcrypt.hash("admin123", 10);
  await sql(
    "INSERT INTO employees (username, password_hash, name, role, active) VALUES ($1, $2, $3, $4, $5)",
    ["admin", hash, "Admin", "admin", true]
  );
  console.log("✅ Created user 'admin' with password 'admin123'");
} else {
  const user = res[0];
  console.log("Found user:", user);

  // Reset password
  const hash = await bcrypt.hash("admin123", 10);
  await sql("UPDATE employees SET password_hash = $1, active = true WHERE username = 'admin'", [hash]);
  console.log("✅ Password reset to 'admin123' and user set to active");
}

console.log("Done!");

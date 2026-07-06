import { neon } from "@neondatabase/serverless";

const url = (process.env.DATABASE_URL || "").replace(/^['"]|['"]$/g, "");
if (!url) {
  console.error("❌ DATABASE_URL not set");
  process.exit(1);
}

const sql = neon(url);

try {
  const res = await sql`SELECT current_database() as db, current_user as user, version() as v`;
  console.log("✅ Connection OK");
  console.log("Database:", res[0].db);
  console.log("User:", res[0].user);
  console.log("Version:", res[0].v);

  // List all databases
  const dbs = await sql`SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname`;
  console.log("\nAll databases:");
  dbs.forEach((d) => console.log("  -", d.datname));

  // List tables in current database
  const tables = await sql`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `;
  console.log("\nTables in current database (public schema):");
  if (tables.length === 0) {
    console.log("  (none)");
  } else {
    tables.forEach((t) => console.log("  -", t.tablename));
  }
} catch (e) {
  console.error("❌ Error:", e.message);
  process.exit(1);
}
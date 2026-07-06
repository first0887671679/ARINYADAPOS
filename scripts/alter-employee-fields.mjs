import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

// Add new columns to employees table
const queries = [
  `ALTER TABLE employees ADD COLUMN IF NOT EXISTS address TEXT`,
  `ALTER TABLE employees ADD COLUMN IF NOT EXISTS profile_image TEXT`,
  `ALTER TABLE employees ADD COLUMN IF NOT EXISTS id_card_image TEXT`,
];

for (const q of queries) {
  await sql(q);
  console.log("✅", q);
}

console.log("Done! All employee columns added.");

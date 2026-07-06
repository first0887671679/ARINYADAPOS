import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config();

const sql = neon(process.env.DATABASE_URL);

const res = await sql("SELECT id, username, name, role, active FROM employees WHERE username = $1", ["first"]);

console.log("User 'first' data:", res);

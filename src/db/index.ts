import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Strip unsupported params (channel_binding) and any wrapping quotes
const dbUrl = (process.env.DATABASE_URL || "")
  .replace(/^['"]|['"]$/g, "")
  .replace(/[&?]channel_binding=[^&]*/g, "");

const sql = neon(dbUrl);
export const db = drizzle(sql, { schema });

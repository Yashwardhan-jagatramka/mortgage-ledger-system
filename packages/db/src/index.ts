import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.js";

import {
  eq,
  and,
  or,
  ilike,
  sql,
  inArray,
  desc,
  asc,
} from "drizzle-orm";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgres://postgres:postgres@localhost:5432/mortgage_ai",
});

export const db = drizzle(pool, { schema });

/**
 * Export schema
 */
export * from "./schema.js";

/**
 * Export query helpers
 * So backend apps can import everything from "@mortgage/db"
 */
export {
  eq,
  and,
  or,
  ilike,
  sql,
  inArray,
  desc,
  asc,
};

export type DB = typeof db;
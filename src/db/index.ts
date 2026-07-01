import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";

import * as schema from "@/db/schema";

type Database = NeonHttpDatabase<typeof schema>;

let cachedDb: Database | null = null;

export function getDb() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!cachedDb) {
    const sql = neon(databaseUrl);
    cachedDb = drizzle(sql, { schema });
  }

  return cachedDb;
}

export function canUseDb() {
  return Boolean(process.env.DATABASE_URL);
}

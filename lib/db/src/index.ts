import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import { loadWorkspaceEnv, postgresSsl } from "./env";

loadWorkspaceEnv();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. For Supabase, paste the Session pooler URI from Project Settings → Database.",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: postgresSsl(process.env.DATABASE_URL),
  max: 10,
});

export const db = drizzle(pool, { schema });

export * from "./schema";

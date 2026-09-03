import { defineConfig } from "drizzle-kit";
import { loadWorkspaceEnv, postgresSsl } from "./src/env";

loadWorkspaceEnv();

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Paste your Supabase Session pooler URI into the workspace .env file.",
  );
}

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL.replace(":6543/", ":5432/");
const ssl = postgresSsl(connectionString);

function supabaseCredentials(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 5432),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, "") || "postgres",
    ssl: ssl ?? false,
  };
}

export default defineConfig({
  schema: "./src/schema/mokominote.ts",
  dialect: "postgresql",
  dbCredentials: ssl ? supabaseCredentials(connectionString) : { url: connectionString },
});

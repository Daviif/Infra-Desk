import { Pool } from "pg";
import { setDefaultResultOrder } from "dns";

// Force IPv4 — Vercel build environment lacks IPv6 routes to Supabase
setDefaultResultOrder("ipv4first");

// max:3 evita estourar o limite de conexões em ambiente serverless (Vercel)
const connectionString = process.env.DATABASE_URL ?? "";
const isPooler = connectionString.includes("pooler.supabase.com");
const isLocal =
  connectionString.includes("localhost") ||
  connectionString.includes("127.0.0.1");

const pool = new Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: 3,
  // pgBouncer transaction mode não suporta prepared statements
  ...(isPooler && { statement_timeout: 0 }),
});

export default pool;

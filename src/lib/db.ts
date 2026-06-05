import { Pool } from "pg";
import { setDefaultResultOrder } from "dns";

// Force IPv4 — Vercel build environment lacks IPv6 routes to Supabase
setDefaultResultOrder("ipv4first");

// max:3 evita estourar o limite de conexões em ambiente serverless (Vercel)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
});

export default pool;

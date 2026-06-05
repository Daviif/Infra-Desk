import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ clients: [], tickets: [], equipment: [] });
  }

  const like = `%${q}%`;

  const [{ rows: clients }, { rows: tickets }, { rows: equipment }] = await Promise.all([
    pool.query(
      `SELECT id, name, city, contact FROM clients
       WHERE name ILIKE $1 OR city ILIKE $1 OR contact ILIKE $1 OR notes ILIKE $1
       LIMIT 10`,
      [like]
    ),
    pool.query(
      `SELECT t.id, t.date, t.problem, t.solution, t.status, c.name as client_name
       FROM tickets t LEFT JOIN clients c ON t.client_id = c.id
       WHERE t.problem ILIKE $1 OR t.solution ILIKE $1 OR t.tags ILIKE $1
       ORDER BY t.date DESC LIMIT 20`,
      [like]
    ),
    pool.query(
      `SELECT e.id, e.type, e.brand, e.model, e.serial, c.name as client_name, c.id as client_id
       FROM equipment e LEFT JOIN clients c ON e.client_id = c.id
       WHERE e.type ILIKE $1 OR e.brand ILIKE $1 OR e.model ILIKE $1 OR e.serial ILIKE $1 OR e.notes ILIKE $1
       LIMIT 10`,
      [like]
    ),
  ]);

  return NextResponse.json({ clients, tickets, equipment });
}

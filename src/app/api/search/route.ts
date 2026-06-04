import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ clients: [], tickets: [], equipment: [] });
  }

  const like = `%${q}%`;

  const clients = db
    .prepare(
      `SELECT id, name, city, contact FROM clients
       WHERE name LIKE ? OR city LIKE ? OR contact LIKE ? OR notes LIKE ?
       LIMIT 10`
    )
    .all(like, like, like, like);

  const tickets = db
    .prepare(
      `SELECT t.id, t.date, t.problem, t.solution, t.status, c.name as client_name
       FROM tickets t LEFT JOIN clients c ON t.client_id = c.id
       WHERE t.problem LIKE ? OR t.solution LIKE ? OR t.tags LIKE ?
       ORDER BY t.date DESC LIMIT 20`
    )
    .all(like, like, like);

  const equipment = db
    .prepare(
      `SELECT e.id, e.type, e.brand, e.model, e.serial, c.name as client_name, c.id as client_id
       FROM equipment e LEFT JOIN clients c ON e.client_id = c.id
       WHERE e.type LIKE ? OR e.brand LIKE ? OR e.model LIKE ? OR e.serial LIKE ? OR e.notes LIKE ?
       LIMIT 10`
    )
    .all(like, like, like, like, like);

  return NextResponse.json({ clients, tickets, equipment });
}

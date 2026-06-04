import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  const clients = db
    .prepare(
      `SELECT c.*,
        (SELECT COUNT(*) FROM tickets t WHERE t.client_id = c.id) as ticket_count,
        (SELECT COUNT(*) FROM equipment e WHERE e.client_id = c.id) as equipment_count
       FROM clients c ORDER BY c.name`
    )
    .all();
  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, city, contact, notes, document_type, document } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
  }

  const result = db
    .prepare("INSERT INTO clients (name, city, contact, notes, document_type, document) VALUES (?, ?, ?, ?, ?, ?)")
    .run(name.trim(), city || null, contact || null, notes || null, document_type || null, document || null);

  const client = db.prepare("SELECT * FROM clients WHERE id = ?").get(result.lastInsertRowid);
  return NextResponse.json(client, { status: 201 });
}

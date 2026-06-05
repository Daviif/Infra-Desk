import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  const { rows } = await pool.query(
    `SELECT c.*,
      (SELECT COUNT(*) FROM tickets t WHERE t.client_id = c.id)::int as ticket_count,
      (SELECT COUNT(*) FROM equipment e WHERE e.client_id = c.id)::int as equipment_count
     FROM clients c ORDER BY c.name`
  );
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, city, contact, notes, document_type, document } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
  }

  const { rows } = await pool.query(
    `INSERT INTO clients (name, city, contact, notes, document_type, document)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [name.trim(), city || null, contact || null, notes || null, document_type || null, document || null]
  );

  return NextResponse.json(rows[0], { status: 201 });
}

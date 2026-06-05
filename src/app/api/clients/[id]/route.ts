import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { rows: clientRows } = await pool.query("SELECT * FROM clients WHERE id = $1", [id]);
  if (!clientRows[0]) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const [{ rows: equipment }, { rows: tickets }] = await Promise.all([
    pool.query("SELECT * FROM equipment WHERE client_id = $1 ORDER BY type, brand", [id]),
    pool.query("SELECT * FROM tickets WHERE client_id = $1 ORDER BY date DESC, id DESC", [id]),
  ]);

  return NextResponse.json({ ...clientRows[0], equipment, tickets });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { name, city, contact, notes, document_type, document } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
  }

  const { rows } = await pool.query(
    `UPDATE clients SET name=$1, city=$2, contact=$3, notes=$4, document_type=$5, document=$6
     WHERE id=$7 RETURNING *`,
    [name.trim(), city || null, contact || null, notes || null, document_type || null, document || null, id]
  );

  return NextResponse.json(rows[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await pool.query("DELETE FROM clients WHERE id = $1", [id]);
  return NextResponse.json({ ok: true });
}

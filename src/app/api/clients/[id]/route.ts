import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = db.prepare("SELECT * FROM clients WHERE id = ?").get(id);
  if (!client) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const equipment = db
    .prepare("SELECT * FROM equipment WHERE client_id = ? ORDER BY type, brand")
    .all(id);

  const tickets = db
    .prepare("SELECT * FROM tickets WHERE client_id = ? ORDER BY date DESC, id DESC")
    .all(id);

  return NextResponse.json({ ...client as object, equipment, tickets });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { name, city, contact, notes, document_type, document } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
  }

  db.prepare("UPDATE clients SET name=?, city=?, contact=?, notes=?, document_type=?, document=? WHERE id=?").run(
    name.trim(),
    city || null,
    contact || null,
    notes || null,
    document_type || null,
    document || null,
    id
  );

  const client = db.prepare("SELECT * FROM clients WHERE id = ?").get(id);
  return NextResponse.json(client);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  db.prepare("DELETE FROM clients WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}

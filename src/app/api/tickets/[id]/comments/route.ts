import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { rows } = await pool.query(
    "SELECT * FROM ticket_comments WHERE ticket_id = $1 ORDER BY created_at ASC",
    [id]
  );
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const { body } = await req.json();
  if (!body?.trim()) {
    return NextResponse.json({ error: "Comentário não pode estar vazio" }, { status: 400 });
  }

  const { rows } = await pool.query(
    "INSERT INTO ticket_comments (ticket_id, author, body) VALUES ($1, $2, $3) RETURNING *",
    [id, session.name, body.trim()]
  );
  return NextResponse.json(rows[0], { status: 201 });
}

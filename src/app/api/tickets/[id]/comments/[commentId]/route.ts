import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { commentId } = await params;
  const { rows } = await pool.query(
    "SELECT author FROM ticket_comments WHERE id = $1",
    [commentId]
  );

  if (!rows[0]) return NextResponse.json({ error: "Comentário não encontrado" }, { status: 404 });

  // Only the author or an admin can delete
  if (rows[0].author !== session.name && session.role !== "admin") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  await pool.query("DELETE FROM ticket_comments WHERE id = $1", [commentId]);
  return NextResponse.json({ ok: true });
}

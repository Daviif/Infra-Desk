import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hashPassword } from "@/lib/password";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;
  const { name, username, password, role, active } = await req.json();

  if (!name || !username) {
    return NextResponse.json({ error: "nome e usuário são obrigatórios" }, { status: 400 });
  }

  // Prevent admin from demoting themselves
  if (Number(id) === session.id && role !== "admin") {
    return NextResponse.json({ error: "Você não pode remover sua própria permissão de admin" }, { status: 400 });
  }

  try {
    if (password) {
      const hash = await hashPassword(password);
      await pool.query(
        "UPDATE users SET name=$1, username=$2, password_hash=$3, role=$4, active=$5 WHERE id=$6",
        [name, username, hash, role, active ?? true, id]
      );
    } else {
      await pool.query(
        "UPDATE users SET name=$1, username=$2, role=$3, active=$4 WHERE id=$5",
        [name, username, role, active ?? true, id]
      );
    }

    const { rows } = await pool.query(
      "SELECT id, name, username, role, active, created_at FROM users WHERE id=$1",
      [id]
    );
    return NextResponse.json(rows[0] ?? null);
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "23505") {
      return NextResponse.json({ error: "Nome de usuário já existe" }, { status: 409 });
    }
    throw err;
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;

  if (Number(id) === session.id) {
    return NextResponse.json({ error: "Você não pode excluir sua própria conta" }, { status: 400 });
  }

  await pool.query("DELETE FROM users WHERE id=$1", [id]);
  return NextResponse.json({ ok: true });
}

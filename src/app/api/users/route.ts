import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hashPassword } from "@/lib/password";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { rows } = await pool.query(
    "SELECT id, name, username, role, active, created_at FROM users ORDER BY created_at"
  );
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { name, username, password, role } = await req.json();
  if (!name || !username || !password) {
    return NextResponse.json({ error: "nome, usuário e senha são obrigatórios" }, { status: 400 });
  }
  if (!["admin", "tecnico"].includes(role)) {
    return NextResponse.json({ error: "role inválido" }, { status: 400 });
  }

  const hash = await hashPassword(password);
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (name, username, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, username, role, active, created_at`,
      [name, username, hash, role]
    );
    return NextResponse.json(rows[0], { status: 201 });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "23505") {
      return NextResponse.json({ error: "Nome de usuário já existe" }, { status: 409 });
    }
    throw err;
  }
}

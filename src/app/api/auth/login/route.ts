import { NextRequest, NextResponse } from "next/server";
import { signToken, COOKIE_NAME } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { hashPassword, verifyPassword } from "@/lib/password";
import pool from "@/lib/db";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const { allowed, remaining, resetAt } = checkRateLimit(`login:${ip}`);

  if (!allowed) {
    const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente em alguns minutos." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter), "X-RateLimit-Remaining": "0" },
      }
    );
  }

  const { username, password } = await req.json();
  if (!username || !password) {
    return NextResponse.json({ error: "Usuário e senha são obrigatórios" }, { status: 400 });
  }

  // Seed: if no users exist yet, create the admin from env vars on first valid login
  const { rows: countRows } = await pool.query("SELECT COUNT(*)::int AS n FROM users");
  if (countRows[0].n === 0) {
    if (
      username !== process.env.ADMIN_USERNAME ||
      password !== process.env.ADMIN_PASSWORD
    ) {
      return NextResponse.json(
        { error: "Usuário ou senha incorretos" },
        { status: 401, headers: { "X-RateLimit-Remaining": String(remaining) } }
      );
    }
    const hash = await hashPassword(password);
    const { rows: seeded } = await pool.query(
      `INSERT INTO users (name, username, password_hash, role)
       VALUES ($1, $2, $3, 'admin') RETURNING id, name, username, role`,
      [username, username, hash]
    );
    const user = seeded[0];
    const token = await signToken({ id: user.id, username: user.username, name: user.name, role: user.role });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_NAME, token, cookieOpts());
    return res;
  }

  // Normal login via database
  const { rows } = await pool.query(
    "SELECT id, name, username, password_hash, role, active FROM users WHERE username = $1",
    [username]
  );

  const user = rows[0];
  if (!user || !user.active) {
    return NextResponse.json(
      { error: "Usuário ou senha incorretos" },
      { status: 401, headers: { "X-RateLimit-Remaining": String(remaining) } }
    );
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return NextResponse.json(
      { error: "Usuário ou senha incorretos" },
      { status: 401, headers: { "X-RateLimit-Remaining": String(remaining) } }
    );
  }

  const token = await signToken({ id: user.id, username: user.username, name: user.name, role: user.role });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, cookieOpts());
  return res;
}

function cookieOpts() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  };
}

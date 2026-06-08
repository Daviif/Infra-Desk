import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const TICKET_SELECT = `
  SELECT t.*, c.name as client_name,
    CASE WHEN e.id IS NOT NULL
      THEN e.type || COALESCE(' ' || e.brand, '') || COALESCE(' ' || e.model, '')
      ELSE NULL END as equipment_label
  FROM tickets t
  LEFT JOIN clients c ON t.client_id = c.id
  LEFT JOIN equipment e ON t.equipment_id = e.id
`;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "";
  const q = searchParams.get("q") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25")));
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const args: (string | number)[] = [];

  if (status) {
    args.push(status);
    conditions.push(`t.status = $${args.length}`);
  }
  if (q) {
    args.push(`%${q}%`);
    const n = args.length;
    conditions.push(
      `(t.problem ILIKE $${n} OR t.solution ILIKE $${n} OR c.name ILIKE $${n} OR t.tags ILIKE $${n} OR t.technician ILIKE $${n})`
    );
  }

  const where = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";

  const [{ rows: countRows }, { rows }] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS total FROM tickets t LEFT JOIN clients c ON t.client_id = c.id${where}`, args),
    pool.query(
      `${TICKET_SELECT}${where} ORDER BY t.date DESC, t.id DESC LIMIT $${args.length + 1} OFFSET $${args.length + 2}`,
      [...args, limit, offset]
    ),
  ]);

  const total = countRows[0].total;
  return NextResponse.json({ rows, total, page, limit, totalPages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  const body = await req.json();
  const { client_id, equipment_id, date, problem, solution, status, technician, tags } = body;

  if (!date || !problem?.trim()) {
    return NextResponse.json({ error: "date e problem são obrigatórios" }, { status: 400 });
  }

  const { rows: inserted } = await pool.query(
    `INSERT INTO tickets (client_id, equipment_id, date, problem, solution, status, technician, tags)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [
      client_id || null, equipment_id || null, date, problem.trim(),
      solution || null, status || "aberto", technician || null, tags || null,
    ]
  );

  const { rows } = await pool.query(TICKET_SELECT + " WHERE t.id = $1", [inserted[0].id]);
  logAudit("ticket", inserted[0].id, "criado", session?.name ?? "Sistema");
  return NextResponse.json(rows[0], { status: 201 });
}

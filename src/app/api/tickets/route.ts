import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

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
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") || "50");

  let query = TICKET_SELECT;
  const args: (string | number)[] = [];

  if (status) {
    query += ` WHERE t.status = $${args.length + 1}`;
    args.push(status);
  }

  query += ` ORDER BY t.date DESC, t.id DESC LIMIT $${args.length + 1}`;
  args.push(limit);

  const { rows } = await pool.query(query, args);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
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
  return NextResponse.json(rows[0], { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

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
    query += " WHERE t.status = ?";
    args.push(status);
  }

  query += " ORDER BY t.date DESC, t.id DESC LIMIT ?";
  args.push(limit);

  const tickets = db.prepare(query).all(...args);
  return NextResponse.json(tickets);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { client_id, equipment_id, date, problem, solution, status, technician, tags } = body;

  if (!date || !problem?.trim()) {
    return NextResponse.json({ error: "date e problem são obrigatórios" }, { status: 400 });
  }

  const result = db
    .prepare(
      `INSERT INTO tickets (client_id, equipment_id, date, problem, solution, status, technician, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      client_id || null,
      equipment_id || null,
      date,
      problem.trim(),
      solution || null,
      status || "aberto",
      technician || null,
      tags || null
    );

  const ticket = db
    .prepare(TICKET_SELECT + " WHERE t.id = ?")
    .get(result.lastInsertRowid);

  return NextResponse.json(ticket, { status: 201 });
}

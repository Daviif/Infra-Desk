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

function formatElapsed(startIso: string): string {
  const ms = Date.now() - new Date(startIso).getTime();
  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 1) return "< 1min";
  if (totalMinutes < 60) return `${totalMinutes}min`;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ticket = db.prepare(TICKET_SELECT + " WHERE t.id = ?").get(id);
  if (!ticket) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  return NextResponse.json(ticket);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { client_id, equipment_id, date, problem, solution, status, technician, tags } = body;

  if (!date || !problem?.trim()) {
    return NextResponse.json({ error: "date e problem são obrigatórios" }, { status: 400 });
  }

  // Auto-calculate time_spent when closing the ticket for the first time
  let time_spent: string | null = null;
  if (status === "resolvido") {
    const existing = db
      .prepare("SELECT created_at, status, time_spent FROM tickets WHERE id = ?")
      .get(id) as { created_at: string; status: string; time_spent: string | null } | undefined;
    if (existing) {
      if (existing.time_spent) {
        time_spent = existing.time_spent;
      } else {
        time_spent = formatElapsed(existing.created_at);
      }
    }
  }

  db.prepare(
    `UPDATE tickets SET client_id=?, equipment_id=?, date=?, problem=?, solution=?, status=?,
     time_spent=?, technician=?, tags=? WHERE id=?`
  ).run(
    client_id || null,
    equipment_id || null,
    date,
    problem.trim(),
    solution || null,
    status || "aberto",
    time_spent,
    technician || null,
    tags || null,
    id
  );

  const ticket = db.prepare(TICKET_SELECT + " WHERE t.id = ?").get(id);
  return NextResponse.json(ticket);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  db.prepare("DELETE FROM tickets WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}

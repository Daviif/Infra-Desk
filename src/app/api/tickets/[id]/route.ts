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
  const { rows } = await pool.query(TICKET_SELECT + " WHERE t.id = $1", [id]);
  if (!rows[0]) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  return NextResponse.json(rows[0]);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { client_id, equipment_id, date, problem, solution, status, technician, tags } = body;

  if (!date || !problem?.trim()) {
    return NextResponse.json({ error: "date e problem são obrigatórios" }, { status: 400 });
  }

  let time_spent: string | null = null;
  if (status === "resolvido") {
    const { rows: existing } = await pool.query(
      "SELECT created_at, status, time_spent FROM tickets WHERE id = $1",
      [id]
    );
    if (existing[0]) {
      time_spent = existing[0].time_spent || formatElapsed(existing[0].created_at);
    }
  }

  await pool.query(
    `UPDATE tickets SET client_id=$1, equipment_id=$2, date=$3, problem=$4, solution=$5,
     status=$6, time_spent=$7, technician=$8, tags=$9 WHERE id=$10`,
    [
      client_id || null, equipment_id || null, date, problem.trim(),
      solution || null, status || "aberto", time_spent, technician || null, tags || null, id,
    ]
  );

  const { rows } = await pool.query(TICKET_SELECT + " WHERE t.id = $1", [id]);
  return NextResponse.json(rows[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await pool.query("DELETE FROM tickets WHERE id = $1", [id]);
  return NextResponse.json({ ok: true });
}

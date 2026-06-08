import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const entity_type = searchParams.get("entity_type");
  const entity_id = searchParams.get("entity_id");

  if (!entity_type || !entity_id) {
    return NextResponse.json({ error: "entity_type e entity_id são obrigatórios" }, { status: 400 });
  }

  const { rows } = await pool.query(
    "SELECT * FROM audit_log WHERE entity_type=$1 AND entity_id=$2 ORDER BY created_at ASC",
    [entity_type, entity_id]
  );
  return NextResponse.json(rows);
}

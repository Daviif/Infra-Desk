import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const { rows } = await pool.query(
    "SELECT id, type, brand, model FROM equipment WHERE monitoring_token = $1",
    [token]
  );
  if (!rows[0]) return NextResponse.json({ error: "Token inválido" }, { status: 401 });

  const host  = req.headers.get("host") ?? "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const baseUrl = `${proto}://${host}`;

  const config = {
    token,
    api_url: `${baseUrl}/api/monitor/${token}`,
    interval_minutes: 30,
    equipment_id: rows[0].id,
    equipment_label: [rows[0].type, rows[0].brand, rows[0].model].filter(Boolean).join(" "),
  };

  return new NextResponse(JSON.stringify(config, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="config.json"`,
    },
  });
}

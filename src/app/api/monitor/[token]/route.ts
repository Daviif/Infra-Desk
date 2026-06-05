import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { DiskInfo } from "@/types";

const DISK_WARN = 85;
const DISK_CRIT = 95;

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const { rows: equip } = await pool.query(
    "SELECT id, type, brand, model, client_id FROM equipment WHERE monitoring_token = $1",
    [token]
  );
  if (!equip[0]) return NextResponse.json({ error: "Token inválido" }, { status: 401 });

  const equipment = equip[0];
  const body = await req.json();
  const { hostname, os_version, ip_local, uptime_hours, ram_total_gb, ram_used_gb, disks } = body;

  const disk_usage_json = disks ? JSON.stringify(disks) : null;

  // Guarda apenas últimas 500 métricas por equipamento
  await pool.query(
    `DELETE FROM machine_metrics WHERE id IN (
      SELECT id FROM machine_metrics WHERE equipment_id = $1
      ORDER BY reported_at DESC OFFSET 499
    )`,
    [equipment.id]
  );

  await pool.query(
    `INSERT INTO machine_metrics
      (equipment_id, is_online, disk_usage_json, ram_total_gb, ram_used_gb, uptime_hours, os_version, hostname, ip_local)
     VALUES ($1, true, $2, $3, $4, $5, $6, $7, $8)`,
    [equipment.id, disk_usage_json, ram_total_gb ?? null, ram_used_gb ?? null,
     uptime_hours ?? null, os_version ?? null, hostname ?? null, ip_local ?? null]
  );

  // Verifica disco e abre chamado se necessário
  if (disks && Array.isArray(disks)) {
    const label = [equipment.type, equipment.brand, equipment.model].filter(Boolean).join(" ");

    for (const disk of disks as DiskInfo[]) {
      if (disk.percent < DISK_WARN) continue;

      const severity = disk.percent >= DISK_CRIT ? "CRÍTICO" : "Alerta";
      const tag = `monitoramento:disco:${disk.drive.replace(":", "")}`;

      // Não abre duplicata se já existe chamado aberto nas últimas 24h
      const { rows: existing } = await pool.query(
        `SELECT id FROM tickets
         WHERE equipment_id = $1 AND status != 'resolvido'
           AND tags LIKE $2 AND created_at > NOW() - INTERVAL '24 hours'
         LIMIT 1`,
        [equipment.id, `%${tag}%`]
      );
      if (existing.length > 0) continue;

      const problem = `[${severity}] Disco ${disk.drive} com ${disk.percent}% de uso em ${label || `Equipamento #${equipment.id}`} (${hostname ?? "?"})`;
      await pool.query(
        `INSERT INTO tickets (equipment_id, client_id, date, problem, status, tags, technician)
         VALUES ($1, $2, $3, $4, 'aberto', $5, 'Agente de Monitoramento')`,
        [
          equipment.id,
          equipment.client_id || null,
          new Date().toISOString().slice(0, 10),
          problem,
          `monitoramento,${tag}`,
        ]
      );
    }
  }

  return NextResponse.json({ ok: true });
}

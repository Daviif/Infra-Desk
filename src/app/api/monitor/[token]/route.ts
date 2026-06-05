import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { DiskInfo } from "@/types";

const DISK_WARN = 85;
const DISK_CRIT = 95;

async function openTicketIfNew(
  equipmentId: number,
  clientId: number | null,
  date: string,
  problem: string,
  tag: string,
  dedupeHours = 24,
) {
  const { rows } = await pool.query(
    `SELECT id FROM tickets
     WHERE equipment_id = $1 AND status != 'resolvido'
       AND tags LIKE $2 AND created_at > NOW() - ($3 || ' hours')::interval
     LIMIT 1`,
    [equipmentId, `%${tag}%`, dedupeHours]
  );
  if (rows.length > 0) return;

  await pool.query(
    `INSERT INTO tickets (equipment_id, client_id, date, problem, status, tags, technician)
     VALUES ($1, $2, $3, $4, 'aberto', $5, 'Agente de Monitoramento')`,
    [equipmentId, clientId, date, problem, `monitoramento,${tag}`]
  );
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const { rows: equip } = await pool.query(
    "SELECT id, type, brand, model, client_id FROM equipment WHERE monitoring_token = $1",
    [token]
  );
  if (!equip[0]) return NextResponse.json({ error: "Token inválido" }, { status: 401 });

  const eq   = equip[0];
  const body = await req.json();
  const {
    hostname, os_version, ip_local, uptime_hours,
    ram_total_gb, ram_used_gb, cpu_percent, disks,
    battery_percent, battery_plugged,
    pending_reboot, last_user, event_log_errors,
    antivirus_name, antivirus_enabled, smart_status,
  } = body;

  const disk_usage_json = disks ? JSON.stringify(disks) : null;
  const label = [eq.type, eq.brand, eq.model].filter(Boolean).join(" ") || `Equipamento #${eq.id}`;
  const date  = new Date().toISOString().slice(0, 10);

  // Limita histórico a 500 registros por equipamento
  await pool.query(
    `DELETE FROM machine_metrics WHERE id IN (
       SELECT id FROM machine_metrics WHERE equipment_id = $1
       ORDER BY reported_at DESC OFFSET 499
     )`,
    [eq.id]
  );

  await pool.query(
    `INSERT INTO machine_metrics (
       equipment_id, is_online, disk_usage_json,
       ram_total_gb, ram_used_gb, cpu_percent,
       uptime_hours, os_version, hostname, ip_local,
       battery_percent, battery_plugged, pending_reboot,
       last_user, event_log_errors,
       antivirus_name, antivirus_enabled, smart_status
     ) VALUES ($1,true,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
    [
      eq.id, disk_usage_json,
      ram_total_gb ?? null, ram_used_gb ?? null, cpu_percent ?? null,
      uptime_hours ?? null, os_version ?? null, hostname ?? null, ip_local ?? null,
      battery_percent ?? null, battery_plugged ?? null, pending_reboot ?? null,
      last_user ?? null, event_log_errors ?? null,
      antivirus_name ?? null, antivirus_enabled ?? null, smart_status ?? null,
    ]
  );

  // ── Alertas automáticos ───────────────────────────────────────────────────

  // Disco
  if (disks && Array.isArray(disks)) {
    for (const disk of disks as DiskInfo[]) {
      if (disk.percent < DISK_WARN) continue;
      const severity = disk.percent >= DISK_CRIT ? "CRÍTICO" : "Alerta";
      const tag = `monitoramento:disco:${disk.drive.replace(":", "")}`;
      await openTicketIfNew(
        eq.id, eq.client_id,  date,
        `[${severity}] Disco ${disk.drive} com ${disk.percent}% de uso em ${label} (${hostname ?? "?"})`,
        tag
      );
    }
  }

  // Reinicialização pendente
  if (pending_reboot) {
    await openTicketIfNew(
      eq.id, eq.client_id, date,
      `Reinicialização pendente em ${label} (${hostname ?? "?"}) — Windows Update aguardando reboot`,
      "monitoramento:reboot",
      72 // só reabre após 3 dias
    );
  }

  // Antivírus desativado
  if (antivirus_enabled === false) {
    await openTicketIfNew(
      eq.id, eq.client_id, date,
      `Antivírus desativado em ${label} (${hostname ?? "?"})${antivirus_name ? ` — ${antivirus_name}` : ""}`,
      "monitoramento:antivirus"
    );
  }

  // Saúde do disco (SMART)
  if (smart_status && smart_status !== "OK") {
    await openTicketIfNew(
      eq.id, eq.client_id, date,
      `[CRÍTICO] Saúde do disco degradada em ${label} (${hostname ?? "?"}) — SMART: ${smart_status}`,
      "monitoramento:smart",
      168 // reabre após 7 dias
    );
  }

  // Bateria baixa (notebooks sem fonte)
  if (battery_percent != null && battery_percent < 20 && !battery_plugged) {
    await openTicketIfNew(
      eq.id, eq.client_id, date,
      `Bateria baixa (${battery_percent}%) em ${label} (${hostname ?? "?"}) — sem fonte conectada`,
      "monitoramento:bateria",
      4
    );
  }

  // Muitos erros no Event Log
  if (event_log_errors != null && event_log_errors > 20) {
    await openTicketIfNew(
      eq.id, eq.client_id, date,
      `${event_log_errors} erros críticos no Event Log (últimas 24h) em ${label} (${hostname ?? "?"})`,
      "monitoramento:eventlog"
    );
  }

  return NextResponse.json({ ok: true });
}

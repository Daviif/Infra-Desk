import { NextResponse } from "next/server";
import pool from "@/lib/db";

// Máquina é considerada offline se não reportou nos últimos 90 minutos
const OFFLINE_THRESHOLD_MINUTES = 90;

export async function GET() {
  const { rows } = await pool.query(`
    SELECT
      e.id            AS equipment_id,
      e.type,
      e.brand,
      e.model,
      e.monitoring_token,
      c.name          AS client_name,
      m.reported_at,
      m.hostname,
      m.ip_local,
      m.cpu_percent,
      m.ram_used_gb,
      m.ram_total_gb,
      m.disk_usage_json,
      m.pending_reboot,
      m.antivirus_name,
      m.antivirus_enabled,
      m.smart_status,
      m.battery_percent,
      m.battery_plugged,
      m.event_log_errors,
      m.os_version,
      m.uptime_hours,
      m.last_user
    FROM equipment e
    LEFT JOIN clients c ON e.client_id = c.id
    LEFT JOIN LATERAL (
      SELECT * FROM machine_metrics mm
      WHERE mm.equipment_id = e.id
      ORDER BY mm.reported_at DESC
      LIMIT 1
    ) m ON true
    WHERE e.monitoring_token IS NOT NULL
    ORDER BY c.name NULLS LAST, e.type, e.brand
  `);

  const now = Date.now();
  const thresholdMs = OFFLINE_THRESHOLD_MINUTES * 60 * 1000;

  const machines = rows.map((r) => {
    const hasMetric = r.reported_at != null;
    const isOnline = hasMetric
      ? now - new Date(r.reported_at).getTime() < thresholdMs
      : false;

    const alerts: string[] = [];
    if (r.pending_reboot) alerts.push("reboot");
    if (r.antivirus_enabled === false) alerts.push("antivirus");
    if (r.smart_status && r.smart_status !== "OK") alerts.push("smart");
    if (r.event_log_errors != null && r.event_log_errors > 20) alerts.push("eventlog");
    if (r.disk_usage_json) {
      try {
        const disks = JSON.parse(r.disk_usage_json);
        if (Array.isArray(disks) && disks.some((d: { percent: number }) => d.percent >= 85)) {
          alerts.push("disk");
        }
      } catch {}
    }

    return {
      equipment_id:      r.equipment_id,
      type:              r.type,
      brand:             r.brand,
      model:             r.model,
      monitoring_token:  r.monitoring_token,
      client_name:       r.client_name,
      is_online:         isOnline,
      has_metric:        hasMetric,
      alerts,
      reported_at:       r.reported_at,
      hostname:          r.hostname,
      ip_local:          r.ip_local,
      cpu_percent:       r.cpu_percent,
      ram_used_gb:       r.ram_used_gb,
      ram_total_gb:      r.ram_total_gb,
      disk_usage_json:   r.disk_usage_json,
      pending_reboot:    r.pending_reboot,
      antivirus_name:    r.antivirus_name,
      antivirus_enabled: r.antivirus_enabled,
      smart_status:      r.smart_status,
      battery_percent:   r.battery_percent,
      battery_plugged:   r.battery_plugged,
      event_log_errors:  r.event_log_errors,
      os_version:        r.os_version,
      uptime_hours:      r.uptime_hours,
      last_user:         r.last_user,
    };
  });

  return NextResponse.json(machines);
}

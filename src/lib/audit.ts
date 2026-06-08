import pool from "@/lib/db";

type AuditAction = "criado" | "atualizado" | "excluído";

interface Change {
  field: string;
  from: unknown;
  to: unknown;
}

const TICKET_FIELDS = ["status", "problem", "solution", "technician", "tags", "client_id", "equipment_id", "date"];
const EQUIPMENT_FIELDS = [
  "type", "brand", "model", "serial", "ip_address", "mac_address",
  "status", "location", "responsible", "user_account", "notes",
  "remote_access", "maintenance_interval_days", "last_maintenance_date",
];

function diff(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields: string[]
): Change[] {
  return fields
    .filter((f) => String(before[f] ?? "") !== String(after[f] ?? ""))
    .map((f) => ({ field: f, from: before[f] ?? null, to: after[f] ?? null }));
}

// Fire-and-forget — never throws, never blocks the caller
export function logAudit(
  entityType: "ticket" | "equipment",
  entityId: number,
  action: AuditAction,
  changedBy: string,
  changes?: Change[]
): void {
  pool
    .query(
      "INSERT INTO audit_log (entity_type, entity_id, action, changed_by, changes) VALUES ($1,$2,$3,$4,$5)",
      [entityType, entityId, action, changedBy, changes?.length ? JSON.stringify(changes) : null]
    )
    .catch(() => { /* audit failure must not break the main operation */ });
}

export function diffTicket(before: Record<string, unknown>, after: Record<string, unknown>): Change[] {
  return diff(before, after, TICKET_FIELDS);
}

export function diffEquipment(before: Record<string, unknown>, after: Record<string, unknown>): Change[] {
  return diff(before, after, EQUIPMENT_FIELDS);
}

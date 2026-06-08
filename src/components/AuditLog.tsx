"use client";

import { useEffect, useState } from "react";

interface AuditEntry {
  id: number;
  action: string;
  changed_by: string;
  changes: { field: string; from: unknown; to: unknown }[] | null;
  created_at: string;
}

const FIELD_LABELS: Record<string, string> = {
  status: "Status",
  problem: "Problema",
  solution: "Solução",
  technician: "Técnico",
  tags: "Tags",
  client_id: "Cliente",
  equipment_id: "Equipamento",
  date: "Data",
  type: "Tipo",
  brand: "Marca",
  model: "Modelo",
  serial: "Serial",
  ip_address: "IP",
  mac_address: "MAC",
  location: "Localização",
  responsible: "Responsável",
  user_account: "Conta de usuário",
  notes: "Observações",
  remote_access: "Acesso remoto",
  maintenance_interval_days: "Intervalo de manutenção (dias)",
  last_maintenance_date: "Última manutenção",
};

function formatRelativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora mesmo";
  if (min < 60) return `há ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `há ${d}d`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

function actionIcon(action: string) {
  if (action === "criado") return { icon: "✦", color: "text-green-600 bg-green-50 border-green-200" };
  if (action === "excluído") return { icon: "✕", color: "text-red-500 bg-red-50 border-red-200" };
  return { icon: "✎", color: "text-blue-500 bg-blue-50 border-blue-200" };
}

interface Props {
  entityType: "ticket" | "equipment";
  entityId: number | string;
}

export default function AuditLog({ entityType, entityId }: Props) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch(`/api/audit?entity_type=${entityType}&entity_id=${entityId}`)
      .then((r) => r.json())
      .then(setEntries);
  }, [open, entityType, entityId]);

  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        <span>{open ? "▾" : "▸"}</span>
        Histórico de alterações
        {entries.length > 0 && (
          <span className="text-gray-300">({entries.length})</span>
        )}
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          {entries.length === 0 ? (
            <p className="text-xs text-gray-400 pl-1">Nenhuma alteração registrada.</p>
          ) : (
            entries.map((e) => {
              const { icon, color } = actionIcon(e.action);
              return (
                <div key={e.id} className="flex gap-3 items-start">
                  <span className={`mt-0.5 w-5 h-5 flex-shrink-0 flex items-center justify-center rounded border text-xs font-bold ${color}`}>
                    {icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-gray-700">{e.changed_by}</span>
                      <span className="text-xs text-gray-400">{e.action}</span>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-400">{formatRelativeTime(e.created_at)}</span>
                    </div>
                    {e.changes && e.changes.length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {e.changes.map((c, i) => (
                          <li key={i} className="text-xs text-gray-500">
                            <span className="font-medium text-gray-600">{FIELD_LABELS[c.field] ?? c.field}:</span>{" "}
                            <span className="line-through text-gray-400">{String(c.from ?? "—")}</span>
                            {" → "}
                            <span className="text-gray-700">{String(c.to ?? "—")}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

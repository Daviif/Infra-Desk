"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DiskInfo } from "@/types";

interface MonitoredMachine {
  equipment_id: number;
  type: string;
  brand: string | null;
  model: string | null;
  monitoring_token: string;
  client_name: string | null;
  is_online: boolean;
  has_metric: boolean;
  alerts: string[];
  reported_at: string | null;
  hostname: string | null;
  ip_local: string | null;
  cpu_percent: number | null;
  ram_used_gb: number | null;
  ram_total_gb: number | null;
  disk_usage_json: string | null;
  pending_reboot: boolean | null;
  antivirus_name: string | null;
  antivirus_enabled: boolean | null;
  smart_status: string | null;
  battery_percent: number | null;
  battery_plugged: boolean | null;
  event_log_errors: number | null;
  os_version: string | null;
  uptime_hours: number | null;
  last_user: string | null;
}

type FilterTab = "all" | "online" | "offline" | "alerts";

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s atrás`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return `${Math.floor(diff / 86400)}d atrás`;
}

function alertLabel(alert: string): { text: string; color: string } {
  switch (alert) {
    case "reboot":    return { text: "Reboot pendente",    color: "bg-yellow-100 text-yellow-800" };
    case "antivirus": return { text: "Antivírus inativo",  color: "bg-red-100 text-red-800" };
    case "smart":     return { text: "Disco degradado",    color: "bg-red-100 text-red-800" };
    case "disk":      return { text: "Disco cheio",        color: "bg-orange-100 text-orange-800" };
    case "eventlog":  return { text: "Erros no Event Log", color: "bg-orange-100 text-orange-800" };
    default:          return { text: alert,                color: "bg-gray-100 text-gray-700" };
  }
}

function BarMeter({ value, warn = 70, crit = 90 }: { value: number; warn?: number; crit?: number }) {
  const color = value >= crit ? "bg-red-500" : value >= warn ? "bg-orange-400" : "bg-blue-500";
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 bg-gray-200 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <span className="text-xs text-gray-600 w-8 text-right">{value}%</span>
    </div>
  );
}

export default function MonitorPage() {
  const [machines, setMachines] = useState<MonitoredMachine[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchMachines();
    const interval = setInterval(fetchMachines, 60_000);
    return () => clearInterval(interval);
  }, []);

  const fetchMachines = async () => {
    try {
      const res = await fetch("/api/monitor");
      const data = await res.json();
      setMachines(data);
    } catch (err) {
      console.error("Erro ao buscar monitoramento:", err);
    } finally {
      setLoading(false);
    }
  };

  const online  = machines.filter((m) => m.is_online);
  const offline = machines.filter((m) => m.has_metric && !m.is_online);
  const noData  = machines.filter((m) => !m.has_metric);
  const alerts  = machines.filter((m) => m.alerts.length > 0);

  const filtered = machines.filter((m) => {
    if (tab === "online"  && !m.is_online) return false;
    if (tab === "offline" && (m.is_online || !m.has_metric)) return false;
    if (tab === "alerts"  && m.alerts.length === 0) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        m.hostname?.toLowerCase().includes(q) ||
        m.client_name?.toLowerCase().includes(q) ||
        m.brand?.toLowerCase().includes(q) ||
        m.model?.toLowerCase().includes(q) ||
        m.ip_local?.includes(q) ||
        m.type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all",     label: "Todas",         count: machines.length },
    { key: "online",  label: "Online",         count: online.length },
    { key: "offline", label: "Offline",        count: offline.length },
    { key: "alerts",  label: "Com alertas",    count: alerts.length },
  ];

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Monitoramento</h1>
        <div className="flex gap-3 text-sm text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            {online.length} online
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
            {offline.length} offline
          </span>
          {noData.length > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />
              {noData.length} sem dados
            </span>
          )}
        </div>
      </div>

      {/* Tabs + busca */}
      <div className="flex items-center justify-between mb-4 gap-4">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                tab === t.key ? "bg-gray-100 text-gray-600" : "bg-gray-200 text-gray-500"
              }`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Buscar por hostname, cliente, IP..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm py-12 text-center">Carregando...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium mb-1">Nenhuma máquina encontrada</p>
          <p className="text-sm">
            {machines.length === 0
              ? "Ative o monitoramento em um equipamento para começar."
              : "Nenhuma máquina corresponde ao filtro atual."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => {
            const label = [m.brand, m.model].filter(Boolean).join(" ") || m.type;
            const disks: DiskInfo[] = m.disk_usage_json
              ? (() => { try { return JSON.parse(m.disk_usage_json); } catch { return []; } })()
              : [];
            const worstDisk = disks.reduce<DiskInfo | null>(
              (acc, d) => (!acc || d.percent > acc.percent ? d : acc), null
            );

            return (
              <Link
                key={m.equipment_id}
                href={`/equipment/${m.equipment_id}`}
                className="block bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-4 p-4">
                  {/* Status dot */}
                  <div className="mt-1">
                    {!m.has_metric ? (
                      <span className="w-3 h-3 rounded-full bg-gray-300 block" title="Sem dados" />
                    ) : m.is_online ? (
                      <span className="w-3 h-3 rounded-full bg-green-500 block" title="Online" />
                    ) : (
                      <span className="w-3 h-3 rounded-full bg-red-400 block" title="Offline" />
                    )}
                  </div>

                  {/* Info principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">
                        {m.hostname ?? label}
                      </span>
                      {m.hostname && (
                        <span className="text-xs text-gray-400">{label}</span>
                      )}
                      {m.client_name && (
                        <span className="text-xs text-gray-500">— {m.client_name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400 flex-wrap">
                      {m.ip_local  && <span>{m.ip_local}</span>}
                      {m.os_version && <span>{m.os_version}</span>}
                      {m.last_user && <span>Usuário: {m.last_user}</span>}
                      {m.reported_at && (
                        <span>{m.is_online ? "Reportou" : "Último reporte"} {timeAgo(m.reported_at)}</span>
                      )}
                    </div>

                    {/* Alertas */}
                    {m.alerts.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {m.alerts.map((a) => {
                          const { text, color } = alertLabel(a);
                          return (
                            <span key={a} className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>
                              {text}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Métricas rápidas */}
                  {m.has_metric && (
                    <div className="flex gap-6 text-xs shrink-0">
                      {m.cpu_percent != null && (
                        <div className="w-20">
                          <p className="text-gray-400 mb-1">CPU</p>
                          <BarMeter value={m.cpu_percent} />
                        </div>
                      )}
                      {m.ram_total_gb != null && m.ram_used_gb != null && (
                        <div className="w-20">
                          <p className="text-gray-400 mb-1">RAM</p>
                          <BarMeter value={Math.round((m.ram_used_gb / m.ram_total_gb) * 100)} />
                        </div>
                      )}
                      {worstDisk && (
                        <div className="w-20">
                          <p className="text-gray-400 mb-1">Disco {worstDisk.drive}</p>
                          <BarMeter value={worstDisk.percent} warn={85} crit={95} />
                        </div>
                      )}
                      {m.uptime_hours != null && (
                        <div className="w-16 text-right">
                          <p className="text-gray-400 mb-1">Uptime</p>
                          <p className="text-gray-700 font-medium">
                            {m.uptime_hours >= 24
                              ? `${Math.floor(m.uptime_hours / 24)}d`
                              : `${m.uptime_hours}h`}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {!m.has_metric && (
                    <span className="text-xs text-gray-400 italic shrink-0 self-center">
                      Aguardando primeiro reporte
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

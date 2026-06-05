import pool from "@/lib/db";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import { Ticket } from "@/types";

export const dynamic = "force-dynamic";

function StatCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-400 transition-colors">
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
    </Link>
  );
}

function daysUntilMaintenance(lastDate: string | null, intervalDays: number): number {
  if (!lastDate) return -intervalDays;
  const last = new Date(lastDate);
  const next = new Date(last);
  next.setDate(next.getDate() + intervalDays);
  return Math.ceil((next.getTime() - Date.now()) / 86400000);
}

export default async function Dashboard() {
  const [
    { rows: [{ n: totalClients }] },
    { rows: [{ n: openTickets }] },
    { rows: [{ n: resolvedMonth }] },
    { rows: [{ n: totalEquipment }] },
    { rows: recentTickets },
    { rows: maintenanceDue },
  ] = await Promise.all([
    pool.query("SELECT COUNT(*)::int as n FROM clients"),
    pool.query("SELECT COUNT(*)::int as n FROM tickets WHERE status != 'resolvido'"),
    pool.query("SELECT COUNT(*)::int as n FROM tickets WHERE status = 'resolvido' AND LEFT(date, 7) = TO_CHAR(CURRENT_DATE, 'YYYY-MM')"),
    pool.query("SELECT COUNT(*)::int as n FROM equipment"),
    pool.query(`SELECT t.*, c.name as client_name FROM tickets t LEFT JOIN clients c ON t.client_id = c.id ORDER BY t.date DESC, t.id DESC LIMIT 8`),
    pool.query(`
      SELECT e.id, e.type, e.brand, e.model, e.location, c.name as client_name,
             e.maintenance_interval_days, e.last_maintenance_date
      FROM equipment e
      LEFT JOIN clients c ON e.client_id = c.id
      WHERE e.maintenance_interval_days IS NOT NULL
        AND (
          e.last_maintenance_date IS NULL OR
          e.last_maintenance_date + (e.maintenance_interval_days || ' days')::interval <= CURRENT_DATE + INTERVAL '7 days'
        )
      ORDER BY e.last_maintenance_date ASC NULLS FIRST
      LIMIT 10
    `),
  ]);

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Clientes" value={totalClients} href="/clients" />
        <StatCard label="Chamados abertos" value={openTickets} href="/tickets?status=aberto" />
        <StatCard label="Resolvidos este mês" value={resolvedMonth} href="/tickets?status=resolvido" />
        <StatCard label="Equipamentos" value={totalEquipment} href="/clients" />
      </div>

      {maintenanceDue.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Manutenção preventiva</h2>
          <div className="bg-white rounded-xl border border-orange-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-orange-50 border-b border-orange-100">
                <tr>
                  <th className="text-left px-4 py-3 text-orange-700 font-medium">Equipamento</th>
                  <th className="text-left px-4 py-3 text-orange-700 font-medium">Cliente</th>
                  <th className="text-left px-4 py-3 text-orange-700 font-medium">Localização</th>
                  <th className="text-left px-4 py-3 text-orange-700 font-medium">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-50">
                {maintenanceDue.map((e) => {
                  const days = daysUntilMaintenance(e.last_maintenance_date, e.maintenance_interval_days);
                  const overdue = days <= 0;
                  return (
                    <tr key={e.id} className="hover:bg-orange-50">
                      <td className="px-4 py-3 font-medium">
                        <Link href={`/equipment/${e.id}`} className="hover:text-blue-600 hover:underline">
                          {[e.type, e.brand, e.model].filter(Boolean).join(" ")}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{e.client_name ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{e.location ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          overdue ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                        }`}>
                          {overdue
                            ? `Atrasado ${Math.abs(days)}d`
                            : days === 0 ? "Hoje" : `Em ${days}d`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-800">Chamados recentes</h2>
        <Link href="/tickets/new" className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-blue-700 transition-colors">
          + Novo chamado
        </Link>
      </div>

      {(recentTickets as Ticket[]).length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
          Nenhum chamado ainda.{" "}
          <Link href="/tickets/new" className="text-blue-600 hover:underline">Criar o primeiro</Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Data</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Cliente</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Problema</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(recentTickets as Ticket[]).map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{t.date}</td>
                  <td className="px-4 py-3 font-medium">{t.client_name ?? <span className="text-gray-400 italic">—</span>}</td>
                  <td className="px-4 py-3 text-gray-700 max-w-xs truncate">
                    <Link href={`/tickets/${t.id}`} className="hover:text-blue-600 hover:underline">{t.problem}</Link>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

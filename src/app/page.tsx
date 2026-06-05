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

export default async function Dashboard() {
  const [
    { rows: [{ n: totalClients }] },
    { rows: [{ n: openTickets }] },
    { rows: [{ n: resolvedMonth }] },
    { rows: [{ n: totalEquipment }] },
    { rows: recentTickets },
  ] = await Promise.all([
    pool.query("SELECT COUNT(*)::int as n FROM clients"),
    pool.query("SELECT COUNT(*)::int as n FROM tickets WHERE status != 'resolvido'"),
    pool.query(
      "SELECT COUNT(*)::int as n FROM tickets WHERE status = 'resolvido' AND LEFT(date, 7) = TO_CHAR(CURRENT_DATE, 'YYYY-MM')"
    ),
    pool.query("SELECT COUNT(*)::int as n FROM equipment"),
    pool.query(
      `SELECT t.*, c.name as client_name FROM tickets t
       LEFT JOIN clients c ON t.client_id = c.id
       ORDER BY t.date DESC, t.id DESC LIMIT 8`
    ),
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

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-800">Chamados recentes</h2>
        <Link href="/tickets/new" className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-blue-700 transition-colors">
          + Novo chamado
        </Link>
      </div>

      {(recentTickets as Ticket[]).length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
          Nenhum chamado ainda.{" "}
          <Link href="/tickets/new" className="text-blue-600 hover:underline">
            Criar o primeiro
          </Link>
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
                  <td className="px-4 py-3 font-medium">
                    {t.client_name ?? <span className="text-gray-400 italic">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-700 max-w-xs truncate">
                    <Link href={`/tickets/${t.id}`} className="hover:text-blue-600 hover:underline">
                      {t.problem}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={t.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

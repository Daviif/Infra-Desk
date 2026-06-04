"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import { Ticket } from "@/types";
import { Suspense } from "react";

function TicketList() {
  const searchParams = useSearchParams();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [filter, setFilter] = useState("");

  useEffect(() => {
    const url = status ? `/api/tickets?status=${status}&limit=200` : "/api/tickets?limit=200";
    fetch(url).then((r) => r.json()).then(setTickets);
  }, [status]);

  const filtered = tickets.filter(
    (t) =>
      t.problem.toLowerCase().includes(filter.toLowerCase()) ||
      (t.solution ?? "").toLowerCase().includes(filter.toLowerCase()) ||
      (t.client_name ?? "").toLowerCase().includes(filter.toLowerCase()) ||
      (t.tags ?? "").toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Chamados</h1>
        <Link href="/tickets/new"
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          + Novo chamado
        </Link>
      </div>

      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Filtrar por problema, solução, cliente ou tag..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos os status</option>
          <option value="aberto">Aberto</option>
          <option value="em_andamento">Em andamento</option>
          <option value="resolvido">Resolvido</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
          {tickets.length === 0 ? (
            <>
              Nenhum chamado ainda.{" "}
              <Link href="/tickets/new" className="text-blue-600 hover:underline">Criar o primeiro</Link>
            </>
          ) : (
            "Nenhum resultado para o filtro."
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium w-24">Data</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Cliente</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Problema</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Tags</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{t.date}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {t.client_name ?? <span className="text-gray-400 italic">—</span>}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <Link href={`/tickets/${t.id}`} className="text-gray-800 hover:text-blue-600 hover:underline line-clamp-2">
                      {t.problem}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {t.tags
                      ? t.tags.split(",").map((tag) => (
                          <span key={tag} className="inline-block bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded mr-1">
                            {tag.trim()}
                          </span>
                        ))
                      : null}
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

export default function TicketsPage() {
  return (
    <Suspense fallback={<div className="text-gray-400 py-10 text-center">Carregando...</div>}>
      <TicketList />
    </Suspense>
  );
}

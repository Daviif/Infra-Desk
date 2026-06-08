"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import Pagination from "@/components/Pagination";
import { Ticket } from "@/types";

const LIMIT = 25;

function TicketList() {
  const searchParams = useSearchParams();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [loading, setLoading] = useState(false);

  // Debounce search input — wait 350ms before hitting the API
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  // Reset to page 1 whenever filters change
  useEffect(() => { setPage(1); }, [status, debouncedQ]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (status) params.set("status", status);
    if (debouncedQ) params.set("q", debouncedQ);
    const res = await fetch(`/api/tickets?${params}`);
    const data = await res.json();
    setTickets(data.rows);
    setTotal(data.total);
    setTotalPages(data.totalPages);
    setLoading(false);
  }, [page, status, debouncedQ]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Chamados</h1>
        <Link href="/tickets/new"
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          + Novo chamado
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          placeholder="Buscar por problema, cliente, técnico ou tag..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
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

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400 text-sm">
          Carregando...
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
          {total === 0 && !q && !status ? (
            <>Nenhum chamado ainda. <Link href="/tickets/new" className="text-blue-600 hover:underline">Criar o primeiro</Link></>
          ) : (
            "Nenhum resultado para o filtro."
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
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
              {tickets.map((t) => (
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
          <Pagination page={page} totalPages={totalPages} total={total} limit={LIMIT} onChange={setPage} />
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

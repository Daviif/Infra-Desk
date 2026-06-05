"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";

interface SearchResults {
  clients: { id: number; name: string; city: string | null; contact: string | null }[];
  tickets: { id: number; date: string; problem: string; solution: string | null; status: string; client_name: string | null }[];
  equipment: { id: number; type: string; brand: string | null; model: string | null; serial: string | null; client_name: string | null; client_id: number }[];
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults(null); return; }
    setLoading(true);
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setResults(data);
    setLoading(false);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    clearTimeout((window as any)._searchTimer);
    (window as any)._searchTimer = setTimeout(() => search(q), 300);
  }

  const total = results
    ? results.clients.length + results.tickets.length + results.equipment.length
    : 0;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Busca</h1>

      <input
        autoFocus
        type="text"
        value={query}
        onChange={handleChange}
        placeholder="Buscar por problema, solução, cliente, equipamento, tag..."
        className="w-full border border-gray-300 rounded-xl px-5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
      />
      <p className="text-xs text-gray-400 mt-1 ml-1">
        Ex: "Xerox", "WireGuard", "VPN", "MikroTik", "RIS"
      </p>

      {loading && <p className="text-gray-400 text-sm mt-6">Buscando...</p>}

      {results && !loading && (
        <div className="mt-6 space-y-6">
          {total === 0 ? (
            <p className="text-gray-400 text-center py-8">Nenhum resultado para "{query}".</p>
          ) : (
            <>
              {results.clients.length > 0 && (
                <section>
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    Clientes ({results.clients.length})
                  </h2>
                  <div className="space-y-2">
                    {results.clients.map((c) => (
                      <Link key={c.id} href={`/clients/${c.id}`}
                        className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-blue-300 transition-colors">
                        <div>
                          <span className="font-medium text-gray-800">{c.name}</span>
                          {c.city && <span className="text-gray-400 text-sm ml-2">· {c.city}</span>}
                        </div>
                        {c.contact && <span className="text-gray-400 text-sm">{c.contact}</span>}
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {results.equipment.length > 0 && (
                <section>
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    Equipamentos ({results.equipment.length})
                  </h2>
                  <div className="space-y-2">
                    {results.equipment.map((eq) => (
                      <Link key={eq.id} href={`/clients/${eq.client_id}`}
                        className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-blue-300 transition-colors">
                        <div>
                          <span className="font-medium text-gray-800">{eq.type}</span>
                          {eq.brand && <span className="text-gray-500 text-sm"> · {eq.brand}</span>}
                          {eq.model && <span className="text-gray-500 text-sm"> {eq.model}</span>}
                          {eq.serial && <span className="text-gray-400 text-xs ml-1">S/N: {eq.serial}</span>}
                        </div>
                        {eq.client_name && (
                          <span className="text-gray-400 text-sm">{eq.client_name}</span>
                        )}
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {results.tickets.length > 0 && (
                <section>
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    Chamados ({results.tickets.length})
                  </h2>
                  <div className="space-y-2">
                    {results.tickets.map((t) => (
                      <Link key={t.id} href={`/tickets/${t.id}`}
                        className="block bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-blue-300 transition-colors">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-400">
                            {t.date}{t.client_name && ` · ${t.client_name}`}
                          </span>
                          <StatusBadge status={t.status} />
                        </div>
                        <p className="text-sm font-medium text-gray-800 line-clamp-1">{t.problem}</p>
                        {t.solution && (
                          <p className="text-xs text-green-700 mt-0.5 line-clamp-1">✓ {t.solution}</p>
                        )}
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

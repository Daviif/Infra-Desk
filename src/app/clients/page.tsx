"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ClientRow {
  id: number;
  name: string;
  city: string | null;
  contact: string | null;
  ticket_count: number;
  equipment_count: number;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then(setClients);
  }, []);

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(filter.toLowerCase()) ||
      (c.city ?? "").toLowerCase().includes(filter.toLowerCase()) ||
      (c.contact ?? "").toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
        <Link
          href="/clients/new"
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Novo cliente
        </Link>
      </div>

      <input
        type="text"
        placeholder="Filtrar por nome, cidade ou contato..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
          {clients.length === 0 ? (
            <>
              Nenhum cliente cadastrado.{" "}
              <Link href="/clients/new" className="text-blue-600 hover:underline">
                Adicionar o primeiro
              </Link>
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
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Nome</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Cidade</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Contato</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">Chamados</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">Equipamentos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/clients/${c.id}`} className="text-blue-600 hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.city ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{c.contact ?? "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                      {c.ticket_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs font-medium">
                      {c.equipment_count}
                    </span>
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

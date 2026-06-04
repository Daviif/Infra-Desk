"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Equipment, EQUIPMENT_TYPES, EQUIPMENT_STATUS } from "@/types";
import StatusBadge from "@/components/StatusBadge";

export default function EquipmentPage() {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ type: "", status: "", client_id: "" });

  useEffect(() => {
    fetchEquipments();
  }, []);

  const fetchEquipments = async () => {
    try {
      const res = await fetch("/api/equipment");
      const data = await res.json();
      setEquipments(data);
    } catch (err) {
      console.error("Erro ao buscar equipamentos:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredEquipments = equipments.filter((eq) => {
    if (filter.type && eq.type !== filter.type) return false;
    if (filter.status && eq.status !== filter.status) return false;
    if (filter.client_id && eq.client_id !== parseInt(filter.client_id)) return false;
    return true;
  });

  return (
    <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Equipamentos</h1>
            <Link
              href="/equipment/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              + Novo Equipamento
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo
                </label>
                <select
                  value={filter.type}
                  onChange={(e) => setFilter({ ...filter, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Todos os tipos</option>
                  {EQUIPMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={filter.status}
                  onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Todos os status</option>
                  {Object.entries(EQUIPMENT_STATUS).map(([key, val]) => (
                    <option key={key} value={key}>
                      {val.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cliente
                </label>
                <input
                  type="text"
                  placeholder="ID do cliente"
                  value={filter.client_id}
                  onChange={(e) => setFilter({ ...filter, client_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Carregando equipamentos...</p>
            </div>
          ) : filteredEquipments.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <p className="text-gray-500">Nenhum equipamento encontrado</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Marca/Modelo
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      IP
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Responsável
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEquipments.map((eq) => (
                    <tr
                      key={eq.id}
                      className="border-b border-gray-200 hover:bg-gray-50 transition"
                    >
                      <td className="px-6 py-3 text-sm text-gray-900">{eq.id}</td>
                      <td className="px-6 py-3 text-sm text-gray-900">{eq.type}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {eq.brand && eq.model ? `${eq.brand} ${eq.model}` : eq.brand || "-"}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {eq.ip_address || "-"}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {eq.responsible || "-"}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {eq.client_name || "-"}
                      </td>
                      <td className="px-6 py-3">
                        <StatusBadge
                          status={eq.status as any}
                          colors={
                            eq.status === "ativo"
                              ? "bg-green-100 text-green-800"
                              : eq.status === "inativo"
                              ? "bg-gray-100 text-gray-800"
                              : "bg-yellow-100 text-yellow-800"
                          }
                        >
                          {EQUIPMENT_STATUS[eq.status as keyof typeof EQUIPMENT_STATUS]?.label ||
                            eq.status}
                        </StatusBadge>
                      </td>
                      <td className="px-6 py-3 text-sm">
                        <Link
                          href={`/equipment/${eq.id}`}
                          className="text-blue-600 hover:text-blue-900 underline"
                        >
                          Ver
                        </Link>
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

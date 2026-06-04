"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Client, Equipment } from "@/types";
import { generateTags } from "@/lib/tags";

function NewTicketForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultClientId = searchParams.get("client_id") ?? "";

  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    client_id: defaultClientId,
    equipment_id: "",
    date: today,
    problem: "",
    solution: "",
    status: "aberto",
    technician: "",
    tags: "",
  });
  const [clients, setClients] = useState<Client[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [autoTags, setAutoTags] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/clients").then((r) => r.json()).then(setClients);
  }, []);

  useEffect(() => {
    if (form.client_id) {
      fetch(`/api/equipment?client_id=${form.client_id}`)
        .then((r) => r.json())
        .then(setEquipments);
    } else {
      setEquipments([]);
      setForm((f) => ({ ...f, equipment_id: "" }));
    }
  }, [form.client_id]);

  useEffect(() => {
    const tags = generateTags(form.problem);
    setAutoTags(tags);
    setForm((f) => ({ ...f, tags: tags.join(", ") }));
  }, [form.problem]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        client_id: form.client_id || null,
        equipment_id: form.equipment_id || null,
      }),
    });
    if (res.ok) {
      const ticket = await res.json();
      router.push(`/tickets/${ticket.id}`);
    } else {
      const data = await res.json();
      setError(data.error ?? "Erro ao salvar");
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 mb-6 text-sm text-gray-500">
        <Link href="/tickets" className="hover:text-blue-600">Chamados</Link>
        <span>›</span>
        <span className="text-gray-900">Novo chamado</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Novo chamado</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Técnico</label>
            <input
              value={form.technician}
              onChange={(e) => setForm({ ...form, technician: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Seu nome"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
            <select
              value={form.client_id}
              onChange={(e) => setForm({ ...form, client_id: e.target.value, equipment_id: "" })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Sem cliente —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Equipamento</label>
            <select
              value={form.equipment_id}
              onChange={(e) => setForm({ ...form, equipment_id: e.target.value })}
              disabled={!form.client_id}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="">— Sem equipamento —</option>
              {equipments.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  #{eq.id} — {eq.type}{eq.brand ? ` ${eq.brand}` : ""}{eq.model ? ` ${eq.model}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Problema *</label>
          <textarea
            required
            rows={3}
            value={form.problem}
            onChange={(e) => setForm({ ...form, problem: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Descreva o problema relatado..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Solução aplicada</label>
          <textarea
            rows={3}
            value={form.solution}
            onChange={(e) => setForm({ ...form, solution: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="O que foi feito para resolver..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="aberto">Aberto</option>
            <option value="em_andamento">Em andamento</option>
            <option value="resolvido">Resolvido</option>
          </select>
        </div>

        {autoTags.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags <span className="text-xs text-gray-400 font-normal">(geradas automaticamente)</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {autoTags.map((tag) => (
                <span key={tag} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded border border-blue-200">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Salvando..." : "Salvar chamado"}
          </button>
          <Link href="/tickets"
            className="px-5 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50 transition-colors">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function NewTicketPage() {
  return (
    <Suspense fallback={<div className="text-gray-400 py-10 text-center">Carregando...</div>}>
      <NewTicketForm />
    </Suspense>
  );
}

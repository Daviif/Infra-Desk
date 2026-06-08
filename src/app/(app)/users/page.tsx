"use client";

import { useEffect, useState } from "react";
import { User } from "@/types";

const EMPTY_FORM = { name: "", username: "", password: "", role: "tecnico" as "admin" | "tecnico" };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((u) => setCurrentUserId(u.id));
    loadUsers();
  }, []);

  async function loadUsers() {
    const r = await fetch("/api/users");
    if (r.ok) setUsers(await r.json());
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError("");
    setShowForm(true);
  }

  function openEdit(u: User) {
    setEditing(u);
    setForm({ name: u.name, username: u.username, password: "", role: u.role });
    setError("");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const url = editing ? `/api/users/${editing.id}` : "/api/users";
    const method = editing ? "PUT" : "POST";
    const body = editing
      ? { name: form.name, username: form.username, role: form.role, active: true, ...(form.password ? { password: form.password } : {}) }
      : form;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Erro ao salvar");
      setSaving(false);
      return;
    }

    await loadUsers();
    setShowForm(false);
    setSaving(false);
  }

  async function handleDelete(u: User) {
    if (!confirm(`Excluir usuário "${u.name}"?`)) return;
    const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error);
      return;
    }
    await loadUsers();
  }

  async function toggleActive(u: User) {
    await fetch(`/api/users/${u.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: u.name, username: u.username, role: u.role, active: !u.active }),
    });
    await loadUsers();
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
        <button
          onClick={openCreate}
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Novo usuário
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">
            {editing ? "Editar usuário" : "Novo usuário"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="João Silva"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Login</label>
                <input
                  type="text"
                  required
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="joao.silva"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {editing ? "Nova senha (deixe em branco para manter)" : "Senha"}
                </label>
                <input
                  type="password"
                  required={!editing}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Perfil</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as "admin" | "tecnico" }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="tecnico">Técnico</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-sm px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {users.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">Nenhum usuário encontrado.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Nome</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Login</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Perfil</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {u.name}
                    {u.id === currentUserId && (
                      <span className="ml-2 text-xs text-blue-600 font-normal">(você)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.username}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        u.role === "admin"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {u.role === "admin" ? "Administrador" : "Técnico"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => u.id !== currentUserId && toggleActive(u)}
                      disabled={u.id === currentUserId}
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                        u.active
                          ? "bg-green-100 text-green-800 hover:bg-green-200"
                          : "bg-red-100 text-red-800 hover:bg-red-200"
                      } disabled:cursor-default disabled:opacity-60`}
                    >
                      {u.active ? "Ativo" : "Inativo"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => openEdit(u)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Editar
                    </button>
                    {u.id !== currentUserId && (
                      <button
                        onClick={() => handleDelete(u)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Excluir
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import { Ticket, Client, Equipment, TicketComment } from "@/types";
import { SessionUser } from "@/lib/auth";
import AuditLog from "@/components/AuditLog";
import { generateTags } from "@/lib/tags";

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    client_id: "",
    equipment_id: "",
    date: "",
    problem: "",
    solution: "",
    status: "aberto",
    technician: "",
    tags: "",
  });
  const [autoTags, setAutoTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);

  async function load() {
    const res = await fetch(`/api/tickets/${id}`);
    const data = await res.json();
    setTicket(data);
    setForm({
      client_id: data.client_id?.toString() ?? "",
      equipment_id: data.equipment_id?.toString() ?? "",
      date: data.date,
      problem: data.problem,
      solution: data.solution ?? "",
      status: data.status,
      technician: data.technician ?? "",
      tags: data.tags ?? "",
    });
    setAutoTags(data.tags ? data.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : []);
  }

  async function loadComments() {
    const res = await fetch(`/api/tickets/${id}/comments`);
    if (res.ok) setComments(await res.json());
  }

  useEffect(() => {
    load();
    loadComments();
    fetch("/api/clients").then((r) => r.json()).then(setClients);
    fetch("/api/auth/me").then((r) => r.ok ? r.json() : null).then(setCurrentUser);
  }, [id]);

  // Load equipment when client changes in edit mode
  useEffect(() => {
    if (form.client_id) {
      fetch(`/api/equipment?client_id=${form.client_id}`)
        .then((r) => r.json())
        .then(setEquipments);
    } else {
      setEquipments([]);
    }
  }, [form.client_id]);

  // Auto-generate tags as problem text changes in edit mode
  useEffect(() => {
    if (!editing) return;
    const tags = generateTags(form.problem);
    setAutoTags(tags);
    setForm((f) => ({ ...f, tags: tags.join(", ") }));
  }, [form.problem, editing]);

  async function saveTicket(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/tickets/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        client_id: form.client_id || null,
        equipment_id: form.equipment_id || null,
      }),
    });
    await load();
    setEditing(false);
    setSaving(false);
  }

  async function postComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentBody.trim()) return;
    setPostingComment(true);
    const res = await fetch(`/api/tickets/${id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: commentBody }),
    });
    if (res.ok) {
      setCommentBody("");
      await loadComments();
    }
    setPostingComment(false);
  }

  async function deleteComment(commentId: number) {
    if (!confirm("Excluir comentário?")) return;
    await fetch(`/api/tickets/${id}/comments/${commentId}`, { method: "DELETE" });
    await loadComments();
  }

  function formatRelativeTime(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "agora mesmo";
    if (min < 60) return `há ${min}min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `há ${h}h`;
    const d = Math.floor(h / 24);
    return `há ${d}d`;
  }

  async function deleteTicket() {
    if (!confirm("Excluir este chamado?")) return;
    await fetch(`/api/tickets/${id}`, { method: "DELETE" });
    router.push("/tickets");
  }

  if (!ticket) return <div className="text-gray-400 py-10 text-center">Carregando...</div>;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 mb-6 text-sm text-gray-500">
        <button onClick={() => router.back()} className="flex items-center gap-1 hover:text-gray-800">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Voltar
        </button>
        <span>·</span>
        <Link href="/tickets" className="hover:text-blue-600">Chamados</Link>
        <span>›</span>
        <span className="text-gray-900">#{ticket.id}</span>
      </div>

      {editing ? (
        <form onSubmit={saveTicket} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h1 className="text-xl font-bold text-gray-900">Editar chamado #{ticket.id}</h1>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
              <input type="date" required value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Técnico</label>
              <input value={form.technician} onChange={(e) => setForm({ ...form, technician: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
              <select value={form.client_id}
                onChange={(e) => setForm({ ...form, client_id: e.target.value, equipment_id: "" })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— Sem cliente —</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Equipamento</label>
              <select value={form.equipment_id}
                onChange={(e) => setForm({ ...form, equipment_id: e.target.value })}
                disabled={!form.client_id}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400">
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
            <textarea required rows={3} value={form.problem}
              onChange={(e) => setForm({ ...form, problem: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Solução</label>
            <textarea rows={3} value={form.solution}
              onChange={(e) => setForm({ ...form, solution: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
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

          {form.status === "resolvido" && (
            <p className="text-xs text-gray-400">
              O tempo gasto será calculado automaticamente ao salvar como Resolvido.
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
              {saving ? "Salvando..." : "Salvar"}
            </button>
            <button type="button" onClick={() => setEditing(false)}
              className="px-5 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50">
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-400">#{ticket.id}</span>
                <StatusBadge status={ticket.status} />
              </div>
              <p className="text-xs text-gray-500">
                {ticket.date}
                {ticket.client_name && (
                  <> · <Link href={`/clients/${ticket.client_id}`} className="text-blue-600 hover:underline">{ticket.client_name}</Link></>
                )}
                {ticket.technician && <> · {ticket.technician}</>}
                {ticket.time_spent && <> · ⏱ {ticket.time_spent}</>}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(true)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                Editar
              </button>
              <button onClick={deleteTicket}
                className="px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50">
                Excluir
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {ticket.equipment_label && (
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-gray-400 text-xs font-semibold uppercase tracking-wide">Equipamento</span>
                <span className="font-medium text-gray-800">{ticket.equipment_label}</span>
                {ticket.equipment_id && (
                  <Link href={`/equipment/${ticket.equipment_id}`} className="text-blue-600 hover:underline text-xs ml-auto">
                    Ver equipamento →
                  </Link>
                )}
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Problema</p>
              <p className="text-gray-800 whitespace-pre-wrap">{ticket.problem}</p>
            </div>

            {ticket.solution ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">Solução aplicada</p>
                <p className="text-gray-800 whitespace-pre-wrap">{ticket.solution}</p>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-400 italic">Solução não registrada ainda.</p>
                <button onClick={() => setEditing(true)}
                  className="text-xs text-blue-600 hover:underline mt-1">
                  Registrar solução
                </button>
              </div>
            )}

            {ticket.tags && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {ticket.tags.split(",").map((tag) => (
                    <span key={tag} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {ticket && <AuditLog entityType="ticket" entityId={ticket.id} />}

      {/* Comments section — always visible below the ticket card */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Comentários {comments.length > 0 && <span className="text-gray-400 font-normal normal-case">({comments.length})</span>}
        </h2>

        {comments.length > 0 && (
          <div className="space-y-3 mb-4">
            {comments.map((c) => {
              const isOwn = currentUser?.name === c.author;
              const canDelete = isOwn || currentUser?.role === "admin";
              return (
                <div key={c.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{c.author}</span>
                      {isOwn && (
                        <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">você</span>
                      )}
                      <span className="text-xs text-gray-400">{formatRelativeTime(c.created_at)}</span>
                    </div>
                    {canDelete && (
                      <button
                        onClick={() => deleteComment(c.id)}
                        className="text-xs text-gray-300 hover:text-red-500 transition-colors"
                        title="Excluir comentário"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.body}</p>
                </div>
              );
            })}
          </div>
        )}

        <form onSubmit={postComment} className="bg-white border border-gray-200 rounded-xl p-4">
          <textarea
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            placeholder="Adicionar comentário..."
            rows={3}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <div className="flex justify-end mt-2">
            <button
              type="submit"
              disabled={postingComment || !commentBody.trim()}
              className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              {postingComment ? "Enviando..." : "Comentar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

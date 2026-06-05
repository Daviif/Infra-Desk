"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCPF, formatCNPJ, validateCPF, validateCNPJ, stripDoc } from "@/lib/document";

type DocType = "" | "cpf" | "cnpj";

interface CnpjInfo {
  razao_social: string;
  municipio: string;
  uf: string;
  situacao_cadastral: string;
}

export default function NewClientPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    city: "",
    contact: "",
    notes: "",
    document_type: "" as DocType,
    document: "",
  });
  const [docError, setDocError] = useState("");
  const [cnpjInfo, setCnpjInfo] = useState<CnpjInfo | null>(null);
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function handleDocTypeChange(type: DocType) {
    setForm(prev => ({ ...prev, document_type: type, document: "" }));
    setDocError("");
    setCnpjInfo(null);
  }

  async function lookupCnpj(digits: string) {
    setLoadingCnpj(true);
    setDocError("");
    try {
      const res = await fetch(`/api/cnpj/${digits}`);
      if (res.ok) {
        const data: CnpjInfo = await res.json();
        setCnpjInfo(data);
        setForm(prev => ({
          ...prev,
          name: prev.name || data.razao_social,
          city: prev.city || data.municipio,
        }));
      } else {
        const err = await res.json();
        setDocError(err.error ?? "CNPJ não encontrado");
      }
    } catch {
      setDocError("Erro ao consultar CNPJ");
    } finally {
      setLoadingCnpj(false);
    }
  }

  function handleDocChange(v: string) {
    setDocError("");
    setCnpjInfo(null);
    if (form.document_type === "cpf") {
      const formatted = formatCPF(v);
      setForm(prev => ({ ...prev, document: formatted }));
    } else if (form.document_type === "cnpj") {
      const formatted = formatCNPJ(v);
      setForm(prev => ({ ...prev, document: formatted }));
      const digits = stripDoc(formatted);
      if (digits.length === 14 && validateCNPJ(formatted)) {
        lookupCnpj(digits);
      }
    }
  }

  function handleDocBlur() {
    if (!form.document) return;
    if (form.document_type === "cpf") {
      if (!validateCPF(form.document)) setDocError("CPF inválido");
    } else if (form.document_type === "cnpj") {
      if (!validateCNPJ(form.document)) {
        setDocError("CNPJ inválido");
      } else if (!cnpjInfo && !loadingCnpj) {
        lookupCnpj(stripDoc(form.document));
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.document_type === "cpf" && form.document && !validateCPF(form.document)) {
      setDocError("CPF inválido");
      return;
    }
    if (form.document_type === "cnpj" && form.document && !validateCNPJ(form.document)) {
      setDocError("CNPJ inválido");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        document_type: form.document_type || null,
        document: form.document || null,
      }),
    });
    if (res.ok) {
      const client = await res.json();
      router.push(`/clients/${client.id}`);
    } else {
      const data = await res.json();
      setError(data.error ?? "Erro ao salvar");
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-2 mb-6 text-sm text-gray-500">
        <Link href="/clients" className="hover:text-blue-600">Clientes</Link>
        <span>›</span>
        <span className="text-gray-900">Novo cliente</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Novo cliente</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome <span className="text-red-500">*</span>
          </label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: Clínica São Pedro"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Documento</label>
          <div className="flex gap-2 mb-2">
            {(["", "cpf", "cnpj"] as DocType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleDocTypeChange(t)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  form.document_type === t
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                }`}
              >
                {t === "" ? "Nenhum" : t.toUpperCase()}
              </button>
            ))}
          </div>
          {form.document_type !== "" && (
            <div className="relative">
              <input
                value={form.document}
                onChange={(e) => handleDocChange(e.target.value)}
                onBlur={handleDocBlur}
                placeholder={form.document_type === "cpf" ? "000.000.000-00" : "00.000.000/0000-00"}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  docError ? "border-red-400 focus:ring-red-400" : "border-gray-300"
                }`}
              />
              {loadingCnpj && (
                <span className="absolute right-3 top-2.5 text-xs text-gray-400">Consultando...</span>
              )}
            </div>
          )}
          {docError && <p className="text-red-600 text-xs mt-1">{docError}</p>}
          {cnpjInfo && (
            <div className="mt-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-800 space-y-0.5">
              <p className="font-semibold">{cnpjInfo.razao_social}</p>
              <p className="text-green-600">{cnpjInfo.situacao_cadastral} · {cnpjInfo.municipio}/{cnpjInfo.uf}</p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
          <input
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: Goiânia"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contato</label>
          <input
            value={form.contact}
            onChange={(e) => setForm({ ...form, contact: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Telefone, WhatsApp ou e-mail"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Informações adicionais sobre o cliente"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Salvando..." : "Salvar cliente"}
          </button>
          <Link
            href="/clients"
            className="px-5 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}

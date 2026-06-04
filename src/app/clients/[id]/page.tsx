"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import Toast from "@/components/Toast";
import { Client, Equipment, Ticket, EQUIPMENT_TYPES, EQUIPMENT_STATUS, EQUIPMENT_CONFIG_TYPES } from "@/types";
import { formatCPF, formatCNPJ, validateCPF, validateCNPJ, stripDoc } from "@/lib/document";

type DocType = "" | "cpf" | "cnpj";

interface Driver {
  name: string;
  version: string;
  url: string;
  notes: string;
  installed_date: string;
}

interface Config {
  type: string;
  key: string;
  value: string;
}

interface CnpjInfo {
  razao_social: string;
  municipio: string;
  uf: string;
  situacao_cadastral: string;
}

interface ClientDetail extends Client {
  equipment: Equipment[];
  tickets: Ticket[];
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [editing, setEditing] = useState(false);
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
  const [showEquipForm, setShowEquipForm] = useState(false);
  const [equip, setEquip] = useState({
    type: "", brand: "", model: "", serial: "", status: "ativo",
    ip_address: "", mac_address: "", user_account: "", responsible: "", location: "", notes: "",
  });
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [configs, setConfigs] = useState<Config[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error" = "success") => setToast({ message, type });

  async function load() {
    const res = await fetch(`/api/clients/${id}`);
    const data = await res.json();
    setClient(data);
    setForm({
      name: data.name,
      city: data.city ?? "",
      contact: data.contact ?? "",
      notes: data.notes ?? "",
      document_type: (data.document_type ?? "") as DocType,
      document: data.document ?? "",
    });
    setCnpjInfo(null);
    setDocError("");
  }

  useEffect(() => { load(); }, [id]);

  async function lookupCnpj(digits: string) {
    setLoadingCnpj(true);
    setDocError("");
    try {
      const res = await fetch(`/api/cnpj/${digits}`);
      if (res.ok) {
        const data: CnpjInfo = await res.json();
        setCnpjInfo(data);
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

  function handleDocTypeChange(type: DocType) {
    setForm(prev => ({ ...prev, document_type: type, document: "" }));
    setDocError("");
    setCnpjInfo(null);
  }

  function handleDocChange(v: string) {
    setDocError("");
    setCnpjInfo(null);
    if (form.document_type === "cpf") {
      setForm(prev => ({ ...prev, document: formatCPF(v) }));
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

  async function saveClient(e: React.FormEvent) {
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
    await fetch(`/api/clients/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        document_type: form.document_type || null,
        document: form.document || null,
      }),
    });
    await load();
    setEditing(false);
    setSaving(false);
  }

  async function deleteClient() {
    if (!confirm(`Excluir "${client?.name}"? Isso também removerá os equipamentos vinculados.`)) return;
    await fetch(`/api/clients/${id}`, { method: "DELETE" });
    router.push("/clients");
  }

  function addDriver() {
    setDrivers(prev => [...prev, { name: "", version: "", url: "", notes: "", installed_date: "" }]);
  }
  function removeDriver(i: number) {
    setDrivers(prev => prev.filter((_, idx) => idx !== i));
  }
  function updateDriver(i: number, field: string, value: string) {
    setDrivers(prev => prev.map((d, idx) => idx === i ? { ...d, [field]: value } : d));
  }
  function addConfig() {
    setConfigs(prev => [...prev, { type: equip.type, key: "", value: "" }]);
  }
  function removeConfig(i: number) {
    setConfigs(prev => prev.filter((_, idx) => idx !== i));
  }
  function updateConfig(i: number, field: string, value: string) {
    setConfigs(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
  }

  async function addEquipment(e: React.FormEvent) {
    e.preventDefault();
    if (!equip.type) { showToast("Tipo é obrigatório", "error"); return; }
    setSaving(true);
    await fetch("/api/equipment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...equip,
        client_id: id,
        configs: configs.filter(c => c.key && c.value),
        drivers: drivers.filter(d => d.name),
      }),
    });
    setEquip({ type: "", brand: "", model: "", serial: "", status: "ativo", ip_address: "", mac_address: "", user_account: "", responsible: "", location: "", notes: "" });
    setDrivers([]);
    setConfigs([]);
    setShowEquipForm(false);
    await load();
    setSaving(false);
  }

  async function deleteEquipment(eid: number) {
    if (!confirm("Remover equipamento?")) return;
    await fetch(`/api/equipment/${eid}`, { method: "DELETE" });
    await load();
  }

  async function exportEquipmentPDF() {
    if (!client || client.equipment.length === 0) return;

    const details = await Promise.all(
      client.equipment.map((eq) => fetch(`/api/equipment/${eq.id}`).then((r) => r.json()))
    );

    const configLabelMap: Record<string, Record<string, string>> = {};
    for (const [type, fields] of Object.entries(EQUIPMENT_CONFIG_TYPES)) {
      configLabelMap[type] = {};
      for (const f of fields as readonly { key: string; label: string }[]) {
        configLabelMap[type][f.key] = f.label;
      }
    }

    const statusLabel: Record<string, { label: string; color: string }> = {
      ativo: { label: "Ativo", color: "#2e7d32" },
      inativo: { label: "Inativo", color: "#555" },
      "manutenção": { label: "Manutenção", color: "#b45309" },
    };

    function row(label: string, value: string | null | undefined) {
      if (!value) return "";
      return `<tr><td class="lbl">${label}</td><td>${value}</td></tr>`;
    }

    const equipHTML = details.map((eq) => {
      const configs = (eq.configs ?? []) as { config_key: string; config_value: string; config_type: string }[];
      const drivers = (eq.drivers ?? []) as {
        driver_name: string; driver_version: string | null;
        driver_url: string | null; notes: string | null; installed_date: string | null;
      }[];

      const configRows = configs.map((c) => {
        const label = configLabelMap[eq.type]?.[c.config_key] ?? c.config_key;
        return row(label, c.config_value);
      }).join("");

      const driversHTML = drivers.map((d) => `
        <div class="driver">
          <span class="driver-name">${d.driver_name}${d.driver_version ? ` <span class="meta">v${d.driver_version}</span>` : ""}</span>
          ${d.installed_date ? `<span class="meta"> · ${d.installed_date}</span>` : ""}
          ${d.driver_url ? `<br/><span class="meta">${d.driver_url}</span>` : ""}
          ${d.notes ? `<br/><span class="meta">${d.notes}</span>` : ""}
        </div>`).join("");

      const st = statusLabel[eq.status] ?? { label: eq.status, color: "#555" };

      return `
        <div class="equip">
          <div class="equip-header">
            <span class="equip-id">#${eq.id}</span>
            <span class="equip-title">${eq.type}${eq.brand ? " " + eq.brand : ""}${eq.model ? " " + eq.model : ""}</span>
            <span class="badge" style="color:${st.color}">${st.label}</span>
          </div>
          <table class="info-table"><tbody>
            ${row("Serial / S.N.", eq.serial)}
            ${row("Endereço IP", eq.ip_address)}
            ${row("Endereço MAC", eq.mac_address)}
            ${row("Conta de usuário", eq.user_account)}
            ${row("Responsável", eq.responsible)}
            ${row("Localização", eq.location)}
            ${row("Acesso remoto", eq.remote_access)}
          </tbody></table>
          ${configRows ? `<p class="section-label">Configurações</p><table class="info-table"><tbody>${configRows}</tbody></table>` : ""}
          ${driversHTML ? `<p class="section-label">Drivers</p><div class="drivers">${driversHTML}</div>` : ""}
          ${eq.notes ? `<p class="notes">${eq.notes}</p>` : ""}
        </div>`;
    }).join("");

    // Quantitative summary
    const typeCounts: Record<string, number> = {};
    for (const eq of details) {
      typeCounts[eq.type] = (typeCounts[eq.type] ?? 0) + 1;
    }
    const summaryItems = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => `<div class="sum-item"><span class="sum-n">${count}</span><span class="sum-type">${type}</span></div>`)
      .join("");
    const summaryHTML = `
<div class="summary">
  <p class="section-label">Quantitativo</p>
  <div class="sum-grid">${summaryItems}<div class="sum-item sum-total"><span class="sum-n">${details.length}</span><span class="sum-type">Total</span></div></div>
</div>`;

    const pdfDate = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    const safeClientName = client.name.replace(/"/g, "'");
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>Equipamentos — ${client.name}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;font-size:11px;color:#1a1a1a;padding:28px 32px}
  header{border-bottom:2px solid #1d4ed8;padding-bottom:12px;margin-bottom:20px}
  header h1{font-size:20px;font-weight:700;color:#1d4ed8}
  header .sub{color:#555;font-size:11px;margin-top:3px}
  header .gen{color:#999;font-size:9px;margin-top:8px}
  .equip{border:1px solid #ddd;border-radius:6px;padding:14px 16px;margin-bottom:16px;page-break-inside:avoid}
  .equip-header{display:flex;align-items:baseline;gap:8px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #eee}
  .equip-id{color:#aaa;font-size:10px;font-family:monospace}
  .equip-title{font-weight:700;font-size:13px;flex:1}
  .badge{font-size:9px;font-weight:700;padding:2px 8px;border-radius:10px;background:#f3f4f6}
  .info-table{width:100%;border-collapse:collapse;margin-bottom:6px}
  .info-table td{padding:3px 6px;vertical-align:top;border-bottom:1px solid #f0f0f0}
  .info-table tr:last-child td{border-bottom:none}
  .info-table td.lbl{color:#555;font-weight:600;width:140px;white-space:nowrap}
  .section-label{font-size:9px;font-weight:700;text-transform:uppercase;color:#888;letter-spacing:.05em;margin:10px 0 4px}
  .drivers{display:flex;flex-direction:column;gap:4px}
  .driver{background:#f8f8f8;border-radius:4px;padding:5px 8px;line-height:1.5}
  .driver-name{font-weight:600}
  .meta{color:#777}
  .notes{margin-top:10px;color:#444;font-style:italic;border-top:1px solid #eee;padding-top:8px;line-height:1.5}
  .summary{background:#f8faff;border:1px solid #dbeafe;border-radius:6px;padding:12px 16px;margin-bottom:20px}
  .sum-grid{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
  .sum-item{background:#fff;border:1px solid #e5e7eb;border-radius:6px;padding:8px 14px;display:flex;flex-direction:column;align-items:center;min-width:72px}
  .sum-n{font-size:20px;font-weight:700;color:#1d4ed8;line-height:1}
  .sum-type{font-size:9px;color:#555;margin-top:2px;text-align:center}
  .sum-total{border-color:#1d4ed8;background:#eff6ff}
  .sum-total .sum-n{color:#1d4ed8}
  .sum-total .sum-type{color:#1d4ed8;font-weight:700}
  @page{
    size:A4;
    margin:12mm 14mm 18mm 14mm;
    @top-left{content:none}
    @top-center{content:none}
    @top-right{content:none}
    @bottom-left{content:"${safeClientName}";font-size:8pt;color:#999;font-family:Arial,sans-serif}
    @bottom-center{content:none}
    @bottom-right{content:"Página " counter(page) " de " counter(pages) "  ·  ${pdfDate}";font-size:8pt;color:#999;font-family:Arial,sans-serif}
  }
  @media print{body{padding:0}}
</style>
</head>
<body>
<header>
  <h1>${client.name}</h1>
  <div class="sub">
    ${client.document_type && client.document ? `${client.document_type.toUpperCase()} ${client.document} &nbsp;·&nbsp; ` : ""}
    ${client.city ? `${client.city}` : ""}
    ${client.contact ? ` &nbsp;·&nbsp; ${client.contact}` : ""}
  </div>
  <div class="gen">Relatório de equipamentos · Gerado em ${pdfDate}</div>
</header>
${summaryHTML}
${equipHTML}
</body>
</html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  }

  if (!client) return <div className="text-gray-400 py-10 text-center">Carregando...</div>;

  return (
    <div className="max-w-4xl space-y-6">
      <Toast message={toast?.message ?? null} type={toast?.type} onDismiss={() => setToast(null)} />
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button onClick={() => router.back()} className="flex items-center gap-1 hover:text-gray-800">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Voltar
        </button>
        <span>·</span>
        <Link href="/clients" className="hover:text-blue-600">Clientes</Link>
        <span>›</span>
        <span className="text-gray-900">{client.name}</span>
      </div>

      {/* Client card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {editing ? (
          <form onSubmit={saveClient} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contato</label>
                <input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            {/* Document */}
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

            <div className="flex gap-3">
              <button type="submit" disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                {saving ? "Salvando..." : "Salvar"}
              </button>
              <button type="button" onClick={() => { setEditing(false); setDocError(""); setCnpjInfo(null); }}
                className="px-4 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50">
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
              {client.document && client.document_type && (
                <p className="text-gray-500 text-sm">
                  <span className="font-medium text-gray-700 uppercase text-xs">{client.document_type}</span>
                  {" "}{client.document}
                </p>
              )}
              {client.city && <p className="text-gray-500 text-sm">📍 {client.city}</p>}
              {client.contact && <p className="text-gray-500 text-sm">📞 {client.contact}</p>}
              {client.notes && <p className="text-gray-600 text-sm mt-2 italic">{client.notes}</p>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(true)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                Editar
              </button>
              <button onClick={deleteClient}
                className="px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50">
                Excluir
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Equipment */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-800">Equipamentos</h2>
          <div className="flex items-center gap-4">
            {client.equipment.length > 0 && (
              <button onClick={exportEquipmentPDF}
                className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="12" y1="18" x2="12" y2="12"/>
                  <line x1="9" y1="15" x2="15" y2="15"/>
                </svg>
                Exportar PDF
              </button>
            )}
            <button onClick={() => setShowEquipForm(!showEquipForm)}
              className="text-sm text-blue-600 hover:underline">
              {showEquipForm ? "Cancelar" : "+ Adicionar"}
            </button>
          </div>
        </div>

        {showEquipForm && (
          <form onSubmit={addEquipment} className="border border-gray-200 rounded-lg p-5 mb-4 space-y-5 bg-gray-50">
            {/* Informações básicas */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Informações básicas</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tipo *</label>
                  <select value={equip.type} onChange={(e) => setEquip({ ...equip, type: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Selecione</option>
                    {EQUIPMENT_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select value={equip.status} onChange={(e) => setEquip({ ...equip, status: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {Object.entries(EQUIPMENT_STATUS).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Marca</label>
                  <input value={equip.brand} onChange={(e) => setEquip({ ...equip, brand: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Dell, HP" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Modelo</label>
                  <input value={equip.model} onChange={(e) => setEquip({ ...equip, model: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: ThinkPad E15" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Serial</label>
                  <input value={equip.serial} onChange={(e) => setEquip({ ...equip, serial: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Número de série" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Localização</label>
                  <input value={equip.location} onChange={(e) => setEquip({ ...equip, location: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Sala, Prédio..." />
                </div>
              </div>
            </div>

            {/* Rede e acesso */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Rede e acesso</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">IP</label>
                  <input value={equip.ip_address} onChange={(e) => setEquip({ ...equip, ip_address: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="192.168.1.100" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">MAC</label>
                  <input value={equip.mac_address} onChange={(e) => setEquip({ ...equip, mac_address: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="00:1A:2B:3C:4D:5E" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Conta de usuário</label>
                  <input value={equip.user_account} onChange={(e) => setEquip({ ...equip, user_account: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="admin / username" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Responsável</label>
                  <input value={equip.responsible} onChange={(e) => setEquip({ ...equip, responsible: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nome do responsável" />
                </div>
              </div>
            </div>

            {/* Configurações específicas do tipo */}
            {equip.type && EQUIPMENT_CONFIG_TYPES[equip.type.toLowerCase() as keyof typeof EQUIPMENT_CONFIG_TYPES] && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Configurações</p>
                  <button type="button" onClick={addConfig}
                    className="text-xs text-blue-600 hover:underline">+ Adicionar</button>
                </div>
                {configs.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Clique em "+ Adicionar" para incluir configurações.</p>
                ) : (
                  <div className="space-y-2">
                    {configs.map((config, i) => {
                      const fields = EQUIPMENT_CONFIG_TYPES[equip.type.toLowerCase() as keyof typeof EQUIPMENT_CONFIG_TYPES] || [];
                      return (
                        <div key={i} className="flex gap-2">
                          <select value={config.key} onChange={(e) => updateConfig(i, "key", e.target.value)}
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm">
                            <option value="">Campo</option>
                            {(fields as readonly { key: string; label: string }[]).map((f) => (
                              <option key={f.key} value={f.key}>{f.label}</option>
                            ))}
                          </select>
                          <input value={config.value} onChange={(e) => updateConfig(i, "value", e.target.value)}
                            placeholder="Valor"
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                          <button type="button" onClick={() => removeConfig(i)}
                            className="px-2 text-gray-400 hover:text-red-500">✕</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Drivers */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Drivers</p>
                <button type="button" onClick={addDriver}
                  className="text-xs text-blue-600 hover:underline">+ Adicionar</button>
              </div>
              {drivers.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Nenhum driver adicionado.</p>
              ) : (
                <div className="space-y-3">
                  {drivers.map((driver, i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Nome *</label>
                          <input value={driver.name} onChange={(e) => updateDriver(i, "name", e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                            placeholder="Ex: Xerox Print Driver" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Versão</label>
                          <input value={driver.version} onChange={(e) => updateDriver(i, "version", e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                            placeholder="Ex: 6.2.1" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">URL</label>
                          <input value={driver.url} onChange={(e) => updateDriver(i, "url", e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                            placeholder="https://..." />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Data de instalação</label>
                          <input type="date" value={driver.installed_date} onChange={(e) => updateDriver(i, "installed_date", e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Notas</label>
                        <input value={driver.notes} onChange={(e) => updateDriver(i, "notes", e.target.value)}
                          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                          placeholder="Informações adicionais" />
                      </div>
                      <button type="button" onClick={() => removeDriver(i)}
                        className="text-xs text-red-500 hover:underline">Remover driver</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notas */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notas gerais</label>
              <textarea value={equip.notes} onChange={(e) => setEquip({ ...equip, notes: e.target.value })}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Observações adicionais sobre o equipamento..." />
            </div>

            <button type="submit" disabled={saving}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
              {saving ? "Salvando..." : "Adicionar equipamento"}
            </button>
          </form>
        )}

        {client.equipment.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">Nenhum equipamento cadastrado.</p>
        ) : (
          <div className="space-y-2">
            {client.equipment.map((eq) => (
              <div key={eq.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{eq.type}</span>
                    {eq.brand && <span className="text-gray-500 text-sm">{eq.brand}</span>}
                    {eq.model && <span className="text-gray-500 text-sm">{eq.model}</span>}
                    {eq.serial && <span className="text-gray-400 text-xs">S/N: {eq.serial}</span>}
                    {eq.status && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        EQUIPMENT_STATUS[eq.status as keyof typeof EQUIPMENT_STATUS]?.color ?? "bg-gray-100 text-gray-600"
                      }`}>
                        {EQUIPMENT_STATUS[eq.status as keyof typeof EQUIPMENT_STATUS]?.label ?? eq.status}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-3 mt-0.5 flex-wrap">
                    {eq.ip_address && <span className="text-gray-400 text-xs">IP: {eq.ip_address}</span>}
                    {eq.responsible && <span className="text-gray-400 text-xs">Resp: {eq.responsible}</span>}
                    {eq.location && <span className="text-gray-400 text-xs">{eq.location}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4 shrink-0">
                  <Link href={`/equipment/${eq.id}`} className="text-blue-600 hover:underline text-xs">Ver</Link>
                  <button onClick={() => deleteEquipment(eq.id)}
                    className="text-gray-400 hover:text-red-500 text-xs">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ticket history */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-800">Histórico de chamados</h2>
          <Link href={`/tickets/new?client_id=${id}`}
            className="text-sm text-blue-600 hover:underline">
            + Novo chamado
          </Link>
        </div>

        {client.tickets.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">Nenhum chamado registrado.</p>
        ) : (
          <div className="space-y-3">
            {client.tickets.map((t) => (
              <Link key={t.id} href={`/tickets/${t.id}`}
                className="block border border-gray-100 rounded-lg px-4 py-3 hover:border-blue-300 hover:bg-blue-50/30 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">{t.date}</span>
                  <StatusBadge status={t.status} />
                </div>
                <p className="text-sm font-medium text-gray-800">{t.problem}</p>
                {t.solution && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">✓ {t.solution}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

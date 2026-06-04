"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Equipment, EquipmentDriver, EquipmentConfig, EQUIPMENT_TYPES, EQUIPMENT_STATUS, EQUIPMENT_CONFIG_TYPES } from "@/types";
import StatusBadge from "@/components/StatusBadge";
import Toast from "@/components/Toast";

export default function EquipmentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [configs, setConfigs] = useState<EquipmentConfig[]>([]);
  const [drivers, setDrivers] = useState<EquipmentDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    type: "",
    brand: "",
    model: "",
    serial: "",
    ip_address: "",
    mac_address: "",
    user_account: "",
    responsible: "",
    status: "ativo" as const,
    location: "",
    remote_access: "",
    remote_access_password: "",
    notes: "",
  });

  const [newDriver, setNewDriver] = useState({ name: "", version: "", url: "", notes: "", installed_date: "" });
  const [showNewDriver, setShowNewDriver] = useState(false);
  const [newConfig, setNewConfig] = useState({ config_type: "", config_key: "", config_value: "" });
  const [showNewConfig, setShowNewConfig] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error" = "success") => setToast({ message, type });

  useEffect(() => {
    fetchEquipment();
  }, [id]);

  const fetchEquipment = async () => {
    try {
      const res = await fetch(`/api/equipment/${id}`);
      if (!res.ok) throw new Error("Equipamento não encontrado");
      const data = await res.json();
      setEquipment(data);
      setConfigs(data.configs || []);
      setDrivers(data.drivers || []);
      setFormData({
        type: data.type || "",
        brand: data.brand || "",
        model: data.model || "",
        serial: data.serial || "",
        ip_address: data.ip_address || "",
        mac_address: data.mac_address || "",
        user_account: data.user_account || "",
        responsible: data.responsible || "",
        status: data.status || "ativo",
        location: data.location || "",
        remote_access: data.remote_access || "",
        remote_access_password: data.remote_access_password || "",
        notes: data.notes || "",
      });
    } catch (err) {
      console.error("Erro ao buscar equipamento:", err);
      router.push("/equipment");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddDriver = async () => {
    if (!newDriver.name) {
      showToast("Nome do driver é obrigatório", "error");
      return;
    }

    try {
      const updatedDrivers = [
        ...drivers,
        {
          id: 0,
          equipment_id: parseInt(id),
          ...newDriver,
          driver_name: newDriver.name,
          driver_version: newDriver.version || null,
          driver_url: newDriver.url || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      await fetch(`/api/equipment/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          configs,
          drivers: updatedDrivers.map((d) => ({
            id: d.id || undefined,
            name: d.driver_name,
            version: d.driver_version,
            url: d.driver_url,
            notes: d.notes,
            installed_date: d.installed_date,
          })),
        }),
      });

      setDrivers(updatedDrivers);
      setNewDriver({ name: "", version: "", url: "", notes: "", installed_date: "" });
      showToast("Driver adicionado com sucesso!");
    } catch (err) {
      console.error("Erro:", err);
      showToast("Erro ao adicionar driver", "error");
    }
  };

  const handleDeleteDriver = async (driverId: number) => {
    if (!confirm("Tem certeza que deseja remover este driver?")) return;

    try {
      const updatedDrivers = drivers.filter((d) => d.id !== driverId);
      await fetch(`/api/equipment/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          configs,
          drivers: updatedDrivers.map((d) => ({
            id: d.id,
            name: d.driver_name,
            version: d.driver_version,
            url: d.driver_url,
            notes: d.notes,
            installed_date: d.installed_date,
          })),
        }),
      });

      setDrivers(updatedDrivers);
      showToast("Driver removido com sucesso!");
    } catch (err) {
      console.error("Erro:", err);
      showToast("Erro ao remover driver", "error");
    }
  };

  const handleAddConfig = async () => {
    if (!newConfig.config_key || !newConfig.config_value) {
      showToast("Preencha todos os campos da configuração", "error");
      return;
    }

    try {
      const updatedConfigs = [
        ...configs,
        {
          id: 0,
          equipment_id: parseInt(id),
          ...newConfig,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      await fetch(`/api/equipment/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          configs: updatedConfigs.map((c) => ({
            type: c.config_type,
            key: c.config_key,
            value: c.config_value,
          })),
          drivers: drivers.map((d) => ({
            id: d.id,
            name: d.driver_name,
            version: d.driver_version,
            url: d.driver_url,
            notes: d.notes,
            installed_date: d.installed_date,
          })),
        }),
      });

      setConfigs(updatedConfigs);
      setNewConfig({ config_type: "", config_key: "", config_value: "" });
      showToast("Configuração adicionada com sucesso!");
    } catch (err) {
      console.error("Erro:", err);
      showToast("Erro ao adicionar configuração", "error");
    }
  };

  const handleDeleteConfig = async (configId: number) => {
    if (!confirm("Tem certeza que deseja remover esta configuração?")) return;

    try {
      const updatedConfigs = configs.filter((c) => c.id !== configId);
      await fetch(`/api/equipment/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          configs: updatedConfigs.map((c) => ({
            type: c.config_type,
            key: c.config_key,
            value: c.config_value,
          })),
          drivers: drivers.map((d) => ({
            id: d.id,
            name: d.driver_name,
            version: d.driver_version,
            url: d.driver_url,
            notes: d.notes,
            installed_date: d.installed_date,
          })),
        }),
      });

      setConfigs(updatedConfigs);
      showToast("Configuração removida com sucesso!");
    } catch (err) {
      console.error("Erro:", err);
      showToast("Erro ao remover configuração", "error");
    }
  };

  const handleSave = async () => {
    setSubmitting(true);

    try {
      await fetch(`/api/equipment/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          configs: configs.map((c) => ({
            type: c.config_type,
            key: c.config_key,
            value: c.config_value,
          })),
          drivers: drivers.map((d) => ({
            id: d.id,
            name: d.driver_name,
            version: d.driver_version,
            url: d.driver_url,
            notes: d.notes,
            installed_date: d.installed_date,
          })),
        }),
      });

      setEditing(false);
      showToast("Equipamento atualizado com sucesso!");
      fetchEquipment();
    } catch (err) {
      console.error("Erro:", err);
      showToast("Erro ao atualizar equipamento", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja deletar este equipamento? Esta ação é irreversível!"))
      return;

    try {
      await fetch(`/api/equipment/${id}`, { method: "DELETE" });
      router.push("/equipment");
    } catch (err) {
      console.error("Erro:", err);
      showToast("Erro ao deletar equipamento", "error");
    }
  };

  if (loading) {
    return <p className="text-gray-500 p-8">Carregando...</p>;
  }

  if (!equipment) {
    return <p className="text-gray-500 p-8">Equipamento não encontrado</p>;
  }

  const availableConfigFields =
    EQUIPMENT_CONFIG_TYPES[formData.type as keyof typeof EQUIPMENT_CONFIG_TYPES] || [];

  return (
    <div className="flex-1 overflow-auto">
      <Toast message={toast?.message ?? null} type={toast?.type} onDismiss={() => setToast(null)} />
      <div className="p-8 max-w-5xl mx-auto">
        {editing ? (
          /* ── Modo edição ── */
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-800">Equipamentos</h2>
              <button
                onClick={() => { setEditing(false); setShowNewDriver(false); setShowNewConfig(false); fetchEquipment(); }}
                className="text-sm text-blue-600 hover:underline"
              >
                Cancelar
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* INFORMAÇÕES BÁSICAS */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Informações básicas</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tipo *</label>
                    <select name="type" value={formData.type} onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Selecione</option>
                      {EQUIPMENT_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                    <select name="status" value={formData.status} onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {Object.entries(EQUIPMENT_STATUS).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Marca</label>
                    <input type="text" name="brand" value={formData.brand} onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: Dell, HP" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Modelo</label>
                    <input type="text" name="model" value={formData.model} onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: ThinkPad E15" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Serial</label>
                    <input type="text" name="serial" value={formData.serial} onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Número de série" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Localização</label>
                    <input type="text" name="location" value={formData.location} onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Sala, Prédio..." />
                  </div>
                </div>
              </div>

              {/* REDE E ACESSO */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Rede e acesso</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">IP</label>
                    <input type="text" name="ip_address" value={formData.ip_address} onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="192.168.1.100" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">MAC</label>
                    <input type="text" name="mac_address" value={formData.mac_address} onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="00:1A:2B:3C:4D:5E" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Conta de usuário</label>
                    <input type="text" name="user_account" value={formData.user_account} onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="admin / username" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Responsável</label>
                    <input type="text" name="responsible" value={formData.responsible} onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nome do responsável" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Acesso Remoto</label>
                    <input type="text" name="remote_access" value={formData.remote_access} onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: TeamViewer 123456789 | WinBox 10.0.0.1" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Senha Não Supervisionada</label>
                    <input type="password" name="remote_access_password" value={formData.remote_access_password} onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Senha de acesso não supervisionado"
                      autoComplete="new-password" />
                  </div>
                </div>
              </div>

              {/* CONFIGURAÇÕES */}
              {availableConfigFields.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Configurações</p>
                    <button type="button" onClick={() => { setNewConfig({ config_type: formData.type, config_key: "", config_value: "" }); setShowNewConfig(true); }}
                      className="text-xs text-blue-600 hover:underline">+ Adicionar</button>
                  </div>
                  {configs.length === 0 && !showNewConfig && (
                    <p className="text-xs text-gray-400 italic">Clique em "+ Adicionar" para incluir configurações.</p>
                  )}
                  <div className="space-y-2">
                    {configs.map(config => (
                      <div key={config.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                        <span className="text-sm text-gray-700">
                          <span className="font-medium">
                            {availableConfigFields.find(f => f.key === config.config_key)?.label || config.config_key}:
                          </span>{" "}{config.config_value}
                        </span>
                        <button type="button" onClick={() => handleDeleteConfig(config.id)}
                          className="text-gray-400 hover:text-red-500 text-xs ml-4">✕</button>
                      </div>
                    ))}
                    {showNewConfig && (
                      <div className="flex gap-2">
                        <select value={newConfig.config_key}
                          onChange={e => setNewConfig({ ...newConfig, config_key: e.target.value })}
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm">
                          <option value="">Campo</option>
                          {(availableConfigFields as readonly { key: string; label: string }[]).map(f => (
                            <option key={f.key} value={f.key}>{f.label}</option>
                          ))}
                        </select>
                        <input value={newConfig.config_value}
                          onChange={e => setNewConfig({ ...newConfig, config_value: e.target.value })}
                          placeholder="Valor"
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                        <button type="button" onClick={() => { handleAddConfig(); setShowNewConfig(false); }}
                          className="px-2 text-blue-600 text-sm">✓</button>
                        <button type="button" onClick={() => setShowNewConfig(false)}
                          className="px-2 text-gray-400 hover:text-red-500 text-xs">✕</button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* DRIVERS */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Drivers</p>
                  <button type="button" onClick={() => setShowNewDriver(true)}
                    className="text-xs text-blue-600 hover:underline">+ Adicionar</button>
                </div>
                {drivers.length === 0 && !showNewDriver && (
                  <p className="text-xs text-gray-400 italic">Nenhum driver adicionado.</p>
                )}
                <div className="space-y-2">
                  {drivers.map(driver => (
                    <div key={driver.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                      <div>
                        <span className="text-sm font-medium text-gray-800">{driver.driver_name}</span>
                        {driver.driver_version && <span className="text-xs text-gray-500 ml-2">v{driver.driver_version}</span>}
                        {driver.driver_url && (
                          <p className="text-xs text-blue-600">
                            <a href={driver.driver_url} target="_blank" rel="noopener noreferrer">{driver.driver_url}</a>
                          </p>
                        )}
                        {driver.installed_date && (
                          <p className="text-xs text-gray-500">
                            Instalado em: {new Date(driver.installed_date).toLocaleDateString("pt-BR")}
                          </p>
                        )}
                        {driver.notes && <p className="text-xs text-gray-500">{driver.notes}</p>}
                      </div>
                      <button type="button" onClick={() => handleDeleteDriver(driver.id)}
                        className="text-gray-400 hover:text-red-500 text-xs ml-4">✕</button>
                    </div>
                  ))}
                  {showNewDriver && (
                    <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Nome *</label>
                          <input value={newDriver.name} onChange={e => setNewDriver({ ...newDriver, name: e.target.value })}
                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                            placeholder="Ex: Xerox Print Driver" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Versão</label>
                          <input value={newDriver.version} onChange={e => setNewDriver({ ...newDriver, version: e.target.value })}
                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                            placeholder="Ex: 6.2.1" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">URL</label>
                          <input value={newDriver.url} onChange={e => setNewDriver({ ...newDriver, url: e.target.value })}
                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                            placeholder="https://..." />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Data de instalação</label>
                          <input type="date" value={newDriver.installed_date}
                            onChange={e => setNewDriver({ ...newDriver, installed_date: e.target.value })}
                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Notas</label>
                        <input value={newDriver.notes} onChange={e => setNewDriver({ ...newDriver, notes: e.target.value })}
                          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                          placeholder="Informações adicionais" />
                      </div>
                      <div className="flex gap-3">
                        <button type="button" onClick={() => { handleAddDriver(); setShowNewDriver(false); }}
                          className="text-xs text-blue-600 hover:underline">Salvar driver</button>
                        <button type="button" onClick={() => setShowNewDriver(false)}
                          className="text-xs text-red-500 hover:underline">Cancelar</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* NOTAS GERAIS */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notas gerais</label>
                <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Observações adicionais sobre o equipamento..." />
              </div>

              <button type="button" onClick={handleSave} disabled={submitting}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                {submitting ? "Salvando..." : "Salvar equipamento"}
              </button>
            </div>
          </div>
        ) : (
          /* ── Modo visualização ── */
          <>
            <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              Voltar
            </button>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900">{equipment.type} #{equipment.id}</h1>
              <div className="flex gap-3">
                <button onClick={() => setEditing(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Editar</button>
                <button onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Deletar</button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-gray-600 text-sm font-medium">Status:</span>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  EQUIPMENT_STATUS[equipment.status as keyof typeof EQUIPMENT_STATUS]?.color ?? "bg-gray-100 text-gray-600"
                }`}>
                  {EQUIPMENT_STATUS[equipment.status as keyof typeof EQUIPMENT_STATUS]?.label ?? equipment.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <span className="text-gray-500 text-sm">Tipo</span>
                  <p className="font-medium text-gray-900">{equipment.type}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-sm">Marca/Modelo</span>
                  <p className="font-medium text-gray-900">
                    {equipment.brand && equipment.model ? `${equipment.brand} ${equipment.model}` : equipment.brand || "-"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 text-sm">Serial</span>
                  <p className="font-medium text-gray-900">{equipment.serial || "-"}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-sm">IP</span>
                  <p className="font-medium text-gray-900">{equipment.ip_address || "-"}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-sm">MAC Address</span>
                  <p className="font-medium text-gray-900">{equipment.mac_address || "-"}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-sm">Conta de Usuário</span>
                  <p className="font-medium text-gray-900">{equipment.user_account || "-"}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-sm">Responsável</span>
                  <p className="font-medium text-gray-900">{equipment.responsible || "-"}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-sm">Localização</span>
                  <p className="font-medium text-gray-900">{equipment.location || "-"}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-sm">Acesso Remoto</span>
                  <p className="font-medium text-gray-900">{equipment.remote_access || "-"}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-sm">Senha Não Supervisionada</span>
                  {equipment.remote_access_password ? (
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 font-mono">
                        {showPassword ? equipment.remote_access_password : "••••••••"}
                      </p>
                      <button
                        onClick={() => setShowPassword(v => !v)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        {showPassword ? "Ocultar" : "Mostrar"}
                      </button>
                    </div>
                  ) : (
                    <p className="font-medium text-gray-900">-</p>
                  )}
                </div>
                <div>
                  <span className="text-gray-500 text-sm">Cliente</span>
                  <p className="font-medium text-gray-900">{equipment.client_name || "-"}</p>
                </div>
                {equipment.notes && (
                  <div className="col-span-2">
                    <span className="text-gray-500 text-sm">Notas</span>
                    <p className="font-medium text-gray-900">{equipment.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {availableConfigFields.length > 0 && configs.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-base font-semibold text-gray-800 mb-4">Configurações</h2>
                <div className="space-y-2">
                  {configs.map(config => (
                    <div key={config.id} className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2">
                      <span className="text-sm text-gray-700">
                        <span className="font-medium">
                          {availableConfigFields.find(f => f.key === config.config_key)?.label || config.config_key}:
                        </span>{" "}{config.config_value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-base font-semibold text-gray-800 mb-4">Drivers</h2>
              {drivers.length === 0 ? (
                <p className="text-gray-400 text-sm">Nenhum driver cadastrado.</p>
              ) : (
                <div className="space-y-3">
                  {drivers.map(driver => (
                    <div key={driver.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <p className="font-medium text-gray-900">{driver.driver_name}</p>
                      {driver.driver_version && <p className="text-sm text-gray-600">Versão: {driver.driver_version}</p>}
                      {driver.driver_url && (
                        <p className="text-sm text-blue-600">
                          <a href={driver.driver_url} target="_blank" rel="noopener noreferrer">{driver.driver_url}</a>
                        </p>
                      )}
                      {driver.installed_date && (
                        <p className="text-sm text-gray-600">
                          Instalado em: {new Date(driver.installed_date).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                      {driver.notes && <p className="text-sm text-gray-600 mt-1">{driver.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

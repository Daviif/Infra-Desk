"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Client, EQUIPMENT_TYPES, EQUIPMENT_CONFIG_TYPES } from "@/types";
import Toast from "@/components/Toast";

interface Driver {
  name: string;
  version?: string;
  url?: string;
  notes?: string;
  installed_date?: string;
}

interface Config {
  type: string;
  key: string;
  value: string;
}

export default function NewEquipmentPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedType, setSelectedType] = useState("");
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [configs, setConfigs] = useState<Config[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error" = "success") => setToast({ message, type });

  const [formData, setFormData] = useState({
    client_id: "",
    type: "",
    brand: "",
    model: "",
    serial: "",
    ip_address: "",
    mac_address: "",
    user_account: "",
    responsible: "",
    status: "ativo",
    location: "",
    remote_access: "",
    remote_access_password: "",
    notes: "",
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/clients");
      const data = await res.json();
      setClients(data);
    } catch (err) {
      console.error("Erro ao buscar clientes:", err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "type") {
      setSelectedType(value);
    }
  };

  const addDriver = () => {
    setDrivers([...drivers, { name: "" }]);
  };

  const removeDriver = (index: number) => {
    setDrivers(drivers.filter((_, i) => i !== index));
  };

  const updateDriver = (index: number, field: string, value: string) => {
    const newDrivers = [...drivers];
    newDrivers[index] = { ...newDrivers[index], [field]: value };
    setDrivers(newDrivers);
  };

  const addConfig = () => {
    setConfigs([...configs, { type: selectedType, key: "", value: "" }]);
  };

  const removeConfig = (index: number) => {
    setConfigs(configs.filter((_, i) => i !== index));
  };

  const updateConfig = (index: number, field: string, value: string) => {
    const newConfigs = [...configs];
    newConfigs[index] = { ...newConfigs[index], [field]: value };
    setConfigs(newConfigs);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.client_id || !formData.type) {
      showToast("Cliente e Tipo são obrigatórios", "error");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        client_id: parseInt(formData.client_id),
        configs: configs.filter((c) => c.key && c.value),
        drivers: drivers.filter((d) => d.name),
      };

      const res = await fetch("/api/equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Erro ao criar equipamento");
      }

      router.push("/equipment");
    } catch (err) {
      console.error("Erro:", err);
      showToast("Erro ao criar equipamento", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const availableConfigFields =
    EQUIPMENT_CONFIG_TYPES[selectedType as keyof typeof EQUIPMENT_CONFIG_TYPES] || [];

  return (
    <div className="flex-1 overflow-auto">
        <Toast message={toast?.message ?? null} type={toast?.type} onDismiss={() => setToast(null)} />
        <div className="p-8 max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Novo Equipamento</h1>

          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-8">
            {/* Informações Básicas */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Informações Básicas</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cliente *
                  </label>
                  <select
                    name="client_id"
                    value={formData.client_id}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione um cliente</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo *
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione um tipo</option>
                    {EQUIPMENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                  <input
                    type="text"
                    name="brand"
                    value={formData.brand}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Dell, HP, Lenovo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
                  <input
                    type="text"
                    name="model"
                    value={formData.model}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: ThinkPad E15"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Serial
                  </label>
                  <input
                    type="text"
                    name="serial"
                    value={formData.serial}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Número de série"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                    <option value="manutenção">Manutenção</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Informações de Rede e Acesso */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Informações de Rede e Acesso
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Endereço IP
                  </label>
                  <input
                    type="text"
                    name="ip_address"
                    value={formData.ip_address}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="192.168.1.100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Endereço MAC
                  </label>
                  <input
                    type="text"
                    name="mac_address"
                    value={formData.mac_address}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="00:1A:2B:3C:4D:5E"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Conta de Usuário
                  </label>
                  <input
                    type="text"
                    name="user_account"
                    value={formData.user_account}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="username / admin"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Responsável
                  </label>
                  <input
                    type="text"
                    name="responsible"
                    value={formData.responsible}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nome do responsável"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Localização
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Sala, Prédio, etc"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Acesso Remoto
                  </label>
                  <input
                    type="text"
                    name="remote_access"
                    value={formData.remote_access}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: TeamViewer 123456789 | WinBox 10.0.0.1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Senha Não Supervisionada
                  </label>
                  <input
                    type="password"
                    name="remote_access_password"
                    value={formData.remote_access_password}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Senha de acesso não supervisionado"
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </section>

            {/* Configurações Específicas */}
            {availableConfigFields.length > 0 && (
              <section>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Configurações</h2>
                  <button
                    type="button"
                    onClick={addConfig}
                    className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                  >
                    + Adicionar
                  </button>
                </div>

                <div className="space-y-3">
                  {configs.map((config, index) => (
                    <div key={index} className="flex gap-2">
                      <select
                        value={config.key}
                        onChange={(e) => updateConfig(index, "key", e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="">Selecione campo</option>
                        {availableConfigFields.map((field) => (
                          <option key={field.key} value={field.key}>
                            {field.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={config.value}
                        onChange={(e) => updateConfig(index, "value", e.target.value)}
                        placeholder="Valor"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeConfig(index)}
                        className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Drivers */}
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Drivers</h2>
                <button
                  type="button"
                  onClick={addDriver}
                  className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                >
                  + Adicionar Driver
                </button>
              </div>

              <div className="space-y-4">
                {drivers.map((driver, index) => (
                  <div key={index} className="border border-gray-300 rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nome do Driver
                        </label>
                        <input
                          type="text"
                          value={driver.name}
                          onChange={(e) => updateDriver(index, "name", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="Ex: NVIDIA GeForce Driver"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Versão
                        </label>
                        <input
                          type="text"
                          value={driver.version || ""}
                          onChange={(e) => updateDriver(index, "version", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="Ex: 535.104.05"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          URL
                        </label>
                        <input
                          type="text"
                          value={driver.url || ""}
                          onChange={(e) => updateDriver(index, "url", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="https://..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Data de Instalação
                        </label>
                        <input
                          type="date"
                          value={driver.installed_date || ""}
                          onChange={(e) => updateDriver(index, "installed_date", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notas
                      </label>
                      <input
                        type="text"
                        value={driver.notes || ""}
                        onChange={(e) => updateDriver(index, "notes", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="Informações adicionais"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDriver(index)}
                      className="w-full px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Remover Driver
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* Notas */}
            <section>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notas</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Notas adicionais sobre o equipamento"
              />
            </section>

            {/* Botões */}
            <div className="flex gap-4 justify-end pt-6 border-t">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {submitting ? "Criando..." : "Criar Equipamento"}
              </button>
            </div>
          </form>
        </div>
    </div>
  );
}
